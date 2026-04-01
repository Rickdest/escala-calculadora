import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  SHOPEE_HOST,
  PARTNER_ID,
  corsHeaders,
  generateSign,
  shopeeGet,
  errorResponse,
  jsonResponse,
} from "../_shared/shopee.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse("Unauthorized", 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return errorResponse("Unauthorized", 401);
    }

    const { data: tokens } = await supabase
      .from("shopee_tokens")
      .select("*")
      .eq("user_id", user.id)
      .limit(1);

    if (!tokens || tokens.length === 0) {
      return errorResponse("No Shopee token found. Connect your shop first.");
    }

    const shopeeToken = tokens[0];
    const shopId = shopeeToken.shop_id;
    let currentAccessToken = shopeeToken.access_token;

    // Refresh token if near expiry
    const tokenAge =
      (Date.now() - new Date(shopeeToken.token_created_at).getTime()) / 1000;

    if (tokenAge > shopeeToken.expire_in - 300) {
      console.log("[SHOPEE SYNC] Token near expiry, refreshing...");
      const refreshPath = "/api/v2/auth/access_token/get";
      const timestamp = Math.floor(Date.now() / 1000);
      const sign = await generateSign(refreshPath, timestamp);

      const refreshUrl = `${SHOPEE_HOST}${refreshPath}?partner_id=${PARTNER_ID}&timestamp=${timestamp}&sign=${sign}`;

      const refreshRes = await fetch(refreshUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refresh_token: shopeeToken.refresh_token,
          shop_id: Number(shopId),
          partner_id: PARTNER_ID,
        }),
      });

      const refreshData = await refreshRes.json();
      console.log("[SHOPEE SYNC] Refresh response:", JSON.stringify(refreshData));

      if (refreshData.access_token) {
        currentAccessToken = refreshData.access_token;

        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        await supabaseAdmin
          .from("shopee_tokens")
          .update({
            access_token: refreshData.access_token,
            refresh_token: refreshData.refresh_token,
            expire_in: refreshData.expire_in || 0,
            token_created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", shopeeToken.id);
      }
    }

    const results: Record<string, unknown> = {};
    const errors: Record<string, string> = {};

    // 1. Shop Info
    console.log("[SHOPEE SYNC] Fetching shop info...");
    try {
      const shopInfo = await shopeeGet(
        "/api/v2/shop/get_shop_info",
        currentAccessToken,
        shopId
      );
      console.log("[SHOPEE SYNC] Shop info FULL response:", JSON.stringify(shopInfo));
      results.shop_info = shopInfo;
    } catch (e) {
      console.error("[SHOPEE SYNC] Shop info error:", e);
      errors.shop_info = (e as Error).message;
    }

    // 2. Product list (first 50)
    console.log("[SHOPEE SYNC] Fetching product list...");
    try {
      const productList = await shopeeGet(
        "/api/v2/product/get_item_list",
        currentAccessToken,
        shopId,
        { offset: "0", page_size: "50", item_status: "NORMAL" }
      );
      console.log("[SHOPEE SYNC] Product list response:", JSON.stringify(productList).substring(0, 500));
      results.product_list = productList;

      // 3. Get details for first 20 products if available
      const items = productList?.response?.item || [];
      if (items.length > 0) {
        const itemIds = items.slice(0, 20).map((i: any) => i.item_id);
        console.log(`[SHOPEE SYNC] Fetching details for ${itemIds.length} products...`);
        const productDetails = await shopeeGet(
          "/api/v2/product/get_item_base_info",
          currentAccessToken,
          shopId,
          {
            item_id_list: itemIds.join(","),
            need_tax_info: "true",
            response_optional_fields: "price_info,stock_info_v2,sale_info,item_status",
          }
        );
        // Log first product FULL structure for debugging
        const detailItems = productDetails?.response?.item_list || [];
        if (detailItems.length > 0) {
          console.log("[SHOPEE SYNC] FIRST PRODUCT FULL STRUCTURE:", JSON.stringify(detailItems[0]));
        }
        console.log("[SHOPEE SYNC] Product details count:", detailItems.length);
        results.product_details = productDetails;
      }
    } catch (e) {
      console.error("[SHOPEE SYNC] Product list error:", e);
      errors.product_list = (e as Error).message;
    }

    // 4. Orders (last 15 days) — no order_status param (Shopee doesn't accept "ALL")
    console.log("[SHOPEE SYNC] Fetching orders...");
    try {
      const now = Math.floor(Date.now() / 1000);
      const fifteenDaysAgo = now - 15 * 24 * 60 * 60;
      const orderList = await shopeeGet(
        "/api/v2/order/get_order_list",
        currentAccessToken,
        shopId,
        {
          time_range_field: "create_time",
          time_from: String(fifteenDaysAgo),
          time_to: String(now),
          page_size: "50",
        }
      );
      console.log("[SHOPEE SYNC] Order list FULL response:", JSON.stringify(orderList));
      results.order_list = orderList;

      // Get order details for first 20
      const orders = orderList?.response?.order_list || [];
      if (orders.length > 0) {
        const orderSns = orders.slice(0, 20).map((o: any) => o.order_sn);
        console.log(`[SHOPEE SYNC] Fetching details for ${orderSns.length} orders...`);
        const orderDetails = await shopeeGet(
          "/api/v2/order/get_order_detail",
          currentAccessToken,
          shopId,
          {
            order_sn_list: orderSns.join(","),
            response_optional_fields: "item_list,buyer_user_id,pay_time,total_amount",
          }
        );
        console.log("[SHOPEE SYNC] Order details response:", JSON.stringify(orderDetails).substring(0, 1000));
        results.order_details = orderDetails;
      }
    } catch (e) {
      console.error("[SHOPEE SYNC] Orders error:", e);
      errors.orders = (e as Error).message;
    }

    // Marketing/Ads endpoints removed — not available for this app

    console.log("[SHOPEE SYNC] === SYNC COMPLETE ===");
    console.log(`[SHOPEE SYNC] Endpoints OK: ${Object.keys(results).length}, Errors: ${Object.keys(errors).length}`);

    return jsonResponse({
      success: true,
      shop_id: shopId,
      results,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
      message: "Sync completed.",
    });
  } catch (e) {
    console.error("[SHOPEE SYNC] Fatal error:", e);
    return errorResponse((e as Error).message, 500);
  }
});

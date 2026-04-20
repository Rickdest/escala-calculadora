import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders,
  errorResponse,
  jsonResponse,
  shopeeGet,
} from "../_shared/shopee.ts";
import { refreshShopeeTokenIfNeeded } from "../_shared/shopee-token.ts";

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

async function refreshTokenIfNeeded(shopeeToken: any) {
  const { token } = await refreshShopeeTokenIfNeeded(shopeeToken, "seller");
  return token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    console.log("[SELLER DISCOVERY] === START ===");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return errorResponse("Unauthorized", 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return errorResponse("Unauthorized", 401);
    const userId = claimsData.claims.sub as string;

    // Check admin role
    const { data: isAdmin } = await supabase.rpc('has_role', { _role: 'admin' });
    if (!isAdmin) return errorResponse("Admin only", 403);

    // Get seller token
    const { data: tokens } = await supabase.from("shopee_tokens").select("*").eq("user_id", userId).eq("app_type" as any, "seller").limit(1);
    if (!tokens || tokens.length === 0) return errorResponse("No seller token found. Connect your shop first.");

    const shopeeToken = tokens[0];
    const accessToken = await refreshTokenIfNeeded(shopeeToken);
    const shopId = shopeeToken.shop_id;

    const results: Record<string, any> = {};

    // Read optional item_id from body
    let itemId: number | null = null;
    try {
      const body = await req.json().catch(() => ({}));
      if (body?.item_id) itemId = Number(body.item_id);
    } catch { /* ignore */ }

    // Step 1: order/get_order_list (7 days, page_size=1)
    console.log("[SELLER DISCOVERY] Step 1: order/get_order_list");
    let orderSn: string | null = null;
    try {
      const now = Math.floor(Date.now() / 1000);
      const sevenDaysAgo = now - 7 * 24 * 60 * 60;
      const res = await shopeeGet("/api/v2/order/get_order_list", accessToken, shopId, {
        time_range_field: "create_time",
        time_from: String(sevenDaysAgo),
        time_to: String(now),
        page_size: "1",
        cursor: "",
        order_status: "COMPLETED",
      });
      results.order_list = JSON.parse(JSON.stringify(res)).response ? { response: res.response } : res;
      console.log(`[SELLER DISCOVERY] order_list: ${JSON.stringify(res).substring(0, 1000)}`);
      const orders = res?.response?.order_list || [];
      if (orders.length > 0) {
        orderSn = orders[0].order_sn;
        console.log(`[SELLER DISCOVERY] Found order_sn: ${orderSn}`);
      } else {
        console.log("[SELLER DISCOVERY] Sem pedidos recentes (7 dias). Pulando steps que dependem de order_sn.");
      }
    } catch (e) {
      results.order_list = { error: String(e) };
      console.error("[SELLER DISCOVERY] Step 1 error:", e);
    }

    await delay(1000);

    // Step 2: order/get_order_detail (if order_sn found)
    if (orderSn) {
      console.log("[SELLER DISCOVERY] Step 2: order/get_order_detail");
      try {
        const res = await shopeeGet("/api/v2/order/get_order_detail", accessToken, shopId, {
          order_sn_list: orderSn,
          response_optional_fields: "item_list,buyer_user_id,pay_time,total_amount",
        });
        results.order_detail = JSON.parse(JSON.stringify(res)).response ? { response: res.response } : res;
        console.log(`[SELLER DISCOVERY] order_detail: ${JSON.stringify(res).substring(0, 1000)}`);
      } catch (e) {
        results.order_detail = { error: String(e) };
        console.error("[SELLER DISCOVERY] Step 2 error:", e);
      }

      await delay(1000);

      // Step 3: finance/get_escrow_detail (if order_sn found)
      console.log("[SELLER DISCOVERY] Step 3: finance/get_escrow_detail");
      try {
        const res = await shopeeGet("/api/v2/payment/get_escrow_detail", accessToken, shopId, {
          order_sn: orderSn,
        });
        results.escrow_detail = JSON.parse(JSON.stringify(res)).response ? { response: res.response } : res;
        console.log(`[SELLER DISCOVERY] escrow_detail: ${JSON.stringify(res).substring(0, 1000)}`);
      } catch (e) {
        results.escrow_detail = { error: String(e) };
        console.error("[SELLER DISCOVERY] Step 3 error:", e);
      }
    } else {
      results.order_detail = { skipped: "No recent orders" };
      results.escrow_detail = { skipped: "No recent orders" };
    }

    await delay(1000);

    // Step 4: product/get_item_extra_info (with item_id)
    console.log("[SELLER DISCOVERY] Step 4: product/get_item_extra_info");
    try {
      // If no item_id provided, try to get one from products table
      let testItemId = itemId;
      if (!testItemId) {
        const { data: products } = await supabase
          .from("products")
          .select("shopee_item_id")
          .eq("user_id", userId)
          .not("shopee_item_id", "is", null)
          .limit(1);
        if (products && products.length > 0 && products[0].shopee_item_id) {
          testItemId = products[0].shopee_item_id;
        }
      }
      if (testItemId) {
        const res = await shopeeGet("/api/v2/product/get_item_extra_info", accessToken, shopId, {
          item_id_list: String(testItemId),
        });
        results.item_extra_info = JSON.parse(JSON.stringify(res)).response ? { response: res.response } : res;
        console.log(`[SELLER DISCOVERY] item_extra_info: ${JSON.stringify(res).substring(0, 1000)}`);
      } else {
        results.item_extra_info = { skipped: "No item_id available" };
      }
    } catch (e) {
      results.item_extra_info = { error: String(e) };
      console.error("[SELLER DISCOVERY] Step 4 error:", e);
    }

    await delay(1000);

    // Step 5: shop/get_shop_performance (deprecated but try)
    console.log("[SELLER DISCOVERY] Step 5: shop/get_shop_performance");
    try {
      const res = await shopeeGet("/api/v2/account_health/shop_performance", accessToken, shopId);
      results.shop_performance = JSON.parse(JSON.stringify(res)).response ? { response: res.response } : res;
      console.log(`[SELLER DISCOVERY] shop_performance: ${JSON.stringify(res).substring(0, 1000)}`);
    } catch (e) {
      results.shop_performance = { error: String(e) };
      console.error("[SELLER DISCOVERY] Step 5 error:", e);
    }

    await delay(1000);

    // Step 6: shop/get_shop_penalty (account_health)
    console.log("[SELLER DISCOVERY] Step 6: account_health/shop_penalty");
    try {
      const res = await shopeeGet("/api/v2/account_health/get_shop_penalty", accessToken, shopId);
      results.shop_penalty = JSON.parse(JSON.stringify(res)).response ? { response: res.response } : res;
      console.log(`[SELLER DISCOVERY] shop_penalty: ${JSON.stringify(res).substring(0, 1000)}`);
    } catch (e) {
      results.shop_penalty = { error: String(e) };
      console.error("[SELLER DISCOVERY] Step 6 error:", e);
    }

    await delay(1000);

    // Step 7: product/get_comment
    console.log("[SELLER DISCOVERY] Step 7: product/get_comment");
    try {
      let testItemId = itemId;
      if (!testItemId) {
        const { data: products } = await supabase
          .from("products")
          .select("shopee_item_id")
          .eq("user_id", userId)
          .not("shopee_item_id", "is", null)
          .limit(1);
        if (products && products.length > 0 && products[0].shopee_item_id) {
          testItemId = products[0].shopee_item_id;
        }
      }
      if (testItemId) {
        const res = await shopeeGet("/api/v2/product/get_comment", accessToken, shopId, {
          item_id: String(testItemId),
          comment_type: "0",
          cursor: "0",
          page_size: "5",
        });
        results.product_comment = JSON.parse(JSON.stringify(res)).response ? { response: res.response } : res;
        console.log(`[SELLER DISCOVERY] product_comment: ${JSON.stringify(res).substring(0, 1000)}`);
      } else {
        results.product_comment = { skipped: "No item_id available" };
      }
    } catch (e) {
      results.product_comment = { error: String(e) };
      console.error("[SELLER DISCOVERY] Step 7 error:", e);
    }

    console.log("[SELLER DISCOVERY] === DONE ===");
    return jsonResponse({ success: true, discovery_results: results });
  } catch (e) {
    console.error("[SELLER DISCOVERY] Fatal error:", e);
    return errorResponse((e as Error).message, 500);
  }
});

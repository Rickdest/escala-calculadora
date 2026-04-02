import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  SHOPEE_HOST,
  PARTNER_ID,
  corsHeaders,
  generateSign,
  shopeeGet,
  shopeePost,
  errorResponse,
  jsonResponse,
} from "../_shared/shopee.ts";

async function refreshTokenIfNeeded(shopeeToken: any, supabase: any) {
  const tokenAge =
    (Date.now() - new Date(shopeeToken.token_created_at).getTime()) / 1000;

  if (tokenAge <= shopeeToken.expire_in - 300) {
    return shopeeToken.access_token;
  }

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
      shop_id: Number(shopeeToken.shop_id),
      partner_id: PARTNER_ID,
    }),
  });

  const refreshData = await refreshRes.json();
  if (refreshData.access_token) {
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
    return refreshData.access_token;
  }
  return shopeeToken.access_token;
}

async function fetchProductsWithModels(
  accessToken: string,
  shopId: string | number
) {
  const productList = await shopeeGet(
    "/api/v2/product/get_item_list",
    accessToken,
    shopId,
    { offset: "0", page_size: "50", item_status: "NORMAL" }
  );

  const items = productList?.response?.item || [];
  let productDetails: any = null;
  const modelsMap: Record<string, any> = {};

  if (items.length > 0) {
    const itemIds = items.slice(0, 20).map((i: any) => i.item_id);
    productDetails = await shopeeGet(
      "/api/v2/product/get_item_base_info",
      accessToken,
      shopId,
      {
        item_id_list: itemIds.join(","),
        need_tax_info: "true",
        response_optional_fields:
          "price_info,stock_info_v2,sale_info,item_status",
      }
    );

    const detailItems = productDetails?.response?.item_list || [];
    const itemsWithModels = detailItems.filter((p: any) => p.has_model);
    console.log(
      `[SHOPEE SYNC] Products with models: ${itemsWithModels.length}`
    );

    for (const product of itemsWithModels.slice(0, 20)) {
      try {
        const modelData = await shopeeGet(
          "/api/v2/product/get_model_list",
          accessToken,
          shopId,
          { item_id: String(product.item_id) }
        );
        const models = modelData?.response?.model || [];
        if (models.length > 0) {
          modelsMap[product.item_id] = models;
        }
      } catch (e) {
        console.error(
          `[SHOPEE SYNC] get_model_list error for ${product.item_id}:`,
          e
        );
      }
    }
  }

  return { productList, productDetails, modelsMap };
}

async function fetchOrdersWithAggregation(
  accessToken: string,
  shopId: string | number
) {
  const now = Math.floor(Date.now() / 1000);
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60;

  const fetchOrderWindow = async (timeRangeField: "create_time" | "update_time") => {
    const allOrders: any[] = [];
    const windows: Array<{ from: number; to: number }> = [];

    let windowStart = ninetyDaysAgo;
    while (windowStart < now) {
      const windowEnd = Math.min(windowStart + 15 * 24 * 60 * 60 - 1, now);
      windows.push({ from: windowStart, to: windowEnd });
      windowStart = windowEnd + 1;
    }

    for (let i = 0; i < windows.length; i++) {
      const window = windows[i];
      let cursor = "";
      let hasMore = true;
      let pageCount = 0;

      while (hasMore && pageCount < 10) {
        const params: Record<string, string> = {
          time_range_field: timeRangeField,
          time_from: String(window.from),
          time_to: String(window.to),
          page_size: "50",
        };
        if (cursor) params.cursor = cursor;

        const orderList = await shopeeGet(
          "/api/v2/order/get_order_list",
          accessToken,
          shopId,
          params
        );

        const orders = orderList?.response?.order_list || [];
        allOrders.push(...orders);
        hasMore = orderList?.response?.more === true;
        cursor = orderList?.response?.next_cursor || "";
        pageCount++;

        console.log(
          `[SHOPEE SYNC] Orders ${timeRangeField} window ${i + 1}/${windows.length} page ${pageCount}: ${orders.length} orders, more=${hasMore}`
        );
      }
    }

    return Array.from(
      new Map(allOrders.map((order: any) => [order.order_sn, order])).values()
    );
  };

  let allOrders = await fetchOrderWindow("create_time");

  if (allOrders.length === 0) {
    console.log("[SHOPEE SYNC] No orders found with create_time, retrying with update_time...");
    allOrders = await fetchOrderWindow("update_time");
  }

  console.log(`[SHOPEE SYNC] Total unique orders fetched: ${allOrders.length}`);

  let allDetails: any[] = [];
  for (let i = 0; i < allOrders.length; i += 50) {
    const batch = allOrders.slice(i, i + 50).map((o: any) => o.order_sn);
    try {
      const orderDetails = await shopeeGet(
        "/api/v2/order/get_order_detail",
        accessToken,
        shopId,
        {
          order_sn_list: batch.join(","),
          response_optional_fields:
            "item_list,buyer_user_id,pay_time,total_amount,order_status",
        }
      );
      const details = orderDetails?.response?.order_list || [];
      allDetails = allDetails.concat(details);
    } catch (e) {
      console.error(`[SHOPEE SYNC] Order detail batch error:`, e);
    }
  }

  const productSales: Record<
    string,
    {
      name: string;
      total_qty: number;
      total_revenue: number;
      variants: Record<string, { qty: number; revenue: number }>;
    }
  > = {};

  const statusCounts: Record<string, number> = {};
  let totalRevenue = 0;

  for (const order of allDetails) {
    const status = order.order_status || "UNKNOWN";
    statusCounts[status] = (statusCounts[status] || 0) + 1;
    totalRevenue += Number(order.total_amount || 0);

    const items = order.item_list || [];
    for (const item of items) {
      const itemId = String(item.item_id);
      if (!productSales[itemId]) {
        productSales[itemId] = {
          name: item.item_name || `Item ${itemId}`,
          total_qty: 0,
          total_revenue: 0,
          variants: {},
        };
      }
      const qty = item.model_quantity_purchased || 1;
      const price = Number(item.model_discounted_price || 0);
      const rev = qty * price;

      productSales[itemId].total_qty += qty;
      productSales[itemId].total_revenue += rev;

      const variantName = item.model_name || "Único";
      if (!productSales[itemId].variants[variantName]) {
        productSales[itemId].variants[variantName] = { qty: 0, revenue: 0 };
      }
      productSales[itemId].variants[variantName].qty += qty;
      productSales[itemId].variants[variantName].revenue += rev;
    }
  }

  const summary = {
    total_orders: allOrders.length,
    total_revenue: totalRevenue,
    avg_ticket: allOrders.length > 0 ? totalRevenue / allOrders.length : 0,
    status_counts: statusCounts,
    period_days: 90,
  };

  return {
    order_list: { response: { order_list: allOrders, total_count: allOrders.length } },
    order_details: { response: { order_list: allDetails } },
    order_performance: { product_sales: productSales, summary },
  };
}

const toDateStr = (ts: number) => {
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

async function fetchAdsData(
  accessToken: string,
  shopId: string | number
) {
  const adsResults: Record<string, any> = {};

  // 1. Get campaign ID list
  try {
    console.log("[SHOPEE SYNC] === Step 1: get_product_level_campaign_id_list ===");
    const campaignList = await shopeeGet(
      "/api/v2/ads/get_product_level_campaign_id_list",
      accessToken,
      shopId
    );
    console.log(`[SHOPEE SYNC] campaign_id_list RESPONSE: ${JSON.stringify(campaignList).substring(0, 3000)}`);
    adsResults.campaign_list = campaignList;

    const campaignIds: number[] = campaignList?.response?.campaign_id_list || campaignList?.response?.data?.campaign_id_list || [];
    console.log(`[SHOPEE SYNC] Found ${campaignIds.length} campaign IDs`);

    // 2. Get campaign settings/details (batches of 20)
    if (campaignIds.length > 0) {
      console.log("[SHOPEE SYNC] === Step 2: get_product_level_campaign_setting_info ===");
      const allDetails: any[] = [];
      for (let i = 0; i < campaignIds.length; i += 20) {
        const batch = campaignIds.slice(i, i + 20);
        try {
          const details = await shopeeGet(
            "/api/v2/ads/get_product_level_campaign_setting_info",
            accessToken,
            shopId,
            { campaign_id_list: batch.join(",") }
          );
          console.log(`[SHOPEE SYNC] campaign_setting_info batch ${Math.floor(i / 20) + 1} RESPONSE: ${JSON.stringify(details).substring(0, 3000)}`);
          const items = details?.response?.data || details?.response?.campaign_list || [];
          allDetails.push(...(Array.isArray(items) ? items : []));
        } catch (e) {
          console.error(`[SHOPEE SYNC] campaign_setting_info batch error:`, e);
        }
      }
      adsResults.campaign_details = allDetails;
    }
  } catch (e) {
    console.error("[SHOPEE SYNC] get_product_level_campaign_id_list error:", e);
    adsResults.campaign_list_error = (e as Error).message;
  }

  // 3. Get daily performance (last 30 days)
  try {
    const now = Math.floor(Date.now() / 1000);
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60;
    const startDate = toDateStr(thirtyDaysAgo);
    const endDate = toDateStr(now);

    console.log(`[SHOPEE SYNC] === Step 3: get_all_cpc_ads_daily_performance ${startDate} → ${endDate} ===`);
    const performance = await shopeeGet(
      "/api/v2/ads/get_all_cpc_ads_daily_performance",
      accessToken,
      shopId,
      { start_date: startDate, end_date: endDate }
    );
    console.log(`[SHOPEE SYNC] daily_performance RESPONSE: ${JSON.stringify(performance).substring(0, 3000)}`);
    adsResults.daily_performance = performance;
    adsResults.period_start = startDate;
    adsResults.period_end = endDate;
  } catch (e) {
    console.error("[SHOPEE SYNC] get_all_cpc_ads_daily_performance error:", e);
    adsResults.daily_performance_error = (e as Error).message;
  }

  return adsResults;
}

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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return errorResponse("Unauthorized", 401);
    }
    const user = { id: claimsData.claims.sub as string };

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
    const currentAccessToken = await refreshTokenIfNeeded(shopeeToken, supabase);

    const results: Record<string, unknown> = {};
    const errors: Record<string, string> = {};

    // 1. Shop Info
    try {
      results.shop_info = await shopeeGet(
        "/api/v2/shop/get_shop_info",
        currentAccessToken,
        shopId
      );
    } catch (e) {
      errors.shop_info = (e as Error).message;
    }

    // 2. Products + Models
    try {
      const { productList, productDetails, modelsMap } =
        await fetchProductsWithModels(currentAccessToken, shopId);
      results.product_list = productList;
      results.product_details = productDetails;
      results.product_models = modelsMap;
    } catch (e) {
      errors.product_list = (e as Error).message;
    }

    // 3. Orders (90 days) + Performance aggregation
    try {
      const { order_list, order_details, order_performance } =
        await fetchOrdersWithAggregation(currentAccessToken, shopId);
      results.order_list = order_list;
      results.order_details = order_details;
      results.order_performance = order_performance;
    } catch (e) {
      errors.orders = (e as Error).message;
    }

    // 4. Ads (campaigns + performance)
    try {
      const adsData = await fetchAdsData(currentAccessToken, shopId);
      results.ads_campaigns = adsData.campaign_list;
      results.ads_campaign_details = adsData.campaign_details;
      results.ads_performance = adsData.daily_performance;
      results.ads_period = { start: adsData.period_start, end: adsData.period_end };
      if (adsData.campaign_list_error) errors.ads_campaigns = adsData.campaign_list_error;
      if (adsData.daily_performance_error) errors.ads_performance = adsData.daily_performance_error;
    } catch (e) {
      errors.ads = (e as Error).message;
    }

    console.log("[SHOPEE SYNC] === SYNC COMPLETE ===");
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

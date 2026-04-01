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

  // Paginate order list (max ~200 orders)
  let allOrders: any[] = [];
  let cursor = "";
  let hasMore = true;
  let pageCount = 0;

  while (hasMore && pageCount < 4) {
    const params: Record<string, string> = {
      time_range_field: "create_time",
      time_from: String(ninetyDaysAgo),
      time_to: String(now),
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
    allOrders = allOrders.concat(orders);
    hasMore = orderList?.response?.more === true;
    cursor = orderList?.response?.next_cursor || "";
    pageCount++;
    console.log(
      `[SHOPEE SYNC] Orders page ${pageCount}: ${orders.length} orders, more=${hasMore}`
    );
  }

  console.log(`[SHOPEE SYNC] Total orders fetched: ${allOrders.length}`);

  // Fetch order details in batches of 50
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

  // Aggregate product sales
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const toDateStr = (ts: number) => {
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

async function fetchAdsChunkWithRetry(
  accessToken: string,
  shopId: string | number,
  startDate: string,
  endDate: string,
  maxRetries = 3
): Promise<{ data: any; rateLimited: boolean }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await shopeePost(
        "/api/v2/ads/get_all_cpc_ads_daily_performance",
        accessToken,
        shopId,
        { start_date: startDate, end_date: endDate }
      );
      const err = result?.error || result?.msg || "";
      if (
        typeof err === "string" &&
        err.toLowerCase().includes("rate_limit")
      ) {
        const delayMs = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(
          `[SHOPEE SYNC] Ads rate limited (attempt ${attempt}/${maxRetries}), waiting ${delayMs}ms...`
        );
        if (attempt < maxRetries) {
          await sleep(delayMs);
          continue;
        }
        return { data: result, rateLimited: true };
      }
      return { data: result, rateLimited: false };
    } catch (e) {
      console.error(
        `[SHOPEE SYNC] Ads chunk ${startDate}-${endDate} attempt ${attempt} error:`,
        e
      );
      if (attempt < maxRetries) {
        await sleep(Math.pow(2, attempt) * 1000);
        continue;
      }
      return { data: null, rateLimited: false };
    }
  }
  return { data: null, rateLimited: false };
}

async function fetchAdsPerformance(
  accessToken: string,
  shopId: string | number
) {
  const now = Math.floor(Date.now() / 1000);
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60;

  // Build 7-day chunks
  const chunks: { start: string; end: string }[] = [];
  let cursor = thirtyDaysAgo;
  while (cursor < now) {
    const chunkEnd = Math.min(cursor + 7 * 24 * 60 * 60, now);
    chunks.push({ start: toDateStr(cursor), end: toDateStr(chunkEnd) });
    cursor = chunkEnd;
  }

  console.log(
    `[SHOPEE SYNC] Fetching Ads in ${chunks.length} chunks (7-day windows)`
  );

  let allEntries: any[] = [];
  let wasRateLimited = false;

  for (const chunk of chunks) {
    console.log(`[SHOPEE SYNC] Ads chunk: ${chunk.start} → ${chunk.end}`);
    const { data, rateLimited } = await fetchAdsChunkWithRetry(
      accessToken,
      shopId,
      chunk.start,
      chunk.end
    );
    if (rateLimited) {
      wasRateLimited = true;
      console.log(
        `[SHOPEE SYNC] Chunk ${chunk.start}-${chunk.end} rate-limited after retries`
      );
    }
    if (data) {
      const entries =
        data?.response?.entry_list || data?.response?.data || [];
      allEntries = allEntries.concat(entries);
    }
    // Small delay between chunks to avoid rate limiting
    if (chunks.indexOf(chunk) < chunks.length - 1) {
      await sleep(500);
    }
  }

  // Get total balance (separate endpoint, usually not rate-limited)
  let totalBalance: any = null;
  try {
    totalBalance = await shopeeGet(
      "/api/v2/ads/get_total_balance",
      accessToken,
      shopId
    );
    console.log(
      `[SHOPEE SYNC] Ads balance response error: ${totalBalance?.error || "none"}`
    );
  } catch (e) {
    console.error("[SHOPEE SYNC] Ads balance error:", e);
  }

  console.log(`[SHOPEE SYNC] Total Ads entries collected: ${allEntries.length}`);

  // Aggregate by item_id
  const productAds: Record<
    string,
    {
      item_id: number;
      item_name: string;
      impressions: number;
      clicks: number;
      expense: number;
      gmv: number;
      orders: number;
      ctr: number;
      roas: number;
      days: number;
    }
  > = {};

  for (const entry of allEntries) {
    const itemId = String(entry.item_id || entry.campaign?.item_id || "");
    if (!itemId || itemId === "0") continue;

    if (!productAds[itemId]) {
      productAds[itemId] = {
        item_id: Number(itemId),
        item_name: entry.title || entry.item_name || `Item ${itemId}`,
        impressions: 0,
        clicks: 0,
        expense: 0,
        gmv: 0,
        orders: 0,
        ctr: 0,
        roas: 0,
        days: 0,
      };
    }

    const p = productAds[itemId];
    p.impressions += Number(entry.impression || entry.impressions || 0);
    p.clicks += Number(entry.click || entry.clicks || 0);
    p.expense += Number(entry.expense || entry.cost || 0);
    p.gmv += Number(entry.broad_order_amount || entry.gmv || 0);
    p.orders += Number(entry.broad_order_num || entry.orders || 0);
    p.days++;
  }

  // Calculate derived metrics
  for (const p of Object.values(productAds)) {
    p.ctr = p.impressions > 0 ? (p.clicks / p.impressions) * 100 : 0;
    p.roas = p.expense > 0 ? p.gmv / p.expense : 0;
  }

  return {
    ads_by_product: Object.values(productAds),
    total_balance: totalBalance?.response?.total_balance ?? null,
    period_start: toDateStr(thirtyDaysAgo),
    period_end: toDateStr(now),
    raw_entry_count: allEntries.length,
    ads_rate_limited: wasRateLimited,
  };
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

    // 4. Ads Performance (30 days)
    try {
      const adsPerformance = await fetchAdsPerformance(currentAccessToken, shopId);
      results.ads_performance = adsPerformance;
      console.log(`[SHOPEE SYNC] Ads: ${adsPerformance.ads_by_product.length} products, ${adsPerformance.raw_entry_count} daily entries`);
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

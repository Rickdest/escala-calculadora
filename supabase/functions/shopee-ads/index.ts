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

/** DD-MM-YYYY format required by Shopee Ads API, using Brazil timezone */
const toDateStrBR = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const y = parts.find(p => p.type === "year")!.value;
  const m = parts.find(p => p.type === "month")!.value;
  const d = parts.find(p => p.type === "day")!.value;
  return `${d}-${m}-${y}`;
};

/** YYYY-MM-DD for database storage */
const toISODateBR = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const y = parts.find(p => p.type === "year")!.value;
  const m = parts.find(p => p.type === "month")!.value;
  const d = parts.find(p => p.type === "day")!.value;
  return `${y}-${m}-${d}`;
};

async function refreshTokenIfNeeded(shopeeToken: any, supabase: any) {
  const tokenAge =
    (Date.now() - new Date(shopeeToken.token_created_at).getTime()) / 1000;

  if (tokenAge <= shopeeToken.expire_in - 300) {
    return shopeeToken.access_token;
  }

  console.log("[SHOPEE ADS] Token near expiry, refreshing...");
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

async function fetchAdsPerformance(
  accessToken: string,
  shopId: string | number
) {
  // Use yesterday (Brazil TZ) as end to avoid "date_in_future" error
  const nowBR = new Date();
  const yesterdayBR = new Date(nowBR.getTime() - 24 * 60 * 60 * 1000);
  const startBR = new Date(nowBR.getTime() - 28 * 24 * 60 * 60 * 1000);
  const startDate = toDateStrBR(startBR);
  const endDate = toDateStrBR(yesterdayBR);
  const periodStartISO = toISODateBR(startBR);
  const periodEndISO = toISODateBR(yesterdayBR);

  // 1. Get campaign ID list
  let campaignIds: number[] = [];
  let campaignDetails: any[] = [];

  try {
    console.log("[SHOPEE ADS] === Step 1: get_product_level_campaign_id_list ===");
    const campaignList = await shopeeGet(
      "/api/v2/ads/get_product_level_campaign_id_list",
      accessToken,
      shopId
    );
    console.log(`[SHOPEE ADS] campaign_id_list FULL RESPONSE: ${JSON.stringify(campaignList).substring(0, 3000)}`);

    const campaignListArr = campaignList?.response?.campaign_list;
    if (Array.isArray(campaignListArr) && campaignListArr.length > 0) {
      campaignIds = campaignListArr.map((c: any) => c.campaign_id).filter(Boolean);
    }
    if (campaignIds.length === 0) {
      const fallback = campaignList?.response?.campaign_id_list || [];
      if (Array.isArray(fallback)) campaignIds = fallback;
    }

    console.log(`[SHOPEE ADS] Parsed ${campaignIds.length} campaign IDs`);
  } catch (e) {
    console.error("[SHOPEE ADS] get_product_level_campaign_id_list error:", e);
  }

  // 2. Get campaign settings/details — build campaign_id → item_id map
  const campaignToItem: Record<number, number> = {};
  const campaignToName: Record<number, string> = {};

  if (campaignIds.length > 0) {
    console.log("[SHOPEE ADS] === Step 2: get_product_level_campaign_setting_info ===");
    for (let i = 0; i < campaignIds.length; i += 20) {
      const batch = campaignIds.slice(i, i + 20);
      try {
        const details = await shopeeGet(
          "/api/v2/ads/get_product_level_campaign_setting_info",
          accessToken,
          shopId,
          { campaign_id_list: batch.join(","), info_type_list: "1" }
        );
        console.log(`[SHOPEE ADS] campaign_setting_info batch ${Math.floor(i / 20) + 1} RESPONSE: ${JSON.stringify(details).substring(0, 3000)}`);
        const items = details?.response?.campaign_list || details?.response?.data || [];
        if (Array.isArray(items)) {
          campaignDetails.push(...items);
          for (const d of items) {
            const itemId = d.common_info?.item_id_list?.[0] || d.item_id;
            const adName = d.common_info?.ad_name || d.title || "";
            if (d.campaign_id && itemId) {
              campaignToItem[d.campaign_id] = itemId;
              campaignToName[d.campaign_id] = adName;
            }
          }
        }
      } catch (e) {
        console.error(`[SHOPEE ADS] campaign_setting_info batch error:`, e);
      }
    }
    console.log(`[SHOPEE ADS] campaignToItem map size: ${Object.keys(campaignToItem).length}`);
  }

  // 3. Get daily performance (28 days)
  let allEntries: any[] = [];
  let wasRateLimited = false;
  let perfApiError = "";
  let perfApiMessage = "";

  try {
    console.log(`[SHOPEE ADS] === Step 3: get_all_cpc_ads_daily_performance ${startDate} → ${endDate} ===`);
    const result = await shopeeGet(
      "/api/v2/ads/get_all_cpc_ads_daily_performance",
      accessToken,
      shopId,
      { start_date: startDate, end_date: endDate }
    );
    console.log(`[SHOPEE ADS] daily_performance FULL RESPONSE: ${JSON.stringify(result).substring(0, 3000)}`);

    const err = result?.error || result?.msg || "";
    if (typeof err === "string" && err.toLowerCase().includes("rate_limit")) {
      wasRateLimited = true;
    } else if (err && err !== "") {
      perfApiError = err;
      perfApiMessage = result?.message || "";
    } else {
      // BUG FIX: response can be the array directly, not an object with entry_list
      const resp = result?.response;
      allEntries = Array.isArray(resp)
        ? resp
        : (resp?.entry_list || resp?.data || []);
    }
  } catch (e) {
    console.error("[SHOPEE ADS] get_all_cpc_ads_daily_performance error:", e);
    perfApiError = (e as Error).message;
  }

  console.log(`[SHOPEE ADS] Raw entries parsed: ${allEntries.length}`);

  // 4. Get total balance
  let totalBalance: any = null;
  try {
    totalBalance = await shopeeGet(
      "/api/v2/ads/get_total_balance",
      accessToken,
      shopId
    );
    console.log(`[SHOPEE ADS] Balance: ${JSON.stringify(totalBalance?.response || {})}`);
  } catch (e) {
    console.error("[SHOPEE ADS] Balance error:", e);
  }

  // === Aggregation ===
  // Daily entries are shop-level totals (no item_id/campaign_id).
  // We aggregate them into daily_totals + shop_summary.

  const dailyTotals: any[] = [];
  let shopSummary = {
    impressions: 0, clicks: 0, expense: 0, gmv: 0, orders: 0,
    ctr: 0, roas: 0, days: 0,
  };

  for (const entry of allEntries) {
    const impressions = Number(entry.impression || entry.impressions || 0);
    const clicks = Number(entry.click || entry.clicks || 0);
    const expense = Number(entry.expense || entry.cost || 0);
    const gmv = Number(entry.broad_order_amount || entry.gmv || 0);
    const orders = Number(entry.broad_order_num || entry.orders || 0);

    dailyTotals.push({
      date: entry.date || null,
      impressions, clicks, expense, gmv, orders,
    });

    shopSummary.impressions += impressions;
    shopSummary.clicks += clicks;
    shopSummary.expense += expense;
    shopSummary.gmv += gmv;
    shopSummary.orders += orders;
    shopSummary.days++;
  }

  shopSummary.ctr = shopSummary.impressions > 0
    ? (shopSummary.clicks / shopSummary.impressions) * 100 : 0;
  shopSummary.roas = shopSummary.expense > 0
    ? shopSummary.gmv / shopSummary.expense : 0;

  // Build ads_by_product from campaign details (enriched with item_id)
  // Since daily perf is shop-level, we distribute proportionally or just list campaigns
  const uniqueItems = new Map<number, { item_id: number; item_name: string; campaign_ids: number[] }>();
  for (const [cid, itemId] of Object.entries(campaignToItem)) {
    const cidNum = Number(cid);
    if (!uniqueItems.has(itemId)) {
      uniqueItems.set(itemId, {
        item_id: itemId,
        item_name: campaignToName[cidNum] || `Item ${itemId}`,
        campaign_ids: [],
      });
    }
    uniqueItems.get(itemId)!.campaign_ids.push(cidNum);
  }

  // Create ads_by_product entries from campaign details
  // We can't split shop-level metrics per product, so we set them as campaign info
  const adsByProduct = Array.from(uniqueItems.values()).map(item => ({
    item_id: item.item_id,
    item_name: item.item_name,
    campaign_ids: item.campaign_ids,
    // No per-product metrics available from this endpoint
    impressions: 0, clicks: 0, expense: 0, gmv: 0, orders: 0,
    ctr: 0, roas: 0, days: shopSummary.days,
  }));

  console.log(`[SHOPEE ADS] === DONE === Campaigns: ${campaignIds.length}, Details: ${campaignDetails.length}, DailyEntries: ${allEntries.length}, ShopSummary: imp=${shopSummary.impressions} clicks=${shopSummary.clicks} expense=${shopSummary.expense} gmv=${shopSummary.gmv}, UniqueProducts: ${uniqueItems.size}, RateLimited: ${wasRateLimited}`);

  return {
    ads_by_product: adsByProduct,
    daily_totals: dailyTotals,
    shop_summary: shopSummary,
    campaign_ids: campaignIds,
    campaign_details: campaignDetails,
    total_balance: totalBalance?.response?.total_balance ?? totalBalance?.response?.data_timestamp ? totalBalance?.response : null,
    period_start: periodStartISO,
    period_end: periodEndISO,
    raw_entry_count: allEntries.length,
    ads_rate_limited: wasRateLimited,
    campaign_count: campaignIds.length,
    campaign_to_item_count: Object.keys(campaignToItem).length,
    perf_api_error: perfApiError || null,
    perf_api_message: perfApiMessage || null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[SHOPEE ADS] === FUNCTION START ===");

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

    console.log(`[SHOPEE ADS] Starting ads sync for shop ${shopId}`);

    const adsPerformance = await fetchAdsPerformance(currentAccessToken, shopId);

    console.log(`[SHOPEE ADS] === FUNCTION END === Products: ${adsPerformance.ads_by_product.length}, ShopSummary: ${JSON.stringify(adsPerformance.shop_summary)}, Rate limited: ${adsPerformance.ads_rate_limited}`);

    return jsonResponse({
      success: true,
      results: {
        ads_performance: adsPerformance,
      },
    });
  } catch (e) {
    console.error("[SHOPEE ADS] Fatal error:", e);
    return errorResponse((e as Error).message, 500);
  }
});

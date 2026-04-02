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

/** DD-MM-YYYY format required by Shopee Ads API */
const toDateStr = (ts: number) => {
  const d = new Date(ts * 1000);
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
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
  const now = Math.floor(Date.now() / 1000);
  // Use 28 days to never cross 2 calendar months (API rejects > 1 month)
  const startTs = now - 28 * 24 * 60 * 60;
  const startDate = toDateStr(startTs);
  const endDate = toDateStr(now);

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

  // 2. Get campaign settings/details — requires info_type_list
  // Build campaign_id → item_id map for cross-referencing with performance data
  const campaignToItem: Record<number, number> = {};

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
        const items = details?.response?.data || details?.response?.campaign_list || [];
        if (Array.isArray(items)) {
          campaignDetails.push(...items);
          for (const d of items) {
            if (d.campaign_id && d.item_id) {
              campaignToItem[d.campaign_id] = d.item_id;
            }
          }
        }
      } catch (e) {
        console.error(`[SHOPEE ADS] campaign_setting_info batch error:`, e);
      }
    }
    console.log(`[SHOPEE ADS] campaignToItem map size: ${Object.keys(campaignToItem).length}`);
  }

  // 3. Get daily performance (28 days) — DD-MM-YYYY format
  let allEntries: any[] = [];
  let wasRateLimited = false;

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
    } else {
      allEntries = result?.response?.entry_list || result?.response?.data || [];
    }
  } catch (e) {
    console.error("[SHOPEE ADS] get_all_cpc_ads_daily_performance error:", e);
  }

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

  // Aggregate by item_id — use campaignToItem to enrich entries without item_id
  const productAds: Record<string, {
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
  }> = {};

  for (const entry of allEntries) {
    let itemId = String(entry.item_id || entry.campaign?.item_id || "");

    // Cross-reference with campaign details if item_id missing
    if ((!itemId || itemId === "0" || itemId === "") && entry.campaign_id) {
      const mapped = campaignToItem[entry.campaign_id];
      if (mapped) itemId = String(mapped);
    }

    if (!itemId || itemId === "0") continue;

    if (!productAds[itemId]) {
      productAds[itemId] = {
        item_id: Number(itemId),
        item_name: entry.title || entry.item_name || `Item ${itemId}`,
        impressions: 0, clicks: 0, expense: 0, gmv: 0, orders: 0,
        ctr: 0, roas: 0, days: 0,
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

  for (const p of Object.values(productAds)) {
    p.ctr = p.impressions > 0 ? (p.clicks / p.impressions) * 100 : 0;
    p.roas = p.expense > 0 ? p.gmv / p.expense : 0;
  }

  console.log(`[SHOPEE ADS] === DONE === Campaigns: ${campaignIds.length}, Details: ${campaignDetails.length}, Entries: ${allEntries.length}, Products: ${Object.keys(productAds).length}, RateLimited: ${wasRateLimited}`);

  return {
    ads_by_product: Object.values(productAds),
    campaign_ids: campaignIds,
    campaign_details: campaignDetails,
    total_balance: totalBalance?.response?.total_balance ?? totalBalance?.response?.data_timestamp ? totalBalance?.response : null,
    period_start: startDate,
    period_end: endDate,
    raw_entry_count: allEntries.length,
    ads_rate_limited: wasRateLimited,
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

    console.log(`[SHOPEE ADS] === FUNCTION END === Products: ${adsPerformance.ads_by_product.length}, Rate limited: ${adsPerformance.ads_rate_limited}`);

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

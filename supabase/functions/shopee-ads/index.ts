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

/** YYYY-MM-DD for database/frontend */
const toISODateBR = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const y = parts.find(p => p.type === "year")!.value;
  const m = parts.find(p => p.type === "month")!.value;
  const d = parts.find(p => p.type === "day")!.value;
  return `${y}-${m}-${d}`;
};

async function refreshTokenIfNeeded(shopeeToken: any, _supabase: any) {
  const tokenAge = (Date.now() - new Date(shopeeToken.token_created_at).getTime()) / 1000;
  if (tokenAge <= shopeeToken.expire_in - 300) return shopeeToken.access_token;

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
    await supabaseAdmin.from("shopee_tokens").update({
      access_token: refreshData.access_token,
      refresh_token: refreshData.refresh_token,
      expire_in: refreshData.expire_in || 0,
      token_created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", shopeeToken.id);
    return refreshData.access_token;
  }
  return shopeeToken.access_token;
}

async function fetchAdsPerformance(accessToken: string, shopId: string | number) {
  const nowBR = new Date();
  const yesterdayBR = new Date(nowBR.getTime() - 24 * 60 * 60 * 1000);
  const startBR = new Date(nowBR.getTime() - 28 * 24 * 60 * 60 * 1000);
  const startDate = toDateStrBR(startBR);
  const endDate = toDateStrBR(yesterdayBR);
  const periodStartISO = toISODateBR(startBR);
  const periodEndISO = toISODateBR(yesterdayBR);

  // 1. Campaign IDs
  let campaignIds: number[] = [];
  try {
    console.log("[SHOPEE ADS] === Step 1: get_product_level_campaign_id_list ===");
    const res = await shopeeGet("/api/v2/ads/get_product_level_campaign_id_list", accessToken, shopId);
    console.log(`[SHOPEE ADS] campaign_id_list: ${JSON.stringify(res).substring(0, 2000)}`);
    const arr = res?.response?.campaign_list;
    if (Array.isArray(arr)) campaignIds = arr.map((c: any) => c.campaign_id).filter(Boolean);
    if (campaignIds.length === 0) {
      const fb = res?.response?.campaign_id_list;
      if (Array.isArray(fb)) campaignIds = fb;
    }
    console.log(`[SHOPEE ADS] ${campaignIds.length} campaign IDs`);
  } catch (e) { console.error("[SHOPEE ADS] Step 1 error:", e); }

  // 2. Campaign details → item_id map
  const campaignDetails: any[] = [];
  if (campaignIds.length > 0) {
    console.log("[SHOPEE ADS] === Step 2: campaign settings ===");
    for (let i = 0; i < campaignIds.length; i += 20) {
      const batch = campaignIds.slice(i, i + 20);
      try {
        const res = await shopeeGet(
          "/api/v2/ads/get_product_level_campaign_setting_info",
          accessToken, shopId,
          { campaign_id_list: batch.join(","), info_type_list: "1" }
        );
        console.log(`[SHOPEE ADS] settings batch ${Math.floor(i / 20) + 1}: ${JSON.stringify(res).substring(0, 2000)}`);
        const items = res?.response?.campaign_list || res?.response?.data || [];
        if (Array.isArray(items)) {
          for (const d of items) {
            const itemId = d.common_info?.item_id_list?.[0] || d.item_id || null;
            const adName = d.common_info?.ad_name || d.title || "";
            const status = d.common_info?.status ?? d.status ?? null;
            campaignDetails.push({
              campaign_id: d.campaign_id,
              item_id: itemId,
              ad_name: adName,
              status,
            });
          }
        }
      } catch (e) { console.error("[SHOPEE ADS] Step 2 batch error:", e); }
    }
    console.log(`[SHOPEE ADS] ${campaignDetails.length} campaign details parsed`);
  }

  // 3. Daily performance (shop-level, no item_id)
  let dailyEntries: any[] = [];
  let perfApiError = "";
  let perfApiMessage = "";
  let wasRateLimited = false;

  try {
    console.log(`[SHOPEE ADS] === Step 3: daily_performance ${startDate} → ${endDate} ===`);
    const res = await shopeeGet(
      "/api/v2/ads/get_all_cpc_ads_daily_performance",
      accessToken, shopId,
      { start_date: startDate, end_date: endDate }
    );
    console.log(`[SHOPEE ADS] daily_performance: ${JSON.stringify(res).substring(0, 3000)}`);

    const err = res?.error || res?.msg || "";
    if (typeof err === "string" && err.toLowerCase().includes("rate_limit")) {
      wasRateLimited = true;
    } else if (err && err !== "") {
      perfApiError = err;
      perfApiMessage = res?.message || "";
    } else {
      const resp = res?.response;
      const raw = Array.isArray(resp) ? resp : (resp?.entry_list || resp?.data || []);
      dailyEntries = raw.map((e: any) => ({
        date: e.date || null,
        impressions: Number(e.impression || e.impressions || 0),
        clicks: Number(e.click || e.clicks || 0),
        expense: Number(e.expense || e.cost || 0),
        gmv: Number(e.broad_order_amount || e.broad_gmv || e.gmv || 0),
        orders: Number(e.broad_order_num || e.broad_order || e.orders || 0),
        roas: Number(e.broad_roas || e.roas || 0),
      }));
    }
  } catch (e) {
    console.error("[SHOPEE ADS] Step 3 error:", e);
    perfApiError = (e as Error).message;
  }

  console.log(`[SHOPEE ADS] ${dailyEntries.length} daily entries parsed`);

  // 4. Balance
  let totalBalance: any = null;
  try {
    const res = await shopeeGet("/api/v2/ads/get_total_balance", accessToken, shopId);
    totalBalance = res?.response || null;
    console.log(`[SHOPEE ADS] Balance: ${JSON.stringify(totalBalance)}`);
  } catch (e) { console.error("[SHOPEE ADS] Balance error:", e); }

  // Aggregate summary
  const summary = {
    total_impressions: 0, total_clicks: 0, total_expense: 0,
    total_gmv: 0, total_orders: 0, roas_geral: 0, ctr: 0, days: dailyEntries.length,
  };
  for (const d of dailyEntries) {
    summary.total_impressions += d.impressions;
    summary.total_clicks += d.clicks;
    summary.total_expense += d.expense;
    summary.total_gmv += d.gmv;
    summary.total_orders += d.orders;
  }
  summary.roas_geral = summary.total_expense > 0 ? summary.total_gmv / summary.total_expense : 0;
  summary.ctr = summary.total_impressions > 0 ? (summary.total_clicks / summary.total_impressions) * 100 : 0;

  console.log(`[SHOPEE ADS] === DONE === campaigns=${campaignIds.length} days=${dailyEntries.length} expense=${summary.total_expense} gmv=${summary.total_gmv} roas=${summary.roas_geral.toFixed(2)}`);

  return {
    daily_entries: dailyEntries,
    summary,
    campaign_details: campaignDetails,
    total_balance: totalBalance,
    period_start: periodStartISO,
    period_end: periodEndISO,
    campaign_count: campaignIds.length,
    ads_rate_limited: wasRateLimited,
    perf_api_error: perfApiError || null,
    perf_api_message: perfApiMessage || null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    console.log("[SHOPEE ADS] === FUNCTION START ===");
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
    const user = { id: claimsData.claims.sub as string };

    const { data: tokens } = await supabase.from("shopee_tokens").select("*").eq("user_id", user.id).limit(1);
    if (!tokens || tokens.length === 0) return errorResponse("No Shopee token found. Connect your shop first.");

    const shopeeToken = tokens[0];
    const currentAccessToken = await refreshTokenIfNeeded(shopeeToken, supabase);

    const adsPerformance = await fetchAdsPerformance(currentAccessToken, shopeeToken.shop_id);

    return jsonResponse({ success: true, results: { ads_performance: adsPerformance } });
  } catch (e) {
    console.error("[SHOPEE ADS] Fatal error:", e);
    return errorResponse((e as Error).message, 500);
  }
});

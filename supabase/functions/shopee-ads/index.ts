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

const toDateStrBR = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const y = parts.find(p => p.type === "year")!.value;
  const m = parts.find(p => p.type === "month")!.value;
  const d = parts.find(p => p.type === "day")!.value;
  return `${d}-${m}-${y}`;
};

const toISODateBR = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const y = parts.find(p => p.type === "year")!.value;
  const m = parts.find(p => p.type === "month")!.value;
  const d = parts.find(p => p.type === "day")!.value;
  return `${y}-${m}-${d}`;
};

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

const ADS_LOOKBACK_DAYS = 90;

type CampaignStatus = "active" | "paused" | "ended";

const toFiniteNumber = (...values: unknown[]) => {
  for (const value of values) {
    const parsed = typeof value === "string" && value.trim() === "" ? Number.NaN : Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

function mapCampaignStatus(rawStatus: unknown): CampaignStatus {
  const normalized = typeof rawStatus === "string" ? rawStatus.trim().toLowerCase() : rawStatus;

  if (normalized === 1 || normalized === "1" || normalized === "ongoing" || normalized === "active" || normalized === "running") {
    return "active";
  }

  if (normalized === 0 || normalized === "0" || normalized === 2 || normalized === "2" || normalized === "paused" || normalized === "pause" || normalized === "suspended") {
    return "paused";
  }

  if (normalized === 3 || normalized === "3" || normalized === 4 || normalized === "4" || normalized === "ended" || normalized === "closed" || normalized === "close" || normalized === "finished") {
    return "ended";
  }

  return "ended";
}

function extractCampaignSummaryMetrics(detail: any) {
  const perf = detail?.performance_info ?? detail?.performance ?? detail?.report_info ?? detail?.stats ?? detail?.data ?? null;

  const impressions = toFiniteNumber(
    perf?.impression,
    perf?.impressions,
    perf?.total_impression,
    perf?.total_impressions,
    detail?.impression,
    detail?.impressions,
    detail?.total_impression,
    detail?.total_impressions,
  );
  const clicks = toFiniteNumber(
    perf?.click,
    perf?.clicks,
    perf?.total_click,
    perf?.total_clicks,
    detail?.click,
    detail?.clicks,
    detail?.total_click,
    detail?.total_clicks,
  );
  const expense = toFiniteNumber(
    perf?.expense,
    perf?.cost,
    perf?.ad_spend,
    perf?.total_expense,
    perf?.total_cost,
    detail?.expense,
    detail?.cost,
    detail?.total_expense,
    detail?.total_cost,
  );
  const gmv = toFiniteNumber(
    perf?.broad_order_amount,
    perf?.broad_gmv,
    perf?.gmv,
    perf?.total_gmv,
    perf?.total_broad_gmv,
    detail?.broad_order_amount,
    detail?.broad_gmv,
    detail?.gmv,
    detail?.total_gmv,
  );
  const directGmv = toFiniteNumber(
    perf?.direct_order_amount,
    perf?.direct_gmv,
    perf?.total_direct_gmv,
    detail?.direct_order_amount,
    detail?.direct_gmv,
    detail?.total_direct_gmv,
  );
  const orders = toFiniteNumber(
    perf?.broad_order_num,
    perf?.broad_order,
    perf?.orders,
    perf?.total_orders,
    perf?.total_broad_orders,
    detail?.broad_order_num,
    detail?.broad_order,
    detail?.orders,
    detail?.total_orders,
  );
  const directOrders = toFiniteNumber(
    perf?.direct_order_num,
    perf?.direct_orders,
    perf?.total_direct_orders,
    detail?.direct_order_num,
    detail?.direct_orders,
    detail?.total_direct_orders,
  );
  const avgPosition = (() => {
    const value = toFiniteNumber(
      perf?.average_position,
      perf?.avg_position,
      detail?.average_position,
      detail?.avg_position,
    );
    return value > 0 ? value : null;
  })();
  const daysActive = toFiniteNumber(perf?.days_active, perf?.active_days, detail?.days_active, detail?.active_days);
  const hasData = [impressions, clicks, expense, gmv, directGmv, orders, directOrders].some((value) => value > 0);

  return {
    impressions,
    clicks,
    expense,
    gmv,
    direct_gmv: directGmv,
    orders,
    direct_orders: directOrders,
    avg_position: avgPosition,
    roas: expense > 0 ? gmv / expense : 0,
    direct_roas: expense > 0 ? directGmv / expense : 0,
    acos: gmv > 0 ? (expense / gmv) * 100 : 0,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cost_per_order: orders > 0 ? expense / orders : 0,
    days_active: daysActive,
    hasData,
  };
}

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

/**
 * Fetch per-campaign daily performance using POST first, fallback to GET.
 */
async function fetchCampaignDaily(
  accessToken: string,
  shopId: string | number,
  campaignId: number,
  startDate: string,
  endDate: string,
  isFirst: boolean,
): Promise<any[]> {
  const path = "/api/v2/ads/get_product_campaign_daily_performance";

  // Try POST first (Shopee AMS pattern)
  try {
    const res = await shopeePost(path, accessToken, shopId, {
      campaign_id: campaignId,
      start_date: startDate,
      end_date: endDate,
    });
    if (isFirst) {
      console.log(`[SHOPEE ADS] [DEBUG] POST response campaign ${campaignId}: ${JSON.stringify(res).substring(0, 1500)}`);
    }
    const resp = res?.response;
    if (resp) {
      const entries = Array.isArray(resp) ? resp : (resp?.entry_list || resp?.data || []);
      if (entries.length > 0) return entries;
    }
    // If POST returned error or empty, check if it's a real error
    if (res?.error && res?.message) {
      if (isFirst) console.log(`[SHOPEE ADS] POST error for campaign ${campaignId}: ${res.error} - ${res.message}`);
    }
  } catch (e) {
    if (isFirst) console.log(`[SHOPEE ADS] POST exception for campaign ${campaignId}:`, e);
  }

  // Fallback to GET
  try {
    const res = await shopeeGet(path, accessToken, shopId, {
      campaign_id: String(campaignId),
      start_date: startDate,
      end_date: endDate,
    });
    if (isFirst) {
      console.log(`[SHOPEE ADS] [DEBUG] GET response campaign ${campaignId}: ${JSON.stringify(res).substring(0, 1500)}`);
    }
    const resp = res?.response;
    const entries = Array.isArray(resp) ? resp : (resp?.entry_list || resp?.data || []);
    return entries;
  } catch (e) {
    if (isFirst) console.error(`[SHOPEE ADS] GET exception for campaign ${campaignId}:`, e);
    return [];
  }
}

async function fetchAdsPerformance(accessToken: string, shopId: string | number, filterItemId?: number) {
  const nowBR = new Date();
  const yesterdayBR = new Date(nowBR.getTime() - 24 * 60 * 60 * 1000);
  const startBR = new Date(nowBR.getTime() - ADS_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const startDate = toDateStrBR(startBR);
  const endDate = toDateStrBR(yesterdayBR);
  const periodStartISO = toISODateBR(startBR);
  const periodEndISO = toISODateBR(yesterdayBR);

  // Step 1: Campaign IDs
  let campaignIds: number[] = [];
  try {
    console.log("[SHOPEE ADS] === Step 1: get_product_level_campaign_id_list ===");
    const res = await shopeeGet("/api/v2/ads/get_product_level_campaign_id_list", accessToken, shopId);
    const arr = res?.response?.campaign_list;
    if (Array.isArray(arr)) campaignIds = arr.map((c: any) => c.campaign_id).filter(Boolean);
    if (campaignIds.length === 0) {
      const fb = res?.response?.campaign_id_list;
      if (Array.isArray(fb)) campaignIds = fb;
    }
    console.log(`[SHOPEE ADS] ${campaignIds.length} campaign IDs`);
  } catch (e) { console.error("[SHOPEE ADS] Step 1 error:", e); }

  // Step 2: Campaign details → item_id map
  const campaignDetails: any[] = [];
  const campaignToItem = new Map<number, { item_id: number; ad_name: string; status: number | null }>();

  if (campaignIds.length > 0) {
    console.log("[SHOPEE ADS] === Step 2: campaign settings (info_type 1,2) ===");
    for (let i = 0; i < campaignIds.length; i += 20) {
      const batch = campaignIds.slice(i, i + 20);
      try {
        const res = await shopeeGet(
          "/api/v2/ads/get_product_level_campaign_setting_info",
          accessToken, shopId,
          { campaign_id_list: batch.join(","), info_type_list: "1,2" }
        );
        // Log first batch raw response for debugging
        if (i === 0) {
          console.log(`[SHOPEE ADS] [DEBUG] Step 2 raw (first 3):`, JSON.stringify(res?.response?.campaign_list?.slice(0, 3)).substring(0, 3000));
        }
        const items = res?.response?.campaign_list || res?.response?.data || [];
        if (Array.isArray(items)) {
          for (const d of items) {
            const itemId = d.common_info?.item_id_list?.[0] || d.item_id || null;
            const adName = d.common_info?.ad_name || d.title || "";
            const rawStatus = d.common_info?.campaign_status ?? d.common_info?.status ?? d.campaign_status ?? d.status ?? d.state ?? null;
            const mappedStatus = mapCampaignStatus(rawStatus);
            const summaryMetrics = extractCampaignSummaryMetrics(d);
            campaignDetails.push({ campaign_id: d.campaign_id, item_id: itemId, ad_name: adName, status: mappedStatus, raw_status: rawStatus, summary_metrics: summaryMetrics });
            if (itemId) {
              campaignToItem.set(d.campaign_id, { item_id: itemId, ad_name: adName, status: rawStatus });
            }
          }
        }
      } catch (e) { console.error("[SHOPEE ADS] Step 2 batch error:", e); }
    }
    console.log(`[SHOPEE ADS] ${campaignDetails.length} campaign details, ${campaignToItem.size} with item_id`);
    console.log(`[SHOPEE ADS] [DEBUG] statuses:`, JSON.stringify(campaignDetails.slice(0, 5).map(c => ({ id: c.campaign_id, status: c.status, raw: c.raw_status }))));
  }

  // Step 3: Daily performance (shop-level)
  let dailyEntries: any[] = [];
  try {
    console.log(`[SHOPEE ADS] === Step 3: daily_performance ${startDate} → ${endDate} ===`);
    const res = await shopeeGet(
      "/api/v2/ads/get_all_cpc_ads_daily_performance",
      accessToken, shopId,
      { start_date: startDate, end_date: endDate }
    );
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
  } catch (e) { console.error("[SHOPEE ADS] Step 3 error:", e); }
  console.log(`[SHOPEE ADS] ${dailyEntries.length} daily entries parsed`);

  // Step 4: Per-campaign daily performance → individual campaign entries
  const adsByCampaign: any[] = [];
  const campaignsForStep4 = campaignDetails.filter(c => {
    if (filterItemId && c.item_id !== filterItemId) return false;
    return !!c.item_id;
  });
  console.log(`[SHOPEE ADS] === Step 4: per-campaign performance for ${campaignsForStep4.length} campaigns ===`);
  console.log(`[SHOPEE ADS] [DEBUG] sample:`, JSON.stringify(campaignsForStep4.slice(0, 3).map(c => ({ id: c.campaign_id, item_id: c.item_id, status: c.status }))));

  // Fetch first campaign serially to get debug logs
  if (campaignsForStep4.length > 0) {
    const first = campaignsForStep4[0];
    const entries = await fetchCampaignDaily(accessToken, shopId, first.campaign_id, startDate, endDate, true);
    processCampaignEntries(first, entries, adsByCampaign, 1, campaignsForStep4.length);
  }

  // Fetch remaining in batches of 5 with 300ms delay
  for (let i = 1; i < campaignsForStep4.length; i += 5) {
    const batch = campaignsForStep4.slice(i, i + 5);
    const promises = batch.map(async (c, batchIdx) => {
      const entries = await fetchCampaignDaily(accessToken, shopId, c.campaign_id, startDate, endDate, false);
      processCampaignEntries(c, entries, adsByCampaign, i + batchIdx + 1, campaignsForStep4.length);
    });
    await Promise.all(promises);
    if (i + 5 < campaignsForStep4.length) await delay(300);
  }

  console.log(`[SHOPEE ADS] ${adsByCampaign.length} campaigns with data out of ${campaignsForStep4.length}`);

  // Step 5: Balance
  let totalBalance: any = null;
  try {
    const res = await shopeeGet("/api/v2/ads/get_total_balance", accessToken, shopId);
    totalBalance = res?.response || null;
  } catch (e) { console.error("[SHOPEE ADS] Balance error:", e); }

  // Aggregate summary from shop-level daily
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

  console.log(`[SHOPEE ADS] === DONE === campaigns=${campaignIds.length} days=${dailyEntries.length} ads_by_campaign=${adsByCampaign.length} expense=${summary.total_expense} roas=${summary.roas_geral.toFixed(2)}`);

  return {
    daily_entries: dailyEntries,
    summary,
    campaign_details: campaignDetails,
    ads_by_campaign: adsByCampaign,
    total_balance: totalBalance,
    period_start: periodStartISO,
    period_end: periodEndISO,
    campaign_count: campaignIds.length,
  };
}

function processCampaignEntries(campaign: any, entries: any[], result: any[], idx: number, total: number) {
  const fallbackMetrics = entries.length === 0 && campaign.summary_metrics?.hasData ? campaign.summary_metrics : null;
  let totImp = fallbackMetrics?.impressions ?? 0, totClk = fallbackMetrics?.clicks ?? 0, totExp = fallbackMetrics?.expense ?? 0, totGmv = fallbackMetrics?.gmv ?? 0, totDgmv = fallbackMetrics?.direct_gmv ?? 0, totOrd = fallbackMetrics?.orders ?? 0, totDord = fallbackMetrics?.direct_orders ?? 0;
  let posWeighted = 0, posImp = 0, daysActive = fallbackMetrics?.days_active ?? 0;
  const daily: any[] = [];

  for (const e of entries) {
    const imp = Number(e.impression || e.impressions || 0);
    const clk = Number(e.click || e.clicks || 0);
    const exp = Number(e.expense || e.cost || 0);
    const gm = Number(e.broad_order_amount || e.broad_gmv || e.gmv || 0);
    const dgm = Number(e.direct_order_amount || e.direct_gmv || 0);
    const ord = Number(e.broad_order_num || e.broad_order || e.orders || 0);
    const dord = Number(e.direct_order_num || e.direct_orders || 0);
    const pos = Number(e.average_position || e.avg_position || 0);

    totImp += imp; totClk += clk; totExp += exp; totGmv += gm; totDgmv += dgm; totOrd += ord; totDord += dord;
    if (pos > 0) { posWeighted += pos * imp; posImp += imp; }
    if (exp > 0) daysActive++;

    daily.push({
      date: e.date || "unknown",
      impressions: imp, clicks: clk,
      expense: Math.round(exp * 100) / 100,
      gmv: Math.round(gm * 100) / 100,
      roas: exp > 0 ? Math.round((gm / exp) * 100) / 100 : 0,
    });
  }

  // campaign.status is already mapped to 'active'|'paused'|'ended' in Step 2
  const statusStr = campaign.status || 'ended';

  console.log(`[SHOPEE ADS] Campaign ${idx}/${total}: id=${campaign.campaign_id} item_id=${campaign.item_id} status=${statusStr} expense=${totExp.toFixed(2)} entries=${entries.length}${fallbackMetrics ? ' source=summary' : ''}`);

  // Always include the campaign even with zero data - shows in frontend with name/status
  result.push({
    campaign_id: campaign.campaign_id,
    item_id: campaign.item_id,
    item_name: campaign.ad_name || `Item #${campaign.item_id}`,
    status: statusStr,
    impressions: totImp,
    clicks: totClk,
    expense: Math.round(totExp * 100) / 100,
    gmv: Math.round(totGmv * 100) / 100,
    direct_gmv: Math.round(totDgmv * 100) / 100,
    orders: totOrd,
    direct_orders: totDord,
    avg_position: posImp > 0 ? Math.round((posWeighted / posImp) * 10) / 10 : (fallbackMetrics?.avg_position ?? null),
    roas: totExp > 0 ? Math.round((totGmv / totExp) * 100) / 100 : Math.round((fallbackMetrics?.roas ?? 0) * 100) / 100,
    direct_roas: totExp > 0 ? Math.round((totDgmv / totExp) * 100) / 100 : Math.round((fallbackMetrics?.direct_roas ?? 0) * 100) / 100,
    acos: totGmv > 0 ? Math.round((totExp / totGmv) * 10000) / 100 : Math.round((fallbackMetrics?.acos ?? 0) * 100) / 100,
    ctr: totImp > 0 ? Math.round((totClk / totImp) * 10000) / 100 : Math.round((fallbackMetrics?.ctr ?? 0) * 100) / 100,
    cost_per_order: totOrd > 0 ? Math.round((totExp / totOrd) * 100) / 100 : Math.round((fallbackMetrics?.cost_per_order ?? 0) * 100) / 100,
    days_active: daysActive,
    daily: daily.sort((a, b) => (a.date || "").localeCompare(b.date || "")),
  });
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

    let filterItemId: number | undefined;
    try {
      if (req.method === "POST") {
        const body = await req.json().catch(() => ({}));
        if (body?.item_id) filterItemId = Number(body.item_id);
      }
    } catch { /* ignore */ }

    const adsPerformance = await fetchAdsPerformance(currentAccessToken, shopeeToken.shop_id, filterItemId);

    // Upsert ads_by_campaign to database using service role
    if (adsPerformance.ads_by_campaign.length > 0) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      for (const c of adsPerformance.ads_by_campaign) {
        await supabaseAdmin.from("shopee_ads_by_product").upsert({
          user_id: user.id,
          shop_id: Number(shopeeToken.shop_id),
          campaign_id: c.campaign_id,
          item_id: c.item_id,
          item_name: c.item_name,
          period_start: adsPerformance.period_start,
          period_end: adsPerformance.period_end,
          impressions: c.impressions,
          clicks: c.clicks,
          expense: c.expense,
          gmv: c.gmv,
          direct_gmv: c.direct_gmv,
          orders: c.orders,
          direct_orders: c.direct_orders,
          avg_position: c.avg_position,
          roas: c.roas,
          direct_roas: c.direct_roas,
          acos: c.acos,
          ctr: c.ctr,
          cost_per_order: c.cost_per_order,
          days_active: c.days_active,
          daily_data: c.daily,
          campaign_ids: [c.campaign_id],
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,campaign_id,period_start" });
      }
      console.log(`[SHOPEE ADS] Upserted ${adsPerformance.ads_by_campaign.length} campaign records`);
    }

    return jsonResponse({ success: true, results: { ads_performance: adsPerformance } });
  } catch (e) {
    console.error("[SHOPEE ADS] Fatal error:", e);
    return errorResponse((e as Error).message, 500);
  }
});

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

async function fetchAdsPerformance(accessToken: string, shopId: string | number, filterItemId?: number) {
  const nowBR = new Date();
  const yesterdayBR = new Date(nowBR.getTime() - 24 * 60 * 60 * 1000);
  const startBR = new Date(nowBR.getTime() - 28 * 24 * 60 * 60 * 1000);
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
    console.log("[SHOPEE ADS] === Step 2: campaign settings ===");
    for (let i = 0; i < campaignIds.length; i += 20) {
      const batch = campaignIds.slice(i, i + 20);
      try {
        const res = await shopeeGet(
          "/api/v2/ads/get_product_level_campaign_setting_info",
          accessToken, shopId,
          { campaign_id_list: batch.join(","), info_type_list: "1" }
        );
        const items = res?.response?.campaign_list || res?.response?.data || [];
        if (Array.isArray(items)) {
          for (const d of items) {
            const itemId = d.common_info?.item_id_list?.[0] || d.item_id || null;
            const adName = d.common_info?.ad_name || d.title || "";
            const status = d.common_info?.status ?? d.status ?? null;
            campaignDetails.push({ campaign_id: d.campaign_id, item_id: itemId, ad_name: adName, status });
            if (itemId) {
              campaignToItem.set(d.campaign_id, { item_id: itemId, ad_name: adName, status });
            }
          }
        }
      } catch (e) { console.error("[SHOPEE ADS] Step 2 batch error:", e); }
    }
    console.log(`[SHOPEE ADS] ${campaignDetails.length} campaign details, ${campaignToItem.size} with item_id`);
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

  // Step 4: Per-campaign daily performance → aggregate by item_id
  // Include ALL campaigns (active, paused, ended) for full history
  const adsByProduct: any[] = [];
  const campaignsForStep4 = campaignDetails.filter(c => {
    if (filterItemId && c.item_id !== filterItemId) return false;
    return !!c.item_id; // only need item_id, include all statuses
  });
  console.log(`[SHOPEE ADS] === Step 4: per-campaign performance for ${campaignsForStep4.length} campaigns (all statuses) ===`);
  // Debug: log first 3 campaign statuses
  console.log(`[SHOPEE ADS] [DEBUG] campaign statuses sample:`, JSON.stringify(campaignsForStep4.slice(0, 3).map(c => ({ id: c.campaign_id, item_id: c.item_id, status: c.status, type: typeof c.status }))));

  // Group campaigns by item_id, track if any is ongoing
  const itemCampaigns = new Map<number, { ad_name: string; campaign_ids: number[]; has_ongoing: boolean }>();
  for (const c of campaignsForStep4) {
    const existing = itemCampaigns.get(c.item_id);
    const isOngoing = c.status === 1 || c.status === "ongoing";
    if (existing) {
      existing.campaign_ids.push(c.campaign_id);
      if (isOngoing) existing.has_ongoing = true;
    } else {
      itemCampaigns.set(c.item_id, { ad_name: c.ad_name, campaign_ids: [c.campaign_id], has_ongoing: isOngoing });
    }
  }

  // Fetch per-campaign daily data in batches of 5 with 300ms delay
  const allCampaignDailyData = new Map<number, any[]>();
  const campaignIdsToFetch = campaignsForStep4.map(c => c.campaign_id);
  let fetchIdx = 0;

  for (let i = 0; i < campaignIdsToFetch.length; i += 5) {
    const batch = campaignIdsToFetch.slice(i, i + 5);
    const promises = batch.map(async (cid: number) => {
      fetchIdx++;
      try {
        const res = await shopeeGet(
          "/api/v2/ads/get_product_campaign_daily_performance",
          accessToken, shopId,
          { campaign_id: String(cid), start_date: startDate, end_date: endDate }
        );
        const resp = res?.response;
        const raw = Array.isArray(resp) ? resp : (resp?.entry_list || resp?.data || []);
        allCampaignDailyData.set(cid, raw);
        const info = campaignToItem.get(cid);
        const totalExp = raw.reduce((s: number, e: any) => s + Number(e.expense || e.cost || 0), 0);
        console.log(`[SHOPEE ADS] Campaign ${fetchIdx}/${campaignIdsToFetch.length}: id=${cid} item_id=${info?.item_id} expense=${totalExp.toFixed(2)} entries=${raw.length}`);
      } catch (e) {
        console.error(`[SHOPEE ADS] Step 4 campaign ${cid} error:`, e);
      }
    });
    await Promise.all(promises);
    if (i + 5 < campaignIdsToFetch.length) await delay(300);
  }
  console.log(`[SHOPEE ADS] Fetched daily data for ${allCampaignDailyData.size}/${campaignIdsToFetch.length} campaigns`);

  // Aggregate by item_id
  for (const [itemId, info] of itemCampaigns.entries()) {
    const dailyMap = new Map<string, { impressions: number; clicks: number; expense: number; gmv: number; direct_gmv: number; orders: number; direct_orders: number; positionWeighted: number; positionImpressions: number }>();

    for (const cid of info.campaign_ids) {
      const entries = allCampaignDailyData.get(cid) || [];
      for (const e of entries) {
        const date = e.date || "unknown";
        const imp = Number(e.impression || e.impressions || 0);
        const clk = Number(e.click || e.clicks || 0);
        const exp = Number(e.expense || e.cost || 0);
        const gm = Number(e.broad_order_amount || e.broad_gmv || e.gmv || 0);
        const dgm = Number(e.direct_order_amount || e.direct_gmv || 0);
        const ord = Number(e.broad_order_num || e.broad_order || e.orders || 0);
        const dord = Number(e.direct_order_num || e.direct_orders || 0);
        const pos = Number(e.average_position || e.avg_position || 0);

        const existing = dailyMap.get(date);
        if (existing) {
          existing.impressions += imp;
          existing.clicks += clk;
          existing.expense += exp;
          existing.gmv += gm;
          existing.direct_gmv += dgm;
          existing.orders += ord;
          existing.direct_orders += dord;
          if (pos > 0) { existing.positionWeighted += pos * imp; existing.positionImpressions += imp; }
        } else {
          dailyMap.set(date, {
            impressions: imp, clicks: clk, expense: exp, gmv: gm, direct_gmv: dgm,
            orders: ord, direct_orders: dord,
            positionWeighted: pos > 0 ? pos * imp : 0,
            positionImpressions: pos > 0 ? imp : 0,
          });
        }
      }
    }

    // Build totals
    let totImp = 0, totClk = 0, totExp = 0, totGmv = 0, totDgmv = 0, totOrd = 0, totDord = 0;
    let posWeighted = 0, posImp = 0, daysActive = 0;
    const daily: any[] = [];

    for (const [date, d] of dailyMap.entries()) {
      totImp += d.impressions; totClk += d.clicks; totExp += d.expense;
      totGmv += d.gmv; totDgmv += d.direct_gmv; totOrd += d.orders; totDord += d.direct_orders;
      posWeighted += d.positionWeighted; posImp += d.positionImpressions;
      if (d.expense > 0) daysActive++;
      daily.push({
        date, impressions: d.impressions, clicks: d.clicks,
        expense: Math.round(d.expense * 100) / 100,
        gmv: Math.round(d.gmv * 100) / 100,
        roas: d.expense > 0 ? Math.round((d.gmv / d.expense) * 100) / 100 : 0,
      });
    }

    if (totImp === 0 && totExp === 0) continue; // skip products with no data

    adsByProduct.push({
      item_id: itemId,
      item_name: info.ad_name,
      campaign_ids: info.campaign_ids,
      campaign_count: info.campaign_ids.length,
      status: info.has_ongoing ? 'active' : 'ended',
      impressions: totImp,
      clicks: totClk,
      expense: Math.round(totExp * 100) / 100,
      gmv: Math.round(totGmv * 100) / 100,
      direct_gmv: Math.round(totDgmv * 100) / 100,
      orders: totOrd,
      direct_orders: totDord,
      avg_position: posImp > 0 ? Math.round((posWeighted / posImp) * 10) / 10 : null,
      roas: totExp > 0 ? Math.round((totGmv / totExp) * 100) / 100 : 0,
      direct_roas: totExp > 0 ? Math.round((totDgmv / totExp) * 100) / 100 : 0,
      acos: totGmv > 0 ? Math.round((totExp / totGmv) * 10000) / 100 : 0,
      ctr: totImp > 0 ? Math.round((totClk / totImp) * 10000) / 100 : 0,
      cost_per_order: totOrd > 0 ? Math.round((totExp / totOrd) * 100) / 100 : 0,
      days_active: daysActive,
      daily: daily.sort((a, b) => (a.date || "").localeCompare(b.date || "")),
    });
  }

  // Log top products
  if (adsByProduct.length > 0) {
    const topSpend = adsByProduct.reduce((a, b) => a.expense > b.expense ? a : b);
    const topRoas = adsByProduct.reduce((a, b) => a.roas > b.roas ? a : b);
    console.log(`[SHOPEE ADS] ${adsByProduct.length} products with data. Top spend: ${topSpend.item_name} (R$${topSpend.expense}). Top ROAS: ${topRoas.item_name} (${topRoas.roas})`);
  }

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

  console.log(`[SHOPEE ADS] === DONE === campaigns=${campaignIds.length} days=${dailyEntries.length} products=${adsByProduct.length} expense=${summary.total_expense} roas=${summary.roas_geral.toFixed(2)}`);

  return {
    daily_entries: dailyEntries,
    summary,
    campaign_details: campaignDetails,
    ads_by_product: adsByProduct,
    total_balance: totalBalance,
    period_start: periodStartISO,
    period_end: periodEndISO,
    campaign_count: campaignIds.length,
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

    // Check for item_id filter from request body
    let filterItemId: number | undefined;
    try {
      if (req.method === "POST") {
        const body = await req.json().catch(() => ({}));
        if (body?.item_id) filterItemId = Number(body.item_id);
      }
    } catch { /* ignore */ }

    const adsPerformance = await fetchAdsPerformance(currentAccessToken, shopeeToken.shop_id, filterItemId);

    // Upsert ads_by_product to database using service role
    if (adsPerformance.ads_by_product.length > 0) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      for (const p of adsPerformance.ads_by_product) {
        await supabaseAdmin.from("shopee_ads_by_product").upsert({
          user_id: user.id,
          shop_id: Number(shopeeToken.shop_id),
          item_id: p.item_id,
          item_name: p.item_name,
          period_start: adsPerformance.period_start,
          period_end: adsPerformance.period_end,
          impressions: p.impressions,
          clicks: p.clicks,
          expense: p.expense,
          gmv: p.gmv,
          direct_gmv: p.direct_gmv,
          orders: p.orders,
          direct_orders: p.direct_orders,
          avg_position: p.avg_position,
          roas: p.roas,
          direct_roas: p.direct_roas,
          acos: p.acos,
          ctr: p.ctr,
          cost_per_order: p.cost_per_order,
          days_active: p.days_active,
          daily_data: p.daily,
          campaign_ids: p.campaign_ids,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,item_id,period_start" });
      }
      console.log(`[SHOPEE ADS] Upserted ${adsPerformance.ads_by_product.length} product records`);
    }

    return jsonResponse({ success: true, results: { ads_performance: adsPerformance } });
  } catch (e) {
    console.error("[SHOPEE ADS] Fatal error:", e);
    return errorResponse((e as Error).message, 500);
  }
});

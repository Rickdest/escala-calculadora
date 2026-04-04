import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  SHOPEE_HOST,
  corsHeaders,
  getAdsCredentials,
  generateSignWith,
  shopeeGetWith,
  errorResponse,
  jsonResponse,
} from "../_shared/shopee.ts";

/** YYYY-MM-DD — for database storage only */
const toISODateBR = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const y = parts.find(p => p.type === "year")!.value;
  const m = parts.find(p => p.type === "month")!.value;
  const d = parts.find(p => p.type === "day")!.value;
  return `${y}-${m}-${d}`;
};

/** DD-MM-YYYY — required by Shopee API */
const toDateStrBR = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const y = parts.find(p => p.type === "year")!.value;
  const m = parts.find(p => p.type === "month")!.value;
  const d = parts.find(p => p.type === "day")!.value;
  return `${d}-${m}-${y}`;
};

/** Convert ISO YYYY-MM-DD to DD-MM-YYYY for Shopee API */
const isoToDDMMYYYY = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
};

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

const ADS_LOOKBACK_DAYS = 28;
const MAX_CHUNK_DAYS = 28;

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
  if (normalized === 1 || normalized === "1" || normalized === "ongoing" || normalized === "active" || normalized === "running") return "active";
  if (normalized === 0 || normalized === "0" || normalized === 2 || normalized === "2" || normalized === "paused" || normalized === "pause" || normalized === "suspended") return "paused";
  if (normalized === 3 || normalized === "3" || normalized === 4 || normalized === "4" || normalized === "ended" || normalized === "closed" || normalized === "close" || normalized === "finished") return "ended";
  return "ended";
}

function extractCampaignSummaryMetrics(detail: any) {
  const perf = detail?.performance_info ?? detail?.performance ?? detail?.report_info ?? detail?.stats ?? detail?.data ?? null;
  const impressions = toFiniteNumber(perf?.impression, perf?.impressions, perf?.total_impression, perf?.total_impressions, detail?.impression, detail?.impressions, detail?.total_impression, detail?.total_impressions);
  const clicks = toFiniteNumber(perf?.click, perf?.clicks, perf?.total_click, perf?.total_clicks, detail?.click, detail?.clicks, detail?.total_click, detail?.total_clicks);
  const expense = toFiniteNumber(perf?.expense, perf?.cost, perf?.ad_spend, perf?.total_expense, perf?.total_cost, detail?.expense, detail?.cost, detail?.total_expense, detail?.total_cost);
  const gmv = toFiniteNumber(perf?.broad_gmv, perf?.broad_order_amount, perf?.gmv, perf?.total_gmv, perf?.total_broad_gmv, detail?.broad_gmv, detail?.broad_order_amount, detail?.gmv, detail?.total_gmv);
  const directGmv = toFiniteNumber(perf?.direct_gmv, perf?.direct_order_amount, perf?.total_direct_gmv, detail?.direct_gmv, detail?.direct_order_amount, detail?.total_direct_gmv);
  const orders = toFiniteNumber(perf?.broad_order, perf?.broad_order_num, perf?.orders, perf?.total_orders, perf?.total_broad_orders, detail?.broad_order, detail?.broad_order_num, detail?.orders, detail?.total_orders);
  const directOrders = toFiniteNumber(perf?.direct_order_num, perf?.direct_orders, perf?.total_direct_orders, detail?.direct_order_num, detail?.direct_orders, detail?.total_direct_orders);
  const avgPosition = (() => {
    const value = toFiniteNumber(perf?.average_position, perf?.avg_position, detail?.average_position, detail?.avg_position);
    return value > 0 ? value : null;
  })();
  const daysActive = toFiniteNumber(perf?.days_active, perf?.active_days, detail?.days_active, detail?.active_days);
  const hasData = [impressions, clicks, expense, gmv, directGmv, orders, directOrders].some((value) => value > 0);
  return { impressions, clicks, expense, gmv, direct_gmv: directGmv, orders, direct_orders: directOrders, avg_position: avgPosition, roas: expense > 0 ? gmv / expense : 0, direct_roas: expense > 0 ? directGmv / expense : 0, acos: gmv > 0 ? (expense / gmv) * 100 : 0, ctr: impressions > 0 ? (clicks / impressions) * 100 : 0, cost_per_order: orders > 0 ? expense / orders : 0, days_active: daysActive, hasData };
}

// Get ads credentials once at function level
const adsCreds = getAdsCredentials();
const adsGet = (path: string, accessToken: string, shopId: string | number, extra: Record<string, string> = {}) =>
  shopeeGetWith(adsCreds.partnerId, adsCreds.partnerKey, path, accessToken, shopId, extra);

async function refreshTokenIfNeeded(shopeeToken: any, _supabase: any): Promise<{ token: string; needs_reauth: boolean }> {
  const tokenAge = (Date.now() - new Date(shopeeToken.token_created_at).getTime()) / 1000;
  // Refresh preventivo: renovar quando faltam 24h (não 5min)
  if (tokenAge <= shopeeToken.expire_in - 86400) return { token: shopeeToken.access_token, needs_reauth: false };

  console.log("[SHOPEE ADS] Token near expiry, refreshing...");
  const refreshPath = "/api/v2/auth/access_token/get";
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = await generateSignWith(adsCreds.partnerId, adsCreds.partnerKey, refreshPath, timestamp);
  const refreshUrl = `${SHOPEE_HOST}${refreshPath}?partner_id=${adsCreds.partnerId}&timestamp=${timestamp}&sign=${sign}`;

  try {
    const refreshRes = await fetch(refreshUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: shopeeToken.refresh_token, shop_id: Number(shopeeToken.shop_id), partner_id: adsCreds.partnerId }),
    });

    const refreshData = await refreshRes.json();
    if (refreshData.access_token) {
      const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await supabaseAdmin.from("shopee_tokens").update({
        access_token: refreshData.access_token, refresh_token: refreshData.refresh_token,
        expire_in: refreshData.expire_in || 0, token_created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }).eq("id", shopeeToken.id);
      return { token: refreshData.access_token, needs_reauth: false };
    }
    console.error("[SHOPEE ADS] Refresh failed, no access_token in response:", JSON.stringify(refreshData).substring(0, 500));
    return { token: shopeeToken.access_token, needs_reauth: true };
  } catch (e) {
    console.error("[SHOPEE ADS] Refresh request failed:", e);
    return { token: shopeeToken.access_token, needs_reauth: true };
  }
}

function extractEntries(res: any): any[] {
  const resp = res?.response;
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  if (resp?.campaign_list && Array.isArray(resp.campaign_list)) {
    const allMetrics: any[] = [];
    for (const c of resp.campaign_list) {
      if (Array.isArray(c?.metrics_list)) allMetrics.push(...c.metrics_list);
    }
    if (allMetrics.length > 0) return allMetrics;
  }
  return resp?.entry_list || resp?.data || [];
}

function buildDateChunks(startDateISO: string, endDateISO: string): Array<{ startISO: string; endISO: string; startAPI: string; endAPI: string }> {
  const chunks: Array<{ startISO: string; endISO: string; startAPI: string; endAPI: string }> = [];
  let cur = new Date(startDateISO + "T12:00:00Z");
  const end = new Date(endDateISO + "T12:00:00Z");
  while (cur <= end) {
    const chunkEnd = new Date(cur.getTime() + (MAX_CHUNK_DAYS - 1) * 86400000);
    const actualEnd = chunkEnd > end ? end : chunkEnd;
    const sISO = cur.toISOString().substring(0, 10);
    const eISO = actualEnd.toISOString().substring(0, 10);
    chunks.push({ startISO: sISO, endISO: eISO, startAPI: isoToDDMMYYYY(sISO), endAPI: isoToDDMMYYYY(eISO) });
    cur = new Date(actualEnd.getTime() + 86400000);
  }
  return chunks;
}

async function fetchCampaignDaily(
  accessToken: string, shopId: string | number, campaignId: number,
  startDateISO: string, endDateISO: string, isFirst: boolean,
): Promise<any[]> {
  const dailyPath = "/api/v2/ads/get_product_campaign_daily_performance";
  const gmsPath = "/api/v2/ads/get_gms_campaign_performance";
  const chunks = buildDateChunks(startDateISO, endDateISO);

  const tryStrategy = async (label: string, fn: (chunk: any) => Promise<any>): Promise<any[]> => {
    const allEntries: any[] = [];
    for (const chunk of chunks) {
      try {
        const res = await fn(chunk);
        if (isFirst && chunks.indexOf(chunk) === 0) {
          console.log(`[SHOPEE ADS] [DEBUG] ${label} ${campaignId} (${chunk.startAPI}→${chunk.endAPI}): ${JSON.stringify(res).substring(0, 600)}`);
        }
        if (res?.error) return [];
        const entries = extractEntries(res);
        if (entries.length > 0) allEntries.push(...entries);
      } catch { return []; }
    }
    return allEntries;
  };

  let entries = await tryStrategy("S1-GET-list", (chunk) =>
    adsGet(dailyPath, accessToken, shopId, { campaign_id_list: String(campaignId), start_date: chunk.startAPI, end_date: chunk.endAPI })
  );
  if (entries.length > 0) return entries;

  entries = await tryStrategy("S2-GET-singular", (chunk) =>
    adsGet(dailyPath, accessToken, shopId, { campaign_id: String(campaignId), start_date: chunk.startAPI, end_date: chunk.endAPI })
  );
  if (entries.length > 0) return entries;

  entries = await tryStrategy("S3-GMS", (chunk) =>
    adsGet(gmsPath, accessToken, shopId, { campaign_id_list: String(campaignId), start_date: chunk.startAPI, end_date: chunk.endAPI })
  );
  if (entries.length > 0) return entries;

  return [];
}

async function fetchAdsPerformance(accessToken: string, shopId: string | number, filterItemId?: number) {
  const nowBR = new Date();
  const yesterdayBR = new Date(nowBR.getTime() - 24 * 60 * 60 * 1000);
  const startBR = new Date(nowBR.getTime() - ADS_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const startDateISO = toISODateBR(startBR);
  const endDateISO = toISODateBR(yesterdayBR);
  const startDateAPI = toDateStrBR(startBR);
  const endDateAPI = toDateStrBR(yesterdayBR);

  // Step 1: Campaign IDs
  let campaignIds: number[] = [];
  try {
    console.log("[SHOPEE ADS] === Step 1: get_product_level_campaign_id_list ===");
    const res = await adsGet("/api/v2/ads/get_product_level_campaign_id_list", accessToken, shopId);
    console.log(`[SHOPEE ADS] [DEBUG] Step 1 raw: ${JSON.stringify(res).substring(0, 1200)}`);
    const arr = res?.response?.campaign_list;
    if (Array.isArray(arr)) campaignIds = arr.map((c: any) => c.campaign_id).filter(Boolean);
    if (campaignIds.length === 0) {
      const fb = res?.response?.campaign_id_list;
      if (Array.isArray(fb)) campaignIds = fb;
    }
    console.log(`[SHOPEE ADS] ${campaignIds.length} campaign IDs`);
  } catch (e) { console.error("[SHOPEE ADS] Step 1 error:", e); }

  // Step 2: Campaign details
  const campaignDetails: any[] = [];
  const campaignToItem = new Map<number, { item_id: number; ad_name: string; status: number | null }>();

  if (campaignIds.length > 0) {
    console.log("[SHOPEE ADS] === Step 2: campaign settings (info_type 1,2) ===");
    for (let i = 0; i < campaignIds.length; i += 20) {
      const batch = campaignIds.slice(i, i + 20);
      try {
        const res = await adsGet(
          "/api/v2/ads/get_product_level_campaign_setting_info",
          accessToken, shopId,
          { campaign_id_list: batch.join(","), info_type_list: "1,2" }
        );
        if (i === 0) {
          console.log(`[SHOPEE ADS] [DEBUG] Step 2 raw (first 3): ${JSON.stringify(res?.response?.campaign_list?.slice(0, 3)).substring(0, 3000)}`);
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
            if (itemId) campaignToItem.set(d.campaign_id, { item_id: itemId, ad_name: adName, status: rawStatus });
          }
        }
      } catch (e) { console.error("[SHOPEE ADS] Step 2 batch error:", e); }
    }
    console.log(`[SHOPEE ADS] ${campaignDetails.length} campaign details, ${campaignToItem.size} with item_id`);
  }

  // Step 3: Daily performance (shop-level)
  let dailyEntries: any[] = [];
  const chunks = buildDateChunks(startDateISO, endDateISO);
  try {
    console.log(`[SHOPEE ADS] === Step 3: daily_performance ${startDateAPI} → ${endDateAPI} (${chunks.length} chunks) ===`);
    for (const chunk of chunks) {
      const res = await adsGet(
        "/api/v2/ads/get_all_cpc_ads_daily_performance",
        accessToken, shopId,
        { start_date: chunk.startAPI, end_date: chunk.endAPI }
      );
      if (chunks.indexOf(chunk) === 0) {
        console.log(`[SHOPEE ADS] [DEBUG] Step 3 chunk1 raw: ${JSON.stringify(res).substring(0, 1200)}`);
      }
      const raw = extractEntries(res);
      for (const e of raw) {
        dailyEntries.push({
          date: e.date || null,
          impressions: Number(e.impression || e.impressions || 0),
          clicks: Number(e.click || e.clicks || 0),
          expense: Number(e.expense || e.cost || 0),
          gmv: Number(e.broad_gmv || e.broad_order_amount || e.gmv || 0),
          orders: Number(e.broad_order || e.broad_order_num || e.orders || 0),
          roas: Number(e.broad_roi || e.broad_roas || e.roas || 0),
        });
      }
    }
  } catch (e) { console.error("[SHOPEE ADS] Step 3 error:", e); }
  console.log(`[SHOPEE ADS] ${dailyEntries.length} daily entries parsed`);

  // Step 4: Per-campaign performance
  const adsByCampaign: any[] = [];
  const campaignsForStep4 = campaignDetails.filter(c => {
    if (filterItemId && c.item_id !== filterItemId) return false;
    if (!c.item_id) return false;
    if (c.status === "ended" && c.campaign_id < 50000000) return false;
    return true;
  });
  const skippedOld = campaignDetails.filter(c => c.status === "ended" && c.campaign_id < 50000000).length;
  if (skippedOld > 0) console.log(`[SHOPEE ADS] Skipped ${skippedOld} old ended campaigns (id < 50M)`);
  console.log(`[SHOPEE ADS] === Step 4: per-campaign performance for ${campaignsForStep4.length} campaigns ===`);

  await delay(500);

  if (campaignsForStep4.length > 0) {
    const first = campaignsForStep4[0];
    const entries = await fetchCampaignDaily(accessToken, shopId, first.campaign_id, startDateISO, endDateISO, true);
    processCampaignEntries(first, entries, adsByCampaign, 1, campaignsForStep4.length);
  }

  for (let i = 1; i < campaignsForStep4.length; i += 3) {
    await delay(2000);
    const batch = campaignsForStep4.slice(i, i + 3);
    const promises = batch.map(async (c, batchIdx) => {
      const entries = await fetchCampaignDaily(accessToken, shopId, c.campaign_id, startDateISO, endDateISO, false);
      processCampaignEntries(c, entries, adsByCampaign, i + batchIdx + 1, campaignsForStep4.length);
    });
    await Promise.all(promises);
  }

  console.log(`[SHOPEE ADS] ${adsByCampaign.length} campaigns with data out of ${campaignsForStep4.length}`);

  // Step 5: Hourly performance for avg_position
  // Include campaigns with expense > 0 (not just active), and filter by itemId if refreshing a single product
  let campaignsForPosition = adsByCampaign.filter((c: any) => c.expense > 0);
  if (filterItemId) {
    campaignsForPosition = campaignsForPosition.filter((c: any) => c.item_id === filterItemId);
  }
  if (campaignsForPosition.length > 0) {
    console.log(`[SHOPEE ADS] === Step 5: hourly performance for avg_position (${campaignsForPosition.length} campaigns, filterItemId=${filterItemId || 'none'}) ===`);
    await delay(1000);
    let hourlyFound = 0;

    for (let i = 0; i < campaignsForPosition.length; i += 3) {
      if (i > 0) await delay(2000);
      const batch = activeCampaignsWithData.slice(i, i + 3);
      const promises = batch.map(async (c: any, batchIdx: number) => {
        try {
          const res = await adsGet(
            "/api/v2/ads/get_product_campaign_hourly_performance",
            accessToken, shopId,
            { campaign_id_list: String(c.campaign_id), performance_date: isoToDDMMYYYY(endDateISO) }
          );
          if (i === 0 && batchIdx === 0) {
            console.log('[SHOPEE ADS] hourly sample:', JSON.stringify(res).substring(0, 2000));
          }
          const resp = res?.response;
          let avgPos: number | null = null;
          if (resp?.campaign_list && Array.isArray(resp.campaign_list)) {
            for (const camp of resp.campaign_list) {
              const pos = Number(camp?.average_position || camp?.avg_position || 0);
              if (pos > 0) { avgPos = pos; break; }
              if (Array.isArray(camp?.metrics_list)) {
                let posSum = 0, posCount = 0;
                for (const m of camp.metrics_list) {
                  const mPos = Number(m?.average_position || m?.avg_position || 0);
                  if (mPos > 0) { posSum += mPos; posCount++; }
                }
                if (posCount > 0) { avgPos = Math.round((posSum / posCount) * 10) / 10; break; }
              }
            }
          } else if (resp) {
            const pos = Number(resp.average_position || resp.avg_position || 0);
            if (pos > 0) avgPos = pos;
          }
          if (avgPos !== null && avgPos > 0) {
            c.avg_position = avgPos;
            hourlyFound++;
          }
        } catch (e) {
          console.error(`[SHOPEE ADS] Step 5 hourly error for campaign ${c.campaign_id}:`, e);
        }
      });
      await Promise.all(promises);
    }
    console.log(`[SHOPEE ADS] Step 5: found avg_position for ${hourlyFound}/${activeCampaignsWithData.length} campaigns`);
  }

  // Step 6: Enrichment
  let hourlyPerformance: any[] = [];
  let recommendedItems: any[] = [];
  let shopToggles: any = null;

  try {
    console.log("[SHOPEE ADS] === Step 6: Enrichment ===");
    const activeCampaignsForKw = adsByCampaign.filter((c: any) => c.status === 'active' && c.item_id);
    if (activeCampaignsForKw.length > 0) {
      for (let i = 0; i < activeCampaignsForKw.length; i += 3) {
        if (i > 0) await delay(2000);
        const batch = activeCampaignsForKw.slice(i, i + 3);
        const promises = batch.map(async (c: any, batchIdx: number) => {
          try {
            const res = await adsGet("/api/v2/ads/get_recommended_keyword_list", accessToken, shopId, { item_id: String(c.item_id) });
            if (i === 0 && batchIdx === 0) console.log(`[SHOPEE ADS] keywords sample: ${JSON.stringify(res).substring(0, 600)}`);
            const kwList = res?.response?.keyword_list || res?.response?.data || [];
            if (Array.isArray(kwList) && kwList.length > 0) {
              c.keywords = kwList.slice(0, 10).map((kw: any) => ({
                keyword: kw.keyword || kw.search_term || kw.word || '',
                search_volume: Number(kw.search_volume || kw.volume || 0),
                suggested_bid: Number(kw.suggested_bid || kw.bid || kw.recommended_bid || 0),
                quality_score: kw.quality_score != null ? Number(kw.quality_score) : undefined,
              }));
            }
          } catch (e) { console.error(`[SHOPEE ADS] keywords error for item ${c.item_id}:`, e); }
        });
        await Promise.all(promises);
      }
    }

    await delay(500);
    try {
      const res = await adsGet("/api/v2/ads/get_all_cpc_ads_hourly_performance", accessToken, shopId, { performance_date: isoToDDMMYYYY(endDateISO) });
      const entries = extractEntries(res);
      if (entries.length > 0) {
        hourlyPerformance = entries.map((e: any) => ({
          hour: Number(e.hour ?? e.time ?? 0),
          impressions: Number(e.impression || e.impressions || 0),
          clicks: Number(e.click || e.clicks || 0),
          expense: Number(e.expense || e.cost || 0),
          gmv: Number(e.broad_gmv || e.broad_order_amount || e.gmv || 0),
          orders: Number(e.broad_order || e.orders || 0),
        }));
      }
    } catch (e) { console.error("[SHOPEE ADS] hourly error:", e); }

    await delay(500);
    try {
      const res = await adsGet("/api/v2/ads/get_recommended_item_list", accessToken, shopId);
      const items = res?.response?.item_list || res?.response?.data || [];
      if (Array.isArray(items)) {
        recommendedItems = items.slice(0, 10).map((it: any) => ({
          item_id: Number(it.item_id || 0),
          item_name: it.item_name || it.name || `Item #${it.item_id}`,
        }));
      }
    } catch (e) { console.error("[SHOPEE ADS] recommended items error:", e); }

    await delay(500);
    try {
      const res = await adsGet("/api/v2/ads/get_shop_toggle_info", accessToken, shopId);
      const resp = res?.response;
      if (resp) {
        shopToggles = {
          auto_top_up: resp.auto_top_up ?? resp.auto_recharge ?? false,
          campaign_surge: resp.campaign_surge ?? resp.surge ?? false,
        };
      }
    } catch (e) { console.error("[SHOPEE ADS] toggle error:", e); }
  } catch (e) { console.error("[SHOPEE ADS] Step 6 error:", e); }

  // Step 7: Balance
  let totalBalance: any = null;
  try {
    const res = await adsGet("/api/v2/ads/get_total_balance", accessToken, shopId);
    totalBalance = res?.response || null;
  } catch (e) { console.error("[SHOPEE ADS] Balance error:", e); }

  // Summary
  const summary = {
    total_impressions: 0, total_clicks: 0, total_expense: 0,
    total_gmv: 0, total_orders: 0, roas_geral: 0, ctr: 0, days: dailyEntries.length,
  };

  if (dailyEntries.length > 0) {
    for (const d of dailyEntries) {
      summary.total_impressions += d.impressions;
      summary.total_clicks += d.clicks;
      summary.total_expense += d.expense;
      summary.total_gmv += d.gmv;
      summary.total_orders += d.orders;
    }
  } else if (adsByCampaign.length > 0) {
    for (const c of adsByCampaign) {
      summary.total_impressions += c.impressions || 0;
      summary.total_clicks += c.clicks || 0;
      summary.total_expense += c.expense || 0;
      summary.total_gmv += c.gmv || 0;
      summary.total_orders += c.orders || 0;
    }
    summary.days = adsByCampaign.reduce((max: number, c: any) => Math.max(max, c.days_active || 0), 0);
  }

  summary.roas_geral = summary.total_expense > 0 ? summary.total_gmv / summary.total_expense : 0;
  summary.ctr = summary.total_impressions > 0 ? (summary.total_clicks / summary.total_impressions) * 100 : 0;

  console.log(`[SHOPEE ADS] === DONE === campaigns=${campaignIds.length} days=${dailyEntries.length} ads_by_campaign=${adsByCampaign.length} expense=${summary.total_expense} roas=${summary.roas_geral.toFixed(2)}`);

  return {
    daily_entries: dailyEntries, summary, campaign_details: campaignDetails,
    ads_by_campaign: adsByCampaign, total_balance: totalBalance,
    hourly_performance: hourlyPerformance,
    recommended_items: recommendedItems,
    shop_toggles: shopToggles,
    period_start: startDateISO, period_end: endDateISO, campaign_count: campaignIds.length,
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
    const gm = Number(e.broad_gmv || e.broad_order_amount || e.gmv || 0);
    const dgm = Number(e.direct_gmv || e.direct_order_amount || 0);
    const ord = Number(e.broad_order || e.broad_order_num || e.orders || 0);
    const dord = Number(e.direct_order || e.direct_order_num || e.direct_orders || 0);
    const pos = Number(e.average_position || e.avg_position || 0);

    totImp += imp; totClk += clk; totExp += exp; totGmv += gm; totDgmv += dgm; totOrd += ord; totDord += dord;
    if (pos > 0) { posWeighted += pos * imp; posImp += imp; }
    if (exp > 0) daysActive++;

    daily.push({
      date: e.date || "unknown", impressions: imp, clicks: clk,
      expense: Math.round(exp * 100) / 100, gmv: Math.round(gm * 100) / 100,
      roas: exp > 0 ? Math.round((gm / exp) * 100) / 100 : 0,
    });
  }

  const statusStr = campaign.status || 'ended';
  console.log(`[SHOPEE ADS] Campaign ${idx}/${total}: id=${campaign.campaign_id} item_id=${campaign.item_id} status=${statusStr} expense=${totExp.toFixed(2)} entries=${entries.length}${fallbackMetrics ? ' source=summary' : ''}`);

  result.push({
    campaign_id: campaign.campaign_id, item_id: campaign.item_id,
    item_name: campaign.ad_name || `Item #${campaign.item_id}`,
    status: statusStr, impressions: totImp, clicks: totClk,
    expense: Math.round(totExp * 100) / 100, gmv: Math.round(totGmv * 100) / 100,
    direct_gmv: Math.round(totDgmv * 100) / 100, orders: totOrd, direct_orders: totDord,
    avg_position: posImp > 0 ? Math.round((posWeighted / posImp) * 10) / 10 : (fallbackMetrics?.avg_position ?? null),
    roas: totExp > 0 ? Math.round((totGmv / totExp) * 100) / 100 : Math.round((fallbackMetrics?.roas ?? 0) * 100) / 100,
    broad_roi: entries.length > 0 ? Math.round(entries.reduce((s: number, e: any) => s + Number(e.broad_roi || 0), 0) / Math.max(entries.length, 1) * 100) / 100 : null,
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

    // Try to find ads-specific token first, fallback to any token
    let { data: tokens } = await supabase.from("shopee_tokens").select("*").eq("user_id", user.id).eq("app_type", "ads").limit(1);
    if (!tokens || tokens.length === 0) {
      const fallback = await supabase.from("shopee_tokens").select("*").eq("user_id", user.id).limit(1);
      tokens = fallback.data;
    }
    if (!tokens || tokens.length === 0) return errorResponse("No Shopee token found. Connect your shop first.");

    const shopeeToken = tokens[0];
    const { token: currentAccessToken, needs_reauth: refreshFailed } = await refreshTokenIfNeeded(shopeeToken, supabase);

    let filterItemId: number | undefined;
    try {
      if (req.method === "POST") {
        const body = await req.json().catch(() => ({}));
        if (body?.item_id) filterItemId = Number(body.item_id);
      }
    } catch { /* ignore */ }

    const adsPerformance = await fetchAdsPerformance(currentAccessToken, shopeeToken.shop_id, filterItemId);

    // Detect if API returned auth errors (0 campaigns despite having token)
    const authFailed = refreshFailed || (adsPerformance.campaign_count === 0 && adsPerformance.summary.total_impressions === 0);

    // Upsert ads_by_campaign to database
    if (adsPerformance.ads_by_campaign.length > 0) {
      const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

      if (!filterItemId) {
        await supabaseAdmin
          .from("shopee_ads_by_product")
          .delete()
          .eq("user_id", user.id)
          .neq("period_start", adsPerformance.period_start);
      }

      for (const c of adsPerformance.ads_by_campaign) {
        await supabaseAdmin.from("shopee_ads_by_product").upsert({
          user_id: user.id, shop_id: Number(shopeeToken.shop_id),
          campaign_id: c.campaign_id, item_id: c.item_id,
          item_name: c.item_name, status: c.status || 'ended',
          period_start: adsPerformance.period_start,
          period_end: adsPerformance.period_end, impressions: c.impressions,
          clicks: c.clicks, expense: c.expense, gmv: c.gmv,
          direct_gmv: c.direct_gmv, orders: c.orders, direct_orders: c.direct_orders,
          avg_position: c.avg_position, roas: c.roas, direct_roas: c.direct_roas,
          acos: c.acos, ctr: c.ctr, cost_per_order: c.cost_per_order,
          days_active: c.days_active, daily_data: c.daily,
          campaign_ids: [c.campaign_id], updated_at: new Date().toISOString(),
          keywords: c.keywords || [],
        }, { onConflict: "user_id,campaign_id,period_start" });
      }
      console.log(`[SHOPEE ADS] Upserted ${adsPerformance.ads_by_campaign.length} campaign records`);
    }

    return jsonResponse({ success: true, needs_reauth: refreshFailed, results: { ads_performance: { ...adsPerformance, needs_reauth: refreshFailed } } });
  } catch (e) {
    console.error("[SHOPEE ADS] Fatal error:", e);
    return errorResponse((e as Error).message, 500);
  }
});

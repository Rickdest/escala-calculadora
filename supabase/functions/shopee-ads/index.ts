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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const toDateStr = (ts: number) => {
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

async function fetchAdsChunkWithRetry(
  accessToken: string,
  shopId: string | number,
  startDate: string,
  endDate: string,
  maxRetries = 3
): Promise<{ data: any; rateLimited: boolean }> {
  const delays = [3000, 8000, 15000]; // More aggressive delays for dedicated function

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[SHOPEE ADS] Chunk ${startDate}-${endDate} attempt ${attempt}/${maxRetries}`);
      const result = await shopeePost(
        "/api/v2/ads/get_all_cpc_ads_daily_performance",
        accessToken,
        shopId,
        { start_date: startDate, end_date: endDate }
      );

      console.log(`[SHOPEE ADS] Response error field: ${result?.error || result?.msg || "none"}`);
      console.log(`[SHOPEE ADS] Response keys: ${Object.keys(result || {}).join(", ")}`);

      const err = result?.error || result?.msg || "";
      if (typeof err === "string" && err.toLowerCase().includes("rate_limit")) {
        const delayMs = delays[attempt - 1] || 15000;
        console.log(`[SHOPEE ADS] Rate limited, waiting ${delayMs}ms before retry...`);
        if (attempt < maxRetries) {
          await sleep(delayMs);
          continue;
        }
        return { data: result, rateLimited: true };
      }

      // Check if response has actual data
      const entries = result?.response?.entry_list || result?.response?.data || [];
      console.log(`[SHOPEE ADS] Chunk returned ${entries.length} entries`);

      return { data: result, rateLimited: false };
    } catch (e) {
      console.error(`[SHOPEE ADS] Chunk error attempt ${attempt}:`, e);
      if (attempt < maxRetries) {
        await sleep(delays[attempt - 1] || 15000);
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

  // Build 15-day chunks (only 2 calls instead of 5)
  const chunks: { start: string; end: string }[] = [];
  let cursor = thirtyDaysAgo;
  while (cursor < now) {
    const chunkEnd = Math.min(cursor + 15 * 24 * 60 * 60, now);
    chunks.push({ start: toDateStr(cursor), end: toDateStr(chunkEnd) });
    cursor = chunkEnd;
  }

  console.log(`[SHOPEE ADS] Fetching in ${chunks.length} chunks (15-day windows)`);

  let allEntries: any[] = [];
  let wasRateLimited = false;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`[SHOPEE ADS] Chunk ${i + 1}/${chunks.length}: ${chunk.start} → ${chunk.end}`);

    const { data, rateLimited } = await fetchAdsChunkWithRetry(
      accessToken,
      shopId,
      chunk.start,
      chunk.end
    );

    if (rateLimited) {
      wasRateLimited = true;
      console.log(`[SHOPEE ADS] Chunk ${chunk.start}-${chunk.end} rate-limited after all retries`);
    }

    if (data) {
      const entries = data?.response?.entry_list || data?.response?.data || [];
      allEntries = allEntries.concat(entries);
    }

    // 3s delay between chunks
    if (i < chunks.length - 1) {
      console.log("[SHOPEE ADS] Waiting 3s between chunks...");
      await sleep(3000);
    }
  }

  // Also try get_total_balance
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

  console.log(`[SHOPEE ADS] Total entries collected: ${allEntries.length}`);

  // Aggregate by item_id
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
    const itemId = String(entry.item_id || entry.campaign?.item_id || "");
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

    console.log(`[SHOPEE ADS] Starting ads-only sync for shop ${shopId}`);

    const adsPerformance = await fetchAdsPerformance(currentAccessToken, shopId);

    console.log(`[SHOPEE ADS] Done. Products: ${adsPerformance.ads_by_product.length}, Rate limited: ${adsPerformance.ads_rate_limited}`);

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

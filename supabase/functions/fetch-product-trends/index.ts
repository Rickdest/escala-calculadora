import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createLogger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const logger = createLogger("FETCH-TRENDS");

// Limpa o nome do produto para extrair keyword principal
function extractKeyword(productName: string): string {
  return productName
    .toLowerCase()
    .replace(/\b(kit|pacote|combo|unid|un|pç|pcs|peças|peca|pc)\b/gi, "")
    .replace(/\b\d+\s*(g|kg|ml|l|cm|mm|m)\b/gi, "")
    .replace(/\b\d+\s*x\s*\d+\b/gi, "")
    .replace(/\b\d+\b/g, "")
    .replace(/[^\p{L}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 4)
    .join(" ");
}

// Busca Google Trends (endpoint não-oficial) — interesse 12 meses
async function fetchGoogleTrends(keyword: string): Promise<
  Array<{ period_date: string; interest_score: number }>
> {
  const geo = "BR";
  const time = "today 12-m";

  // Step 1: explore — pega o widget token
  const exploreUrl = new URL("https://trends.google.com/trends/api/explore");
  exploreUrl.searchParams.set("hl", "pt-BR");
  exploreUrl.searchParams.set("tz", "180");
  exploreUrl.searchParams.set(
    "req",
    JSON.stringify({
      comparisonItem: [{ keyword, geo, time }],
      category: 0,
      property: "",
    }),
  );

  const exploreRes = await fetch(exploreUrl.toString(), {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      Accept: "application/json",
    },
  });

  if (!exploreRes.ok) {
    logger.warn("trends_explore_failed", { status: exploreRes.status });
    throw new Error(`Google Trends explore HTTP ${exploreRes.status}`);
  }

  const exploreText = await exploreRes.text();
  const cleanedExplore = exploreText.replace(/^\)\]\}'\,?\n?/, "");
  const exploreData = JSON.parse(cleanedExplore);
  const widget = exploreData.widgets?.find(
    (w: any) => w.id === "TIMESERIES",
  );
  if (!widget?.token || !widget?.request) {
    throw new Error("Google Trends widget missing");
  }

  // Step 2: multiline — pega a série temporal
  const multiUrl = new URL(
    "https://trends.google.com/trends/api/widgetdata/multiline",
  );
  multiUrl.searchParams.set("hl", "pt-BR");
  multiUrl.searchParams.set("tz", "180");
  multiUrl.searchParams.set("req", JSON.stringify(widget.request));
  multiUrl.searchParams.set("token", widget.token);

  const multiRes = await fetch(multiUrl.toString(), {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      Accept: "application/json",
    },
  });

  if (!multiRes.ok) {
    throw new Error(`Google Trends multiline HTTP ${multiRes.status}`);
  }

  const multiText = await multiRes.text();
  const cleanedMulti = multiText.replace(/^\)\]\}'\,?\n?/, "");
  const multiData = JSON.parse(cleanedMulti);

  const timelineData = multiData.default?.timelineData ?? [];
  return timelineData.map((point: any) => ({
    period_date: new Date(parseInt(point.time) * 1000)
      .toISOString()
      .split("T")[0],
    interest_score: point.value?.[0] ?? 0,
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !serviceKey || !anonKey) {
      throw new Error("Missing supabase env vars");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cliente com JWT do usuário para validar identidade
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const productId = body?.productId as string | undefined;
    const force = Boolean(body?.force);

    if (!productId || typeof productId !== "string") {
      return new Response(
        JSON.stringify({ error: "productId é obrigatório" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Busca produto
    const { data: product, error: productErr } = await admin
      .from("products")
      .select("id, name, user_id, shopee_item_id")
      .eq("id", productId)
      .eq("user_id", userId)
      .maybeSingle();

    if (productErr || !product) {
      return new Response(
        JSON.stringify({ error: "Produto não encontrado" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Cache de 7 dias
    if (!force) {
      const { data: recent } = await admin
        .from("product_trends")
        .select("captured_at")
        .eq("product_id", productId)
        .order("captured_at", { ascending: false })
        .limit(1);

      if (recent && recent.length > 0) {
        const lastCapture = new Date(recent[0].captured_at);
        const ageMs = Date.now() - lastCapture.getTime();
        if (ageMs < 7 * 24 * 60 * 60 * 1000) {
          return new Response(
            JSON.stringify({
              cached: true,
              captured_at: recent[0].captured_at,
            }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
      }
    }

    const keyword = extractKeyword(product.name);
    if (!keyword) {
      return new Response(
        JSON.stringify({ error: "Não foi possível extrair palavra-chave" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    logger.info("fetch_start", { productId, keyword });

    let googleSaved = 0;
    let googleError: string | null = null;

    // Google Trends com retry
    try {
      let trendsData: Array<{ period_date: string; interest_score: number }> =
        [];
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          trendsData = await fetchGoogleTrends(keyword);
          break;
        } catch (e) {
          if (attempt === 2) throw e;
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        }
      }

      if (trendsData.length > 0) {
        // Limpa registros antigos para esta combinação
        await admin
          .from("product_trends")
          .delete()
          .eq("product_id", productId)
          .eq("source", "google_trends")
          .eq("keyword", keyword);

        const rows = trendsData.map((p) => ({
          user_id: userId,
          product_id: productId,
          source: "google_trends",
          keyword,
          period_date: p.period_date,
          interest_score: p.interest_score,
        }));

        const { error: insertErr } = await admin
          .from("product_trends")
          .insert(rows);

        if (insertErr) {
          logger.error("google_insert_failed", { error: insertErr.message });
          googleError = insertErr.message;
        } else {
          googleSaved = rows.length;
        }
      }
    } catch (e) {
      googleError = e instanceof Error ? e.message : String(e);
      logger.warn("google_trends_failed", { error: googleError });
    }

    // Reaproveita keywords Shopee (já em shopee_ads_by_product)
    let shopeeSaved = 0;
    if (product.shopee_item_id) {
      const { data: adsRow } = await admin
        .from("shopee_ads_by_product")
        .select("keywords, period_end")
        .eq("user_id", userId)
        .eq("item_id", product.shopee_item_id)
        .order("period_end", { ascending: false })
        .limit(1)
        .maybeSingle();

      const keywords = (adsRow?.keywords as any[]) ?? [];
      if (keywords.length > 0) {
        const today = new Date().toISOString().split("T")[0];

        await admin
          .from("product_trends")
          .delete()
          .eq("product_id", productId)
          .eq("source", "shopee_keywords");

        const rows = keywords.slice(0, 30).map((k: any) => ({
          user_id: userId,
          product_id: productId,
          source: "shopee_keywords",
          keyword: String(k.keyword ?? k.term ?? "").slice(0, 200),
          period_date: today,
          search_volume: Number(k.search_volume ?? k.volume ?? 0),
          suggested_bid: Number(k.suggested_bid ?? k.bid ?? 0),
          competition_level:
            k.competition_level ?? k.competition ?? null,
          metadata: { quality_score: k.quality_score ?? null },
        }));

        const validRows = rows.filter((r) => r.keyword.length > 0);
        if (validRows.length > 0) {
          const { error: shopeeErr } = await admin
            .from("product_trends")
            .insert(validRows);
          if (!shopeeErr) shopeeSaved = validRows.length;
        }
      }
    }

    logger.info("fetch_done", {
      productId,
      keyword,
      googleSaved,
      shopeeSaved,
      googleError,
    });

    return new Response(
      JSON.stringify({
        cached: false,
        keyword,
        google_saved: googleSaved,
        shopee_saved: shopeeSaved,
        google_error: googleError,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error("unhandled", { error: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

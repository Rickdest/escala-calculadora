import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TrendPoint = {
  period_date: string;
  interest_score: number | null;
};

export type ShopeeKeyword = {
  keyword: string;
  search_volume: number;
  suggested_bid: number;
  competition_level: string | null;
  quality_score: number | null;
};

export type RelatedKeyword = {
  keyword: string;
  value: number;
  isBreakout: boolean;
  formattedValue: string;
};

export type RegionEntry = {
  region: string;
  value: number;
};

export type SeasonalMonth = {
  month: number; // 1-12
  avg: number; // 0-100
  samples: number;
};

export type TrendDiagnostic = {
  direction: "up" | "down" | "stable";
  slopePct: number;
  peakMonth: string | null;
  valleyMonth: string | null;
  nextPeakIn: number | null;
  hasSeasonality: boolean;
};

export function useProductTrend(productId: string | undefined) {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [lastCapture, setLastCapture] = useState<string | null>(null);
  const [googleSeries, setGoogleSeries] = useState<TrendPoint[]>([]);
  const [shopeeKeywords, setShopeeKeywords] = useState<ShopeeKeyword[]>([]);
  const [keyword, setKeyword] = useState<string | null>(null);
  const [keywordOverride, setKeywordOverrideState] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [lowQuality, setLowQuality] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [relatedTop, setRelatedTop] = useState<RelatedKeyword[]>([]);
  const [relatedRising, setRelatedRising] = useState<RelatedKeyword[]>([]);
  const [regions, setRegions] = useState<RegionEntry[]>([]);
  const [seasonalCycle, setSeasonalCycle] = useState<SeasonalMonth[]>([]);
  const [autoSimplified, setAutoSimplified] = useState(false);

  const loadFromDb = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setError(null);
    try {
      const [{ data, error: dbErr }, { data: prod }] = await Promise.all([
        supabase
          .from("product_trends")
          .select("*")
          .eq("product_id", productId)
          .order("period_date", { ascending: true }),
        supabase
          .from("products")
          .select("trend_keyword_override")
          .eq("id", productId)
          .maybeSingle(),
      ]);

      if (dbErr) throw dbErr;

      setKeywordOverrideState(prod?.trend_keyword_override ?? null);

      const rows = data ?? [];
      setHasData(rows.length > 0);

      const google = rows
        .filter((r) => r.source === "google_trends")
        .map((r) => ({
          period_date: r.period_date,
          interest_score:
            r.interest_score !== null ? Number(r.interest_score) : null,
        }));
      setGoogleSeries(google);

      // Detecta baixa qualidade localmente também (evita gráfico falso após reload)
      if (google.length > 0) {
        const zeros = google.filter((p) => (p.interest_score ?? 0) === 0).length;
        setLowQuality(zeros / google.length > 0.8);
      }

      // Marker meta_no_data: extrai sugestões e flag de low quality persistidas
      const metaRow = rows.find((r) => r.source === "meta_no_data");
      if (metaRow) {
        const meta = (metaRow.metadata as Record<string, unknown> | null) ?? {};
        if (Array.isArray(meta.suggestions)) {
          setSuggestions(meta.suggestions as string[]);
        }
        setLowQuality(true);
        setAutoSimplified(Boolean(meta.auto_simplified));
      } else if (google.length === 0) {
        // Sem dados e sem marker → reseta lowQuality
        setLowQuality(false);
      }

      const shopee = rows
        .filter((r) => r.source === "shopee_keywords")
        .map((r) => ({
          keyword: r.keyword,
          search_volume: Number(r.search_volume ?? 0),
          suggested_bid: Number(r.suggested_bid ?? 0),
          competition_level: r.competition_level,
        }))
        .sort((a, b) => b.search_volume - a.search_volume);
      setShopeeKeywords(shopee);

      const parseRelated = (source: string): RelatedKeyword[] =>
        rows
          .filter((r) => r.source === source)
          .map((r) => {
            const meta = (r.metadata as Record<string, unknown> | null) ?? {};
            return {
              keyword: r.keyword,
              value: Number(r.interest_score ?? 0),
              isBreakout: Boolean(meta.is_breakout),
              formattedValue: String(meta.formatted_value ?? ""),
            };
          })
          .sort((a, b) => b.value - a.value);

      setRelatedTop(parseRelated("google_related_top"));
      setRelatedRising(parseRelated("google_related_rising"));

      // Regiões (top estados)
      const regionsParsed: RegionEntry[] = rows
        .filter((r) => r.source === "google_geo")
        .map((r) => ({
          region: r.keyword,
          value: Number(r.interest_score ?? 0),
        }))
        .sort((a, b) => b.value - a.value);
      setRegions(regionsParsed);

      // Ciclo sazonal (média mês a mês)
      const cycleParsed: SeasonalMonth[] = rows
        .filter((r) => r.source === "google_seasonal_cycle")
        .map((r) => {
          const meta = (r.metadata as Record<string, unknown> | null) ?? {};
          return {
            month: Number(meta.month ?? new Date(r.period_date).getUTCMonth() + 1),
            avg: Number(r.interest_score ?? 0),
            samples: Number(meta.samples ?? 0),
          };
        })
        .sort((a, b) => a.month - b.month);
      setSeasonalCycle(cycleParsed);

      if (rows.length > 0) {
        const captured = rows
          .map((r) => r.captured_at)
          .sort()
          .reverse()[0];
        setLastCapture(captured ?? null);
        // Prioriza keyword da timeline real; senão usa do meta_no_data; senão da primeira linha
        const kwSource =
          rows.find((r) => r.source === "google_trends")?.keyword ??
          rows.find((r) => r.source === "meta_no_data")?.keyword ??
          rows[0].keyword;
        setKeyword(kwSource);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productId]);

  const refresh = useCallback(
    async (force = true, overrideKeyword?: string) => {
      if (!productId) return;
      setRefreshing(true);
      setError(null);
      setSuggestions([]);
      try {
        const payload: Record<string, unknown> = { productId, force };
        if (overrideKeyword !== undefined) {
          payload.keywordOverride = overrideKeyword;
        }
        const { data, error: fnErr } = await supabase.functions.invoke(
          "fetch-product-trends",
          { body: payload },
        );
        if (fnErr) throw fnErr;
        if (data?.error) throw new Error(data.error);

        if (
          data?.google_saved === 0 &&
          data?.shopee_saved === 0 &&
          data?.google_error
        ) {
          if (data.rate_limited) {
            setError(
              "Muitas consultas em sequência. Aguarde alguns minutos e tente novamente.",
            );
          } else {
            setError(
              "Não foi possível buscar dados de tendência agora. Tente novamente em instantes.",
            );
          }
        }

        // Recarrega banco PRIMEIRO (atualiza tudo a partir do que foi persistido,
        // incluindo meta_no_data com sugestões).
        await loadFromDb();

        // Depois sobrescreve com dados frescos da resposta — garantimos que sugestões,
        // keyword e flags chegam mesmo se o banco não persistiu nada (safety net).
        if (Array.isArray(data?.suggestions) && data.suggestions.length > 0) {
          setSuggestions(data.suggestions);
        }
        if (typeof data?.low_quality === "boolean") {
          setLowQuality(data.low_quality);
        }
        if (typeof data?.keyword === "string" && data.keyword) {
          setKeyword(data.keyword);
        }
        if (typeof data?.auto_simplified === "boolean") {
          setAutoSimplified(data.auto_simplified);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setRefreshing(false);
      }
    },
    [productId, loadFromDb],
  );

  const setKeywordOverride = useCallback(
    async (newKeyword: string) => {
      const trimmed = newKeyword.trim();
      if (!productId) return;
      // refresh já persiste no backend e re-busca
      await refresh(true, trimmed);
    },
    [productId, refresh],
  );

  useEffect(() => {
    loadFromDb();
  }, [loadFromDb]);

  // Diagnóstico
  const diagnostic: TrendDiagnostic | null = (() => {
    if (googleSeries.length < 4) return null;

    const values = googleSeries
      .map((p) => p.interest_score)
      .filter((v): v is number => v !== null);
    if (values.length < 4) return null;

    const recent = values.slice(-12);
    const n = recent.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = recent.reduce((a, b) => a + b, 0);
    const sumXY = recent.reduce((acc, y, x) => acc + x * y, 0);
    const sumX2 = recent.reduce((acc, _, x) => acc + x * x, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avg = sumY / n;
    const slopePct = avg > 0 ? (slope / avg) * 100 : 0;

    let direction: "up" | "down" | "stable" = "stable";
    if (slopePct > 2) direction = "up";
    else if (slopePct < -2) direction = "down";

    let peakIdx = 0;
    let valleyIdx = 0;
    googleSeries.forEach((p, i) => {
      if (
        p.interest_score !== null &&
        (googleSeries[peakIdx].interest_score ?? 0) < p.interest_score
      ) {
        peakIdx = i;
      }
      if (
        p.interest_score !== null &&
        (googleSeries[valleyIdx].interest_score ?? 100) > p.interest_score
      ) {
        valleyIdx = i;
      }
    });

    const formatMonth = (dateStr: string) => {
      const d = new Date(dateStr);
      return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    };

    const max = Math.max(...values);
    const min = Math.min(...values);
    const hasSeasonality = max > 0 && (max - min) / max > 0.4;

    let nextPeakIn: number | null = null;
    if (hasSeasonality) {
      const peakDate = new Date(googleSeries[peakIdx].period_date);
      const today = new Date();
      const nextYearPeak = new Date(
        today.getFullYear(),
        peakDate.getMonth(),
        peakDate.getDate(),
      );
      if (nextYearPeak < today) {
        nextYearPeak.setFullYear(today.getFullYear() + 1);
      }
      nextPeakIn = Math.round(
        (nextYearPeak.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );
    }

    return {
      direction,
      slopePct,
      peakMonth: formatMonth(googleSeries[peakIdx].period_date),
      valleyMonth: formatMonth(googleSeries[valleyIdx].period_date),
      nextPeakIn,
      hasSeasonality,
    };
  })();

  return {
    loading,
    refreshing,
    hasData,
    lastCapture,
    googleSeries,
    shopeeKeywords,
    keyword,
    keywordOverride,
    diagnostic,
    error,
    lowQuality,
    suggestions,
    relatedTop,
    relatedRising,
    regions,
    seasonalCycle,
    autoSimplified,
    refresh,
    setKeywordOverride,
  };
}

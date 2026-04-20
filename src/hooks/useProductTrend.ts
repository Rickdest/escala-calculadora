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
};

export type TrendDiagnostic = {
  direction: "up" | "down" | "stable";
  slopePct: number;
  peakMonth: string | null;
  valleyMonth: string | null;
  nextPeakIn: number | null; // dias até próximo pico esperado
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
  const [error, setError] = useState<string | null>(null);

  const loadFromDb = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbErr } = await supabase
        .from("product_trends")
        .select("*")
        .eq("product_id", productId)
        .order("period_date", { ascending: true });

      if (dbErr) throw dbErr;

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

      if (rows.length > 0) {
        const captured = rows
          .map((r) => r.captured_at)
          .sort()
          .reverse()[0];
        setLastCapture(captured ?? null);
        setKeyword(rows.find((r) => r.source === "google_trends")?.keyword ?? rows[0].keyword);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productId]);

  const refresh = useCallback(
    async (force = true) => {
      if (!productId) return;
      setRefreshing(true);
      setError(null);
      try {
        const { data, error: fnErr } = await supabase.functions.invoke(
          "fetch-product-trends",
          { body: { productId, force } },
        );
        if (fnErr) throw fnErr;
        if (data?.error) throw new Error(data.error);
        await loadFromDb();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setRefreshing(false);
      }
    },
    [productId, loadFromDb],
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

    // Slope dos últimos 90 dias (12 pontos semanais ou 3 mensais)
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

    // Pico e vale
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

    // Sazonalidade: variação > 40%
    const max = Math.max(...values);
    const min = Math.min(...values);
    const hasSeasonality = max > 0 && (max - min) / max > 0.4;

    // Próximo pico: assume mesmo mês do ano anterior
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
    diagnostic,
    error,
    refresh,
  };
}

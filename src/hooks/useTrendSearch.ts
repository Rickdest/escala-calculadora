import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  TrendPoint,
  RelatedKeyword,
  RegionEntry,
  SeasonalMonth,
} from "@/hooks/useProductTrend";

export type TrendSearchResult = {
  keyword: string;
  googleSeries: TrendPoint[];
  relatedTop: RelatedKeyword[];
  relatedRising: RelatedKeyword[];
  regions: RegionEntry[];
  seasonalCycle: SeasonalMonth[];
  lowQuality: boolean;
  suggestions: string[];
  rateLimited: boolean;
};

const CACHE_MAX = 5;

export function useTrendSearch() {
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<TrendSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, TrendSearchResult>>(new Map());

  const search = useCallback(async (rawKeyword: string) => {
    const keyword = rawKeyword.trim().toLowerCase();
    if (!keyword || keyword.length < 2) {
      setError("Digite ao menos 2 caracteres");
      return;
    }

    // Cache hit
    const cached = cacheRef.current.get(keyword);
    if (cached) {
      setResult(cached);
      setError(null);
      return;
    }

    setSearching(true);
    setError(null);

    try {
      const { data, error: fnErr } = await supabase.functions.invoke(
        "fetch-product-trends",
        { body: { keywordOnly: keyword } },
      );
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);

      if (data?.rate_limited) {
        setError(
          "O Google Trends está limitando requisições. Tente novamente em alguns minutos.",
        );
        setSearching(false);
        return;
      }

      const series: TrendPoint[] = Array.isArray(data?.google_series)
        ? data.google_series.map((p: { period_date: string; interest_score: number | null }) => ({
            period_date: p.period_date,
            interest_score: p.interest_score !== null ? Number(p.interest_score) : null,
          }))
        : [];

      const cycle: SeasonalMonth[] = Array.isArray(data?.seasonal_cycle)
        ? data.seasonal_cycle.map((c: { month: number; avg: number; samples: number }) => ({
            month: Number(c.month),
            avg: Number(c.avg),
            samples: Number(c.samples),
          }))
        : [];

      const parseRelated = (arr: unknown): RelatedKeyword[] =>
        Array.isArray(arr)
          ? arr.map((r) => {
              const it = r as { keyword: string; value: number; isBreakout: boolean; formattedValue: string };
              return {
                keyword: String(it.keyword),
                value: Number(it.value ?? 0),
                isBreakout: Boolean(it.isBreakout),
                formattedValue: String(it.formattedValue ?? ""),
              };
            })
          : [];

      const regions: RegionEntry[] = Array.isArray(data?.regions)
        ? data.regions.map((r: { region: string; value: number }) => ({
            region: String(r.region),
            value: Number(r.value ?? 0),
          }))
        : [];

      const newResult: TrendSearchResult = {
        keyword: String(data?.keyword ?? keyword),
        googleSeries: series,
        relatedTop: parseRelated(data?.related_top),
        relatedRising: parseRelated(data?.related_rising),
        regions,
        seasonalCycle: cycle,
        lowQuality: Boolean(data?.low_quality),
        suggestions: Array.isArray(data?.suggestions) ? data.suggestions : [],
        rateLimited: false,
      };

      // LRU cache
      cacheRef.current.set(keyword, newResult);
      if (cacheRef.current.size > CACHE_MAX) {
        const firstKey = cacheRef.current.keys().next().value;
        if (firstKey) cacheRef.current.delete(firstKey);
      }

      setResult(newResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSearching(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { searching, result, error, search, clear };
}

import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  TrendPoint,
  RelatedKeyword,
  RegionEntry,
  SeasonalMonth,
} from "@/hooks/useProductTrend";

export type Timeframe = "now 7-d" | "today 1-m" | "today 3-m" | "today 12-m" | "today 5-y";
export type GeoResolution = "REGION" | "CITY" | "COUNTRY";

export type ComparisonPoint = { period_date: string; values: (number | null)[] };

export type ForecastPoint = { month: number; predicted: number; year: number };

export type SlopeLabel = "subindo_forte" | "subindo" | "estavel" | "caindo" | "caindo_forte";

export type TrendSearchResult = {
  keyword: string;
  timeframe: Timeframe;
  geoResolution: GeoResolution;
  compareKeywords: string[];
  googleSeries: TrendPoint[];
  comparisonSeries: ComparisonPoint[] | null;
  relatedTop: RelatedKeyword[];
  relatedRising: RelatedKeyword[];
  regions: RegionEntry[];
  seasonalCycle: SeasonalMonth[];
  // Insights derivados
  momentum30d: number | null;
  slope: number;
  slopeLabel: SlopeLabel;
  peakMonth: number | null;
  stockRecommendation: string | null;
  forecast3m: ForecastPoint[];
  categoryHint: string | null;
  // Status
  lowQuality: boolean;
  suggestions: string[];
  rateLimited: boolean;
};

export type SearchOptions = {
  timeframe?: Timeframe;
  geoResolution?: GeoResolution;
  compareKeywords?: string[];
};

const CACHE_MAX = 8;

function makeCacheKey(kw: string, opts: SearchOptions): string {
  const tf = opts.timeframe ?? "today 5-y";
  const geo = opts.geoResolution ?? "REGION";
  const compare = (opts.compareKeywords ?? []).map((k) => k.trim().toLowerCase()).filter(Boolean).sort().join("|");
  return `${kw}::${tf}::${geo}::${compare}`;
}

export function useTrendSearch() {
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<TrendSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, TrendSearchResult>>(new Map());

  const search = useCallback(async (rawKeyword: string, opts: SearchOptions = {}) => {
    const keyword = rawKeyword.trim().toLowerCase();
    if (!keyword || keyword.length < 2) {
      setError("Digite ao menos 2 caracteres");
      return;
    }

    const timeframe = opts.timeframe ?? "today 5-y";
    const geoResolution = opts.geoResolution ?? "REGION";
    const compareKeywords = (opts.compareKeywords ?? [])
      .map((k) => k.trim())
      .filter(Boolean)
      .slice(0, 4);

    const cacheKey = makeCacheKey(keyword, { timeframe, geoResolution, compareKeywords });
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setResult(cached);
      setError(null);
      return;
    }

    setSearching(true);
    setError(null);

    try {
      const { data, error: fnErr } = await supabase.functions.invoke("fetch-product-trends", {
        body: {
          keywordOnly: keyword,
          timeframe,
          geoResolution,
          compareKeywords,
        },
      });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);

      if (data?.rate_limited) {
        setError("O Google Trends está limitando requisições. Tente novamente em alguns minutos.");
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

      const comparisonSeries: ComparisonPoint[] | null = Array.isArray(data?.comparison_series)
        ? data.comparison_series.map((p: { period_date: string; values: (number | null)[] }) => ({
            period_date: p.period_date,
            values: Array.isArray(p.values) ? p.values.map((v) => (v === null ? null : Number(v))) : [],
          }))
        : null;

      const forecast3m: ForecastPoint[] = Array.isArray(data?.forecast_3m)
        ? data.forecast_3m.map((f: { month: number; predicted: number; year: number }) => ({
            month: Number(f.month),
            predicted: Number(f.predicted),
            year: Number(f.year),
          }))
        : [];

      const newResult: TrendSearchResult = {
        keyword: String(data?.keyword ?? keyword),
        timeframe,
        geoResolution,
        compareKeywords,
        googleSeries: series,
        comparisonSeries,
        relatedTop: parseRelated(data?.related_top),
        relatedRising: parseRelated(data?.related_rising),
        regions,
        seasonalCycle: cycle,
        momentum30d: data?.momentum_30d !== null && data?.momentum_30d !== undefined ? Number(data.momentum_30d) : null,
        slope: Number(data?.slope ?? 0),
        slopeLabel: (data?.slope_label as SlopeLabel) ?? "estavel",
        peakMonth: data?.peak_month !== null && data?.peak_month !== undefined ? Number(data.peak_month) : null,
        stockRecommendation: typeof data?.stock_recommendation === "string" ? data.stock_recommendation : null,
        forecast3m,
        categoryHint: typeof data?.category_hint === "string" ? data.category_hint : null,
        lowQuality: Boolean(data?.low_quality),
        suggestions: Array.isArray(data?.suggestions) ? data.suggestions : [],
        rateLimited: false,
      };

      cacheRef.current.set(cacheKey, newResult);
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

  // Carrega geo separada (cidades ou países) — lazy ao expandir accordion
  const fetchGeoVariant = useCallback(
    async (
      kw: string,
      geoResolution: GeoResolution,
      timeframe: Timeframe = "today 5-y",
    ): Promise<RegionEntry[]> => {
      const { data, error: fnErr } = await supabase.functions.invoke("fetch-product-trends", {
        body: { keywordOnly: kw, timeframe, geoResolution, compareKeywords: [] },
      });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);
      return Array.isArray(data?.regions)
        ? data.regions.map((r: { region: string; value: number }) => ({
            region: String(r.region),
            value: Number(r.value ?? 0),
          }))
        : [];
    },
    [],
  );

  const clear = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { searching, result, error, search, clear, fetchGeoVariant };
}

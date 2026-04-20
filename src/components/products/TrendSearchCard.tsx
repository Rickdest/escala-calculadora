import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Sparkles,
  X,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Plus,
  MapPin,
  Globe,
  Lightbulb,
  Tag,
} from "lucide-react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useTrendSearch,
  type Timeframe,
  type SlopeLabel,
} from "@/hooks/useTrendSearch";
import type { RegionEntry } from "@/hooks/useProductTrend";
import { SeasonalCycleChart } from "@/components/products/trend/SeasonalCycleChart";
import { RegionsBreakdown } from "@/components/products/trend/RegionsBreakdown";
import { cn } from "@/lib/utils";

const SUGGESTIONS = ["vestido feminino", "tênis nike", "cropped", "kit maquiagem", "tapete sala"];

const TIMEFRAMES: Array<{ id: Timeframe; label: string }> = [
  { id: "now 7-d", label: "7d" },
  { id: "today 1-m", label: "30d" },
  { id: "today 3-m", label: "90d" },
  { id: "today 12-m", label: "12m" },
  { id: "today 5-y", label: "5a" },
];

const COMPARE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(var(--muted-foreground))",
];

const SLOPE_META: Record<SlopeLabel, { label: string; icon: typeof TrendingUp; cls: string }> = {
  subindo_forte: { label: "Em alta forte", icon: TrendingUp, cls: "text-success bg-success/10 border-success/30" },
  subindo: { label: "Crescendo", icon: TrendingUp, cls: "text-success bg-success/10 border-success/20" },
  estavel: { label: "Estável", icon: Minus, cls: "text-text-3 bg-surface-2 border-border" },
  caindo: { label: "Caindo", icon: TrendingDown, cls: "text-warning bg-warning/10 border-warning/20" },
  caindo_forte: { label: "Caindo forte", icon: TrendingDown, cls: "text-destructive bg-destructive/10 border-destructive/30" },
};

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function TrendSearchCard() {
  const [input, setInput] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [timeframe, setTimeframe] = useState<Timeframe>("today 5-y");
  const [compareTerms, setCompareTerms] = useState<string[]>([]);
  const [compareInput, setCompareInput] = useState("");
  const [showCompare, setShowCompare] = useState(false);

  const [showCities, setShowCities] = useState(false);
  const [showCountries, setShowCountries] = useState(false);
  const [cities, setCities] = useState<RegionEntry[] | null>(null);
  const [countries, setCountries] = useState<RegionEntry[] | null>(null);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(false);

  const { searching, result, error, search, clear, fetchGeoVariant } = useTrendSearch();

  const handleSubmit = (kw?: string) => {
    const term = (kw ?? input).trim();
    if (!term) return;
    setInput(term);
    // Reset geo lazy state ao mudar busca
    setCities(null);
    setCountries(null);
    setShowCities(false);
    setShowCountries(false);
    search(term, { timeframe, compareKeywords: compareTerms });
  };

  const handleClear = () => {
    setInput("");
    setCompareTerms([]);
    setCompareInput("");
    setShowCompare(false);
    setCities(null);
    setCountries(null);
    setShowCities(false);
    setShowCountries(false);
    clear();
  };

  const handleTimeframeChange = (tf: Timeframe) => {
    if (tf === timeframe) return;
    setTimeframe(tf);
    if (input.trim()) {
      setCities(null);
      setCountries(null);
      search(input.trim(), { timeframe: tf, compareKeywords: compareTerms });
    }
  };

  const handleAddCompare = () => {
    const term = compareInput.trim();
    if (!term || compareTerms.includes(term) || term === input.trim()) return;
    if (compareTerms.length >= 4) return;
    const next = [...compareTerms, term];
    setCompareTerms(next);
    setCompareInput("");
    if (input.trim()) {
      setCities(null);
      setCountries(null);
      search(input.trim(), { timeframe, compareKeywords: next });
    }
  };

  const handleRemoveCompare = (term: string) => {
    const next = compareTerms.filter((t) => t !== term);
    setCompareTerms(next);
    if (input.trim()) {
      setCities(null);
      setCountries(null);
      search(input.trim(), { timeframe, compareKeywords: next });
    }
  };

  // Lazy load: cidades
  useEffect(() => {
    if (!showCities || cities !== null || !result) return;
    let cancelled = false;
    setLoadingCities(true);
    fetchGeoVariant(result.keyword, "CITY", result.timeframe)
      .then((r) => !cancelled && setCities(r))
      .catch(() => !cancelled && setCities([]))
      .finally(() => !cancelled && setLoadingCities(false));
    return () => {
      cancelled = true;
    };
  }, [showCities, cities, result, fetchGeoVariant]);

  // Lazy load: países
  useEffect(() => {
    if (!showCountries || countries !== null || !result) return;
    let cancelled = false;
    setLoadingCountries(true);
    fetchGeoVariant(result.keyword, "COUNTRY", result.timeframe)
      .then((r) => !cancelled && setCountries(r))
      .catch(() => !cancelled && setCountries([]))
      .finally(() => !cancelled && setLoadingCountries(false));
    return () => {
      cancelled = true;
    };
  }, [showCountries, countries, result, fetchGeoVariant]);

  // Stats da timeline principal
  const stats = useMemo(() => {
    if (!result || result.googleSeries.length === 0) return null;
    const values = result.googleSeries
      .map((p) => p.interest_score)
      .filter((v): v is number => v !== null);
    if (values.length === 0) return null;
    return {
      max: Math.max(...values),
      avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
    };
  }, [result]);

  // Dados pra gráfico de comparação multi-linha (mescla principal + extras)
  const compareChartData = useMemo(() => {
    if (!result || !result.comparisonSeries || result.compareKeywords.length === 0) return null;
    return result.comparisonSeries.map((p) => {
      const obj: Record<string, number | null | string> = { period_date: p.period_date };
      const allKeys = [result.keyword, ...result.compareKeywords];
      allKeys.forEach((k, i) => {
        obj[`v${i}`] = p.values[i] ?? null;
      });
      return obj;
    });
  }, [result]);

  // Dados pra gráfico com forecast (linha real + projeção tracejada)
  const chartWithForecast = useMemo(() => {
    if (!result || result.googleSeries.length === 0) return null;
    const real = result.googleSeries.map((p) => ({
      period_date: p.period_date,
      real: p.interest_score,
      forecast: null as number | null,
    }));
    if (result.forecast3m.length === 0 || result.timeframe !== "today 5-y") return real;
    // Conecta o último ponto real à projeção
    const lastReal = real[real.length - 1];
    const projection: Array<{ period_date: string; real: null; forecast: number }> = [];
    result.forecast3m.forEach((f) => {
      const dateStr = `${f.year}-${String(f.month).padStart(2, "0")}-15`;
      projection.push({ period_date: dateStr, real: null, forecast: f.predicted });
    });
    return [
      ...real,
      // Bridge: último real serve como início da projeção
      { period_date: lastReal.period_date, real: null, forecast: lastReal.real ?? 0 },
      ...projection,
    ];
  }, [result]);

  const slopeMeta = result ? SLOPE_META[result.slopeLabel] : null;

  return (
    <div className="surface-card p-4 sm:p-5 border-l-2 border-l-primary/60 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground leading-tight">
              Pesquisar tendência de mercado
            </p>
            <p className="text-[11px] text-text-3 mt-0.5 leading-tight">
              Descubra o interesse por qualquer produto — sem precisar cadastrar.
            </p>
          </div>
        </div>
        {result && (
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="text-text-3 hover:text-foreground transition-colors flex-shrink-0"
            aria-label={collapsed ? "Expandir" : "Recolher"}
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        )}
      </div>

      {!collapsed && (
        <>
          {/* Search input */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-3" />
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="Ex: vestido feminino, tênis nike..."
                disabled={searching}
                className="pl-10 h-10 bg-surface-2 border-border rounded-lg focus:border-primary"
              />
            </div>
            {result && !searching && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                className="h-10 px-3 border-border bg-surface-2"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
            <Button
              onClick={() => handleSubmit()}
              disabled={searching || input.trim().length < 2}
              className="h-10 px-4 bg-primary hover:bg-primary/90 gap-1.5"
            >
              {searching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline text-xs font-bold">Analisando</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs font-bold">Analisar</span>
                </>
              )}
            </Button>
          </div>

          {/* Compare row */}
          {(showCompare || compareTerms.length > 0) && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {compareTerms.map((t, i) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-2.5 py-1 border"
                  style={{
                    backgroundColor: `${COMPARE_COLORS[(i + 1) % COMPARE_COLORS.length]}15`,
                    borderColor: `${COMPARE_COLORS[(i + 1) % COMPARE_COLORS.length]}40`,
                    color: COMPARE_COLORS[(i + 1) % COMPARE_COLORS.length],
                  }}
                >
                  {t}
                  <button onClick={() => handleRemoveCompare(t)} className="opacity-70 hover:opacity-100">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {compareTerms.length < 4 && (
                <div className="flex items-center gap-1">
                  <Input
                    value={compareInput}
                    onChange={(e) => setCompareInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCompare();
                      }
                    }}
                    placeholder="comparar com..."
                    className="h-7 text-[11px] w-32 bg-surface-2 border-border"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleAddCompare}
                    disabled={!compareInput.trim()}
                    className="h-7 px-2"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {!showCompare && compareTerms.length === 0 && result && (
            <button
              onClick={() => setShowCompare(true)}
              className="mt-2 text-[11px] text-primary hover:underline inline-flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Comparar com outro termo
            </button>
          )}

          {/* Timeframe chips */}
          {(result || searching) && (
            <div className="mt-3 flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-text-3 uppercase tracking-wide font-bold mr-1">Janela:</span>
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.id}
                  onClick={() => handleTimeframeChange(tf.id)}
                  disabled={searching}
                  className={cn(
                    "text-[11px] font-bold rounded-md px-2 py-1 border transition-colors disabled:opacity-50",
                    timeframe === tf.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-surface-2 text-text-2 border-border hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          )}

          {/* Suggestions row (estado inicial) */}
          {!result && !searching && !error && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="text-[10px] text-text-3 uppercase tracking-wide font-bold">Tente:</span>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSubmit(s)}
                  className="text-[11px] text-text-2 hover:text-primary bg-surface-2 hover:bg-primary/10 border border-border hover:border-primary/40 rounded-full px-2.5 py-1 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Error */}
          {error && !searching && (
            <div className="mt-3 flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Loading skeleton */}
          {searching && (
            <div className="mt-4 space-y-3 animate-pulse">
              <div className="h-10 bg-surface-2 rounded-lg" />
              <div className="h-32 bg-surface-2 rounded-lg" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-24 bg-surface-2 rounded-lg" />
                <div className="h-24 bg-surface-2 rounded-lg" />
              </div>
            </div>
          )}

          {/* Results */}
          {result && !searching && (
            <div className="mt-4 space-y-3 animate-fade-up">
              {/* Result header com keyword + categoria + estatísticas */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[11px] text-text-3">
                    Resultado para{" "}
                    <span className="text-foreground font-semibold">"{result.keyword}"</span>
                  </p>
                  {result.categoryHint && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
                      <Tag className="w-2.5 h-2.5" />
                      {result.categoryHint}
                    </span>
                  )}
                </div>
                {stats && (
                  <div className="flex items-center gap-3 text-[10px] font-mono font-mono-num text-text-3">
                    <span>
                      pico <span className="text-foreground font-bold">{stats.max}</span>
                    </span>
                    <span>
                      média <span className="text-foreground font-bold">{stats.avg}</span>
                    </span>
                  </div>
                )}
              </div>

              {result.lowQuality && result.googleSeries.length === 0 ? (
                <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
                  <div className="flex items-start gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-foreground">
                      <p className="font-semibold">Sem dados suficientes para esse termo.</p>
                      <p className="text-text-3 mt-0.5">Tente uma versão mais genérica.</p>
                    </div>
                  </div>
                  {result.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {result.suggestions.map((s) => (
                        <button
                          key={s}
                          onClick={() => handleSubmit(s)}
                          className="text-[11px] bg-surface-2 hover:bg-primary/10 hover:text-primary border border-border hover:border-primary/40 rounded-full px-2.5 py-1 transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* INSIGHT BOX */}
                  {(slopeMeta || result.momentum30d !== null || result.stockRecommendation) && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {/* Tendência */}
                      {slopeMeta && (
                        <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-2", slopeMeta.cls)}>
                          <slopeMeta.icon className="w-4 h-4 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-wide opacity-70 font-bold leading-none">Tendência</p>
                            <p className="text-xs font-bold mt-0.5 truncate">{slopeMeta.label}</p>
                          </div>
                        </div>
                      )}
                      {/* Momentum */}
                      {result.momentum30d !== null && (
                        <div
                          className={cn(
                            "flex items-center gap-2 rounded-lg border px-3 py-2",
                            result.momentum30d >= 10
                              ? "text-success bg-success/10 border-success/20"
                              : result.momentum30d <= -10
                                ? "text-destructive bg-destructive/10 border-destructive/20"
                                : "text-text-3 bg-surface-2 border-border",
                          )}
                        >
                          {result.momentum30d >= 0 ? (
                            <TrendingUp className="w-4 h-4 flex-shrink-0" />
                          ) : (
                            <TrendingDown className="w-4 h-4 flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-wide opacity-70 font-bold leading-none">Momento</p>
                            <p className="text-xs font-bold mt-0.5 font-mono font-mono-num">
                              {result.momentum30d > 0 ? "+" : ""}
                              {result.momentum30d}% vs período anterior
                            </p>
                          </div>
                        </div>
                      )}
                      {/* Recomendação */}
                      {result.stockRecommendation && (
                        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                          <Lightbulb className="w-4 h-4 flex-shrink-0 text-primary" />
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-wide text-primary/80 font-bold leading-none">Sazonalidade</p>
                            <p className="text-xs font-semibold mt-0.5 text-foreground leading-tight">
                              {result.stockRecommendation}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* GRÁFICO PRINCIPAL: comparação OU série única com forecast */}
                  {compareChartData && compareChartData.length > 0 ? (
                    <div className="bg-surface-2/40 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="section-label">Comparação de termos</p>
                        <span className="text-[10px] text-text-3">
                          {[result.keyword, ...result.compareKeywords].length} termos
                        </span>
                      </div>
                      <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={compareChartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                            <XAxis
                              dataKey="period_date"
                              tickFormatter={(d) => {
                                const date = new Date(d);
                                return result.timeframe === "today 5-y"
                                  ? date.toLocaleDateString("pt-BR", { year: "2-digit" })
                                  : date.toLocaleDateString("pt-BR", { month: "short" });
                              }}
                              stroke="hsl(var(--muted-foreground))"
                              fontSize={9}
                              tickLine={false}
                              axisLine={false}
                              interval="preserveStartEnd"
                              minTickGap={40}
                            />
                            <YAxis
                              domain={[0, 100]}
                              stroke="hsl(var(--muted-foreground))"
                              fontSize={9}
                              tickLine={false}
                              axisLine={false}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                                fontSize: "11px",
                              }}
                              labelFormatter={(d) =>
                                new Date(d).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
                              }
                            />
                            {[result.keyword, ...result.compareKeywords].map((kw, i) => (
                              <Line
                                key={kw}
                                type="monotone"
                                dataKey={`v${i}`}
                                name={kw}
                                stroke={COMPARE_COLORS[i % COMPARE_COLORS.length]}
                                strokeWidth={1.8}
                                dot={false}
                                connectNulls
                              />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      {/* Legenda */}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {[result.keyword, ...result.compareKeywords].map((kw, i) => (
                          <div key={kw} className="flex items-center gap-1.5">
                            <div
                              className="w-2.5 h-2.5 rounded-sm"
                              style={{ backgroundColor: COMPARE_COLORS[i % COMPARE_COLORS.length] }}
                            />
                            <span className="text-[10px] text-text-2">{kw}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    chartWithForecast && (
                      <div className="bg-surface-2/40 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="section-label">
                            Interesse —{" "}
                            {TIMEFRAMES.find((t) => t.id === result.timeframe)?.label === "5a"
                              ? "últimos 5 anos"
                              : `últimos ${TIMEFRAMES.find((t) => t.id === result.timeframe)?.label}`}
                          </p>
                          {result.forecast3m.length > 0 && result.timeframe === "today 5-y" && (
                            <span className="text-[10px] text-text-3 inline-flex items-center gap-1">
                              <span className="w-3 border-t border-dashed border-primary" /> projeção 3m
                            </span>
                          )}
                        </div>
                        <div className="h-32">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartWithForecast} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                              <defs>
                                <linearGradient id="trendGradSearch" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <XAxis
                                dataKey="period_date"
                                tickFormatter={(d) => {
                                  const date = new Date(d);
                                  return result.timeframe === "today 5-y"
                                    ? date.toLocaleDateString("pt-BR", { year: "2-digit" })
                                    : date.toLocaleDateString("pt-BR", { month: "short", day: "2-digit" });
                                }}
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={9}
                                tickLine={false}
                                axisLine={false}
                                interval="preserveStartEnd"
                                minTickGap={40}
                              />
                              <YAxis
                                domain={[0, 100]}
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={9}
                                tickLine={false}
                                axisLine={false}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "hsl(var(--card))",
                                  border: "1px solid hsl(var(--border))",
                                  borderRadius: "8px",
                                  fontSize: "11px",
                                }}
                                labelFormatter={(d) =>
                                  new Date(d).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
                                }
                                formatter={(v: number, name: string) => [
                                  v,
                                  name === "real" ? "Interesse" : "Projeção",
                                ]}
                              />
                              {stats && (
                                <ReferenceLine
                                  y={stats.avg}
                                  stroke="hsl(var(--muted-foreground))"
                                  strokeDasharray="3 3"
                                  strokeOpacity={0.5}
                                />
                              )}
                              <Area
                                type="monotone"
                                dataKey="real"
                                stroke="hsl(var(--primary))"
                                strokeWidth={1.8}
                                fill="url(#trendGradSearch)"
                                connectNulls={false}
                              />
                              <Area
                                type="monotone"
                                dataKey="forecast"
                                stroke="hsl(var(--primary))"
                                strokeWidth={1.5}
                                strokeDasharray="4 3"
                                fill="hsl(var(--primary))"
                                fillOpacity={0.05}
                                connectNulls={false}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )
                  )}

                  {/* Seasonal cycle + Regions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {result.seasonalCycle.length >= 6 && (
                      <SeasonalCycleChart cycle={result.seasonalCycle} />
                    )}
                    {result.regions.length > 0 && (
                      <RegionsBreakdown regions={result.regions} />
                    )}
                  </div>

                  {/* Accordions: Cidades + Países */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Cidades */}
                    <div className="surface-card p-0 overflow-hidden">
                      <button
                        onClick={() => setShowCities((v) => !v)}
                        className="w-full flex items-center justify-between gap-2 px-4 py-3 hover:bg-surface-2/40 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-primary" />
                          <span className="text-xs font-bold text-foreground">Top cidades (BR)</span>
                        </div>
                        <ChevronDown className={cn("w-4 h-4 text-text-3 transition-transform", showCities && "rotate-180")} />
                      </button>
                      {showCities && (
                        <div className="px-4 pb-4 border-t border-border/50">
                          {loadingCities && (
                            <div className="flex items-center gap-2 py-3 text-xs text-text-3">
                              <Loader2 className="w-3 h-3 animate-spin" /> Carregando cidades...
                            </div>
                          )}
                          {!loadingCities && cities && cities.length === 0 && (
                            <p className="text-xs text-text-3 py-3">Sem dados de cidade pra esse termo.</p>
                          )}
                          {!loadingCities && cities && cities.length > 0 && (
                            <div className="pt-3">
                              <RegionsBreakdownInline regions={cities} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Países */}
                    <div className="surface-card p-0 overflow-hidden">
                      <button
                        onClick={() => setShowCountries((v) => !v)}
                        className="w-full flex items-center justify-between gap-2 px-4 py-3 hover:bg-surface-2/40 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-primary" />
                          <span className="text-xs font-bold text-foreground">Interesse mundial</span>
                        </div>
                        <ChevronDown className={cn("w-4 h-4 text-text-3 transition-transform", showCountries && "rotate-180")} />
                      </button>
                      {showCountries && (
                        <div className="px-4 pb-4 border-t border-border/50">
                          {loadingCountries && (
                            <div className="flex items-center gap-2 py-3 text-xs text-text-3">
                              <Loader2 className="w-3 h-3 animate-spin" /> Carregando países...
                            </div>
                          )}
                          {!loadingCountries && countries && countries.length === 0 && (
                            <p className="text-xs text-text-3 py-3">Sem dados internacionais pra esse termo.</p>
                          )}
                          {!loadingCountries && countries && countries.length > 0 && (
                            <div className="pt-3">
                              <RegionsBreakdownInline regions={countries} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Related rising + top */}
                  {(result.relatedRising.length > 0 || result.relatedTop.length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {result.relatedRising.length > 0 && (
                        <div className="surface-card p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Flame className="w-4 h-4 text-warning" />
                            <p className="section-label">Em alta agora</p>
                          </div>
                          <div className="space-y-1.5">
                            {result.relatedRising.slice(0, 5).map((r) => (
                              <button
                                key={r.keyword}
                                onClick={() => handleSubmit(r.keyword)}
                                className="w-full flex items-center justify-between gap-2 text-left py-1.5 px-2 rounded hover:bg-surface-2 transition-colors group"
                              >
                                <span className="text-xs text-foreground truncate group-hover:text-primary">
                                  {r.keyword}
                                </span>
                                <span
                                  className={cn(
                                    "text-[10px] font-mono font-mono-num font-bold flex-shrink-0 px-1.5 py-0.5 rounded",
                                    r.isBreakout
                                      ? "bg-warning/15 text-warning"
                                      : "bg-success/15 text-success",
                                  )}
                                >
                                  {r.formattedValue || `+${r.value}%`}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {result.relatedTop.length > 0 && (
                        <div className="surface-card p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-4 h-4 text-primary" />
                            <p className="section-label">Buscas populares</p>
                          </div>
                          <div className="space-y-1.5">
                            {result.relatedTop.slice(0, 5).map((r) => (
                              <button
                                key={r.keyword}
                                onClick={() => handleSubmit(r.keyword)}
                                className="w-full flex items-center justify-between gap-2 text-left py-1.5 px-2 rounded hover:bg-surface-2 transition-colors group"
                              >
                                <span className="text-xs text-foreground truncate group-hover:text-primary">
                                  {r.keyword}
                                </span>
                                <span className="text-[10px] font-mono font-mono-num text-text-3 flex-shrink-0">
                                  {r.value}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Variante inline da listagem regional (sem o card wrapper) — para uso dentro dos accordions
function RegionsBreakdownInline({ regions }: { regions: RegionEntry[] }) {
  if (regions.length === 0) return null;
  const top = regions.slice(0, 10);
  const max = Math.max(...top.map((r) => r.value), 1);

  return (
    <div className="space-y-2">
      {top.map((r, i) => {
        const pct = (r.value / max) * 100;
        return (
          <div key={`${r.region}-${i}`} className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-foreground truncate">
                <span className="text-micro text-muted-foreground/60 font-mono mr-2">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {r.region}
              </span>
              <span className="font-mono text-micro text-muted-foreground shrink-0">{r.value}</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary/60 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

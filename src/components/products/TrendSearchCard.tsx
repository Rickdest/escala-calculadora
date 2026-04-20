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
  Activity,
  Calendar,
  Crosshair,
  BarChart3,
  Gauge,
  Target,
  Zap,
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
  type VolatilityLabel,
  type CurrentMonthStatus,
  type MarketSaturation,
} from "@/hooks/useTrendSearch";
import type { RegionEntry } from "@/hooks/useProductTrend";
import { SeasonalCycleChart } from "@/components/products/trend/SeasonalCycleChart";
import { RegionsBreakdown } from "@/components/products/trend/RegionsBreakdown";
import { cn } from "@/lib/utils";

const SUGGESTIONS = ["vestido feminino", "tênis nike", "cropped", "kit maquiagem", "tapete sala"];

const TIMEFRAMES: Array<{ id: Timeframe; label: string; longLabel: string }> = [
  { id: "now 7-d", label: "7d", longLabel: "últimos 7 dias" },
  { id: "today 1-m", label: "30d", longLabel: "últimos 30 dias" },
  { id: "today 3-m", label: "90d", longLabel: "últimos 90 dias" },
  { id: "today 12-m", label: "12m", longLabel: "últimos 12 meses" },
  { id: "today 5-y", label: "5a", longLabel: "últimos 5 anos" },
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
  caindo: { label: "Em queda", icon: TrendingDown, cls: "text-warning bg-warning/10 border-warning/20" },
  caindo_forte: { label: "Caindo forte", icon: TrendingDown, cls: "text-destructive bg-destructive/10 border-destructive/30" },
};

const VOLATILITY_META: Record<VolatilityLabel, { label: string; cls: string }> = {
  estavel: { label: "Estável", cls: "text-success" },
  volatil: { label: "Volátil", cls: "text-warning" },
  muito_volatil: { label: "Muito volátil", cls: "text-destructive" },
};

const MONTH_STATUS_META: Record<CurrentMonthStatus, { label: string; cls: string }> = {
  pico: { label: "Pico sazonal", cls: "text-success" },
  alta: { label: "Alta procura", cls: "text-success" },
  neutro: { label: "Demanda neutra", cls: "text-text-2" },
  baixa: { label: "Baixa procura", cls: "text-warning" },
};

const SATURATION_META: Record<MarketSaturation, { label: string; cls: string }> = {
  morno: { label: "Mercado morno", cls: "text-text-3" },
  ativo: { label: "Mercado ativo", cls: "text-primary" },
  quente: { label: "Mercado quente", cls: "text-warning" },
};

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MONTH_NAMES_LONG = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function getScoreMeta(score: number): { label: string; cls: string; barCls: string } {
  if (score >= 75) return { label: "Mercado quente", cls: "text-success", barCls: "bg-success" };
  if (score >= 55) return { label: "Em equilíbrio", cls: "text-primary", barCls: "bg-primary" };
  if (score >= 35) return { label: "Mercado morno", cls: "text-warning", barCls: "bg-warning" };
  return { label: "Mercado fraco", cls: "text-destructive", barCls: "bg-destructive" };
}

function formatTickByTimeframe(d: string, timeframe: Timeframe): string {
  const date = new Date(d);
  const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  switch (timeframe) {
    case "now 7-d":
      return `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()}`;
    case "today 1-m":
      return `${date.getUTCDate()}/${MONTH_NAMES[date.getUTCMonth()].toLowerCase()}`;
    case "today 3-m":
      return `${MONTH_NAMES[date.getUTCMonth()].toLowerCase()} ${date.getUTCDate()}`;
    case "today 12-m":
      return `${MONTH_NAMES[date.getUTCMonth()].toLowerCase()}/${String(date.getUTCFullYear()).slice(-2)}`;
    case "today 5-y":
    default:
      return String(date.getUTCFullYear()).slice(-2);
  }
}

export interface TrendSearchCardProps {
  /** Pré-popula input e dispara busca automática no mount */
  initialKeyword?: string;
  /** "embedded" remove header e borda lateral (uso dentro de outras telas) */
  variant?: "standalone" | "embedded";
  /** Slot opcional renderizado abaixo dos accordions (ex: keywords Shopee) */
  extraFooter?: React.ReactNode;
  /** Remove a borda externa e padding pra evitar duplicação visual quando aninhado em outro card/Collapsible */
  hideOuterBorder?: boolean;
  /** Esconde o header interno (Sparkles + "Análise de demanda") — útil quando o trigger pai já tem título */
  hideHeader?: boolean;
}

export function TrendSearchCard({
  initialKeyword,
  variant = "standalone",
  extraFooter,
  hideOuterBorder = false,
  hideHeader = false,
}: TrendSearchCardProps = {}) {
  const [input, setInput] = useState(initialKeyword ?? "");
  const [collapsed, setCollapsed] = useState(false);
  const [timeframe, setTimeframe] = useState<Timeframe>("today 12-m");
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

  // Auto-search no mount quando initialKeyword é fornecido
  useEffect(() => {
    const kw = initialKeyword?.trim();
    if (!kw) return;
    setInput(kw);
    search(kw, { timeframe: "today 12-m", compareKeywords: [] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKeyword]);

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
    const max = Math.max(...values);
    return {
      max,
      avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      yMax: max < 50 ? Math.min(100, Math.ceil((max + 10) / 10) * 10) : 100,
    };
  }, [result]);

  // Dados pra gráfico de comparação multi-linha (mescla principal + extras)
  const compareChartData = useMemo(() => {
    if (!result || !result.comparisonSeries || result.compareKeywords.length === 0) return null;
    return result.comparisonSeries.map((p) => {
      const obj: Record<string, number | null | string> = { period_date: p.period_date };
      const allKeys = [result.keyword, ...result.compareKeywords];
      allKeys.forEach((_k, i) => {
        obj[`v${i}`] = p.values[i] ?? null;
      });
      return obj;
    });
  }, [result]);

  // Dados pra gráfico série única — sempre tem chave `real`; só anexa forecast quando 5y
  const chartData = useMemo(() => {
    if (!result || result.googleSeries.length === 0) return null;
    const real = result.googleSeries.map((p) => ({
      period_date: p.period_date,
      real: p.interest_score,
    }));
    return real;
  }, [result]);

  const chartForecastData = useMemo(() => {
    if (!result || result.timeframe !== "today 5-y") return null;
    if (!result.forecast3m.length || !result.googleSeries.length) return null;
    const lastPoint = result.googleSeries[result.googleSeries.length - 1];
    const projection = result.forecast3m.map((f) => ({
      period_date: `${f.year}-${String(f.month).padStart(2, "0")}-15`,
      forecast: f.predicted,
    }));
    return [
      { period_date: lastPoint.period_date, forecast: lastPoint.interest_score ?? 0 },
      ...projection,
    ];
  }, [result]);

  const slopeMeta = result ? SLOPE_META[result.slopeLabel] : null;
  const scoreMeta = result?.marketScore !== null && result?.marketScore !== undefined ? getScoreMeta(result.marketScore) : null;
  const currentTfLong = TIMEFRAMES.find((t) => t.id === (result?.timeframe ?? timeframe))?.longLabel ?? "";

  // Banner de ação consolidado
  const actionInsight = useMemo(() => {
    if (!result) return null;
    const parts: string[] = [];
    if (slopeMeta) {
      if (result.slopeLabel === "subindo_forte" || result.slopeLabel === "subindo") {
        parts.push(`Demanda em **${slopeMeta.label.toLowerCase()}**.`);
      } else if (result.slopeLabel === "estavel") {
        parts.push("Demanda **estável** ao longo do período.");
      } else {
        parts.push(`Atenção: demanda **${slopeMeta.label.toLowerCase()}**.`);
      }
    }
    if (result.currentMonthStatus) {
      const cm = MONTH_STATUS_META[result.currentMonthStatus.status];
      parts.push(`Estamos em **${cm.label.toLowerCase()}** ${result.currentMonthStatus.deltaPct >= 0 ? "+" : ""}${result.currentMonthStatus.deltaPct}% vs média anual.`);
    }
    if (result.peakMonth && result.bestGrowthMonth) {
      parts.push(`Pico anual em **${MONTH_NAMES_LONG[result.peakMonth - 1]}**, comece a estocar em **${MONTH_NAMES_LONG[result.bestGrowthMonth - 1]}**.`);
    }
    return parts.join(" ");
  }, [result, slopeMeta]);

  const isEmbedded = variant === "embedded";

  return (
    <div className={cn(
      "animate-fade-up",
      hideOuterBorder ? "p-0" : "surface-card p-4 sm:p-5",
      !isEmbedded && !hideOuterBorder && "border-l-4 border-l-primary/70",
    )}>
      {/* Header (oculto em embedded) */}
      {!isEmbedded && !hideHeader && (
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/25 to-primary/5 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground leading-tight">
                Análise de demanda
              </p>
              <p className="text-[11px] text-text-3 mt-0.5 leading-tight">
                Descubra o potencial de qualquer produto antes de cadastrar.
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
      )}

      {!collapsed && (
        <>
          {/* Search input */}
          {/* Search input — oculto em modo embedded (termo gerenciado pela tela pai) */}
          {!isEmbedded && (
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
          )}

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
              <Plus className="w-3 h-3" /> Comparar com outro produto
            </button>
          )}

          {/* Timeframe chips */}
          {(result || searching) && (
            <div className="mt-3 flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-text-3 uppercase tracking-wide font-bold mr-1">Período:</span>
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

          {/* Loading skeleton — espelha layout final */}
          {searching && (
            <div className="mt-4 space-y-3 animate-pulse">
              {/* Hero score skeleton */}
              <div className="h-20 bg-surface-2 rounded-xl" />
              {/* 6 cards skeleton */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-16 bg-surface-2 rounded-lg" />
                ))}
              </div>
              {/* Chart skeleton */}
              <div className="h-40 bg-surface-2 rounded-lg" />
            </div>
          )}

          {/* Results */}
          {result && !searching && (
            <div className="mt-4 space-y-3 animate-fade-up">
              {/* Result header */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[11px] text-text-3">
                    Análise:{" "}
                    <span className="text-foreground font-semibold">{result.keyword}</span>
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
                      demanda máx <span className="text-foreground font-bold">{stats.max}</span>
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
                  {/* HERO: Potencial de mercado — compacto horizontal */}
                  {scoreMeta && result.marketScore !== null && (
                    <div className="rounded-xl border border-border bg-gradient-to-br from-surface-2/60 to-surface-2/20 p-3 sm:p-4">
                      <div className="flex items-center gap-3 sm:gap-4">
                        {/* Gauge circular SVG */}
                        <div className="relative w-16 h-16 flex-shrink-0">
                          <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                            <circle
                              cx="32"
                              cy="32"
                              r="28"
                              fill="none"
                              stroke="hsl(var(--surface-2))"
                              strokeWidth="6"
                            />
                            <circle
                              cx="32"
                              cy="32"
                              r="28"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="6"
                              strokeLinecap="round"
                              strokeDasharray={`${(result.marketScore / 100) * 175.93} 175.93`}
                              className={cn("transition-all duration-700", scoreMeta.cls)}
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className={cn("text-lg font-black font-mono font-mono-num", scoreMeta.cls)}>
                              {result.marketScore}
                            </span>
                          </div>
                        </div>
                        {/* Texto + barra */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Gauge className={cn("w-3.5 h-3.5 flex-shrink-0", scoreMeta.cls)} />
                              <span className="text-[10px] uppercase tracking-wide font-bold text-text-3 truncate">
                                Potencial de mercado
                              </span>
                            </div>
                            <span
                              className="text-[9px] text-text-3/70 hidden sm:inline cursor-help"
                              title="Score 0-100 calculado a partir de momento, volatilidade, sazonalidade e demanda relativa. Estimativa composta."
                            >
                              estimativa
                            </span>
                          </div>
                          <p className={cn("text-sm font-bold mb-2", scoreMeta.cls)}>
                            {scoreMeta.label}
                          </p>
                          <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all duration-700", scoreMeta.barCls)}
                              style={{ width: `${result.marketScore}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* GRID 6 mini-cards de insights */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {/* Tendência */}
                    {slopeMeta && (
                      <InsightCard
                        icon={Zap}
                        label="Tendência"
                        value={slopeMeta.label}
                        cls={slopeMeta.cls}
                      />
                    )}
                    {/* Momento */}
                    {result.momentum30d !== null && (
                      <InsightCard
                        icon={result.momentum30d >= 0 ? TrendingUp : TrendingDown}
                        label="Momento"
                        value={`${result.momentum30d > 0 ? "+" : ""}${result.momentum30d}% no período`}
                        cls={cn(
                          result.momentum30d >= 10
                            ? "text-success bg-success/10 border-success/20"
                            : result.momentum30d <= -10
                              ? "text-destructive bg-destructive/10 border-destructive/20"
                              : "text-text-2 bg-surface-2 border-border",
                        )}
                      />
                    )}
                    {/* Volatilidade */}
                    {result.volatilityLabel && (
                      <InsightCard
                        icon={Activity}
                        label="Volatilidade"
                        value={VOLATILITY_META[result.volatilityLabel].label}
                        cls={cn(
                          "border bg-surface-2/60",
                          result.volatilityLabel === "estavel"
                            ? "border-success/20"
                            : result.volatilityLabel === "volatil"
                              ? "border-warning/20"
                              : "border-destructive/20",
                          VOLATILITY_META[result.volatilityLabel].cls,
                        )}
                      />
                    )}
                    {/* Mês atual */}
                    {result.currentMonthStatus && (
                      <InsightCard
                        icon={Calendar}
                        label="Mês atual"
                        value={`${MONTH_STATUS_META[result.currentMonthStatus.status].label} (${result.currentMonthStatus.deltaPct >= 0 ? "+" : ""}${result.currentMonthStatus.deltaPct}%)`}
                        cls={cn(
                          "border bg-surface-2/60",
                          result.currentMonthStatus.status === "pico" || result.currentMonthStatus.status === "alta"
                            ? "border-success/20 text-success"
                            : result.currentMonthStatus.status === "baixa"
                              ? "border-warning/20 text-warning"
                              : "border-border text-text-2",
                        )}
                      />
                    )}
                    {/* Vs ano passado */}
                    {result.vsLastYear && (
                      <InsightCard
                        icon={Target}
                        label="Vs ano passado"
                        value={`${result.vsLastYear.deltaPct >= 0 ? "+" : ""}${result.vsLastYear.deltaPct}%`}
                        cls={cn(
                          "border bg-surface-2/60",
                          result.vsLastYear.deltaPct >= 0
                            ? "border-success/20 text-success"
                            : "border-destructive/20 text-destructive",
                        )}
                      />
                    )}
                    {/* Vs pico histórico */}
                    {result.vsAllTimePeak !== null && !result.vsLastYear && (
                      <InsightCard
                        icon={Crosshair}
                        label="Vs pico histórico"
                        value={`${result.vsAllTimePeak}%`}
                        cls={cn(
                          "border bg-surface-2/60",
                          result.vsAllTimePeak >= 80
                            ? "border-success/20 text-success"
                            : result.vsAllTimePeak >= 50
                              ? "border-primary/20 text-primary"
                              : "border-warning/20 text-warning",
                        )}
                      />
                    )}
                    {/* Próximos 30 dias */}
                    {result.next30dEstimate && (
                      <InsightCard
                        icon={BarChart3}
                        label="Próximos 30 dias"
                        value={
                          result.next30dEstimate.direction === "subir"
                            ? `Tendência de subir +${Math.abs(result.next30dEstimate.deltaPct)}%`
                            : result.next30dEstimate.direction === "cair"
                              ? `Tendência de cair ${result.next30dEstimate.deltaPct}%`
                              : "Tendência estável"
                        }
                        cls={cn(
                          "border bg-surface-2/60",
                          result.next30dEstimate.direction === "subir"
                            ? "border-success/20 text-success"
                            : result.next30dEstimate.direction === "cair"
                              ? "border-warning/20 text-warning"
                              : "border-border text-text-2",
                        )}
                      />
                    )}
                    {/* Saturação */}
                    <InsightCard
                      icon={Flame}
                      label="Concorrência"
                      value={SATURATION_META[result.marketSaturation].label}
                      cls={cn(
                        "border bg-surface-2/60",
                        result.marketSaturation === "quente"
                          ? "border-warning/20 text-warning"
                          : result.marketSaturation === "ativo"
                            ? "border-primary/20 text-primary"
                            : "border-border text-text-3",
                      )}
                    />
                    {/* Próx pico sazonal */}
                    {result.bestGrowthMonth && (
                      <InsightCard
                        icon={Calendar}
                        label="Próx pico sazonal"
                        value={MONTH_NAMES_LONG[result.bestGrowthMonth - 1]}
                        cls="border border-primary/20 bg-surface-2/60 text-primary"
                      />
                    )}
                  </div>

                  {/* Banner de ação interpretado */}
                  {actionInsight && (
                    <div className="flex items-start gap-2.5 rounded-lg border border-primary/20 border-l-2 border-l-primary/60 bg-gradient-to-r from-primary/10 to-primary/5 px-3 py-2.5">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                        <Lightbulb className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <p
                        className="text-xs text-foreground leading-relaxed pt-0.5"
                        dangerouslySetInnerHTML={{
                          __html: actionInsight.replace(
                            /\*\*(.+?)\*\*/g,
                            '<strong class="font-bold text-foreground">$1</strong>',
                          ),
                        }}
                      />
                    </div>
                  )}

                  {/* GRÁFICO PRINCIPAL: comparação OU série única + forecast */}
                  {compareChartData && compareChartData.length > 0 ? (
                    <div className="bg-surface-2/40 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="section-label">Comparativo de produtos</p>
                        <span className="text-[10px] text-text-3">
                          {[result.keyword, ...result.compareKeywords].length} termos
                        </span>
                      </div>
                      <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={compareChartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                            <XAxis
                              dataKey="period_date"
                              tickFormatter={(d) => formatTickByTimeframe(d, result.timeframe)}
                              stroke="hsl(var(--muted-foreground))"
                              fontSize={9}
                              tickLine={false}
                              axisLine={false}
                              interval="preserveStartEnd"
                              minTickGap={result.timeframe === "today 12-m" ? 35 : 25}
                            />
                            <YAxis
                              domain={[0, stats?.yMax ?? 100]}
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
                    chartData && (
                      <div className="bg-surface-2/40 rounded-lg p-3">
                        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                          <p className="section-label">Demanda nos {currentTfLong}</p>
                          <div className="flex items-center gap-3 flex-wrap">
                            {stats && stats.avg > 0 && (
                              <span className="text-[10px] text-text-3 inline-flex items-center gap-1">
                                <span className="w-3 border-t border-dashed border-muted-foreground/60" /> média do período
                              </span>
                            )}
                            {chartForecastData && (
                              <span className="text-[10px] text-text-3 inline-flex items-center gap-1">
                                <span className="w-3 border-t border-dashed border-primary" /> previsão 3 meses
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="h-32">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                              <defs>
                                <linearGradient id="trendGradSearch" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <XAxis
                                dataKey="period_date"
                                tickFormatter={(d) => formatTickByTimeframe(d, result.timeframe)}
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={9}
                                tickLine={false}
                                axisLine={false}
                                interval="preserveStartEnd"
                                minTickGap={result.timeframe === "today 12-m" ? 35 : 25}
                              />
                              <YAxis
                                domain={[0, stats?.yMax ?? 100]}
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
                                formatter={(v: number) => [v, "Demanda"]}
                              />
                              {stats && stats.avg > 0 && (
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
                                isAnimationActive={false}
                                connectNulls
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                        {/* Forecast secundário (só pra 5y) */}
                        {chartForecastData && (
                          <div className="h-12 -mt-2">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={chartForecastData} margin={{ top: 0, right: 5, left: -25, bottom: 0 }}>
                                <XAxis dataKey="period_date" hide />
                                <YAxis domain={[0, stats?.yMax ?? 100]} hide />
                                <Line
                                  type="monotone"
                                  dataKey="forecast"
                                  stroke="hsl(var(--primary))"
                                  strokeWidth={1.5}
                                  strokeDasharray="4 3"
                                  dot={false}
                                  isAnimationActive={false}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        )}
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
                    <div className="surface-card p-0 overflow-hidden">
                      <button
                        onClick={() => setShowCities((v) => !v)}
                        className="w-full flex items-center justify-between gap-2 px-4 py-3 hover:bg-surface-2/40 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-primary" />
                          <span className="text-xs font-bold text-foreground">Cidades com maior demanda</span>
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
                    <div className="surface-card p-0 overflow-hidden">
                      <button
                        onClick={() => setShowCountries((v) => !v)}
                        className="w-full flex items-center justify-between gap-2 px-4 py-3 hover:bg-surface-2/40 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-primary" />
                          <span className="text-xs font-bold text-foreground">Demanda por país</span>
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
                            <p className="section-label">Termos bombando</p>
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
                            <p className="section-label">Termos mais buscados</p>
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

                  {/* Extra footer slot (ex: keywords Shopee no contexto do produto) */}
                  {extraFooter}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Mini-card de insight reusável
function InsightCard({
  icon: Icon,
  label,
  value,
  cls,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  cls: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 rounded-lg border px-2.5 py-2 min-h-[64px]", cls)}>
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[9px] uppercase tracking-wide opacity-70 font-bold leading-none">{label}</p>
        <p className="text-[11px] font-bold mt-1 leading-tight line-clamp-2">{value}</p>
      </div>
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

import { useState } from "react";
import {
  Search,
  Sparkles,
  X,
  Loader2,
  TrendingUp,
  Flame,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTrendSearch } from "@/hooks/useTrendSearch";
import { SeasonalCycleChart } from "@/components/products/trend/SeasonalCycleChart";
import { RegionsBreakdown } from "@/components/products/trend/RegionsBreakdown";
import { cn } from "@/lib/utils";

const SUGGESTIONS = ["vestido feminino", "tênis nike", "cropped", "kit maquiagem", "tapete sala"];

export function TrendSearchCard() {
  const [input, setInput] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const { searching, result, error, search, clear } = useTrendSearch();

  const handleSubmit = (kw?: string) => {
    const term = (kw ?? input).trim();
    if (!term) return;
    setInput(term);
    search(term);
  };

  const handleClear = () => {
    setInput("");
    clear();
  };

  // Stats da timeline
  const stats = result && result.googleSeries.length > 0
    ? (() => {
        const values = result.googleSeries
          .map((p) => p.interest_score)
          .filter((v): v is number => v !== null);
        const max = values.length > 0 ? Math.max(...values) : 0;
        const avg = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
        return { max, avg };
      })()
    : null;

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

          {/* Suggestions row */}
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
              {/* Result header */}
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-text-3">
                  Resultado para{" "}
                  <span className="text-foreground font-semibold">"{result.keyword}"</span>
                </p>
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
                  {/* Timeline mini chart */}
                  {result.googleSeries.length > 0 && (
                    <div className="bg-surface-2/40 rounded-lg p-3">
                      <p className="section-label mb-2">Interesse — últimos 5 anos</p>
                      <div className="h-28">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={result.googleSeries}
                            margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                          >
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
                                return date.toLocaleDateString("pt-BR", { year: "2-digit" });
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
                                new Date(d).toLocaleDateString("pt-BR", {
                                  month: "long",
                                  year: "numeric",
                                })
                              }
                              formatter={(v: number) => [v, "Interesse"]}
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
                              dataKey="interest_score"
                              stroke="hsl(var(--primary))"
                              strokeWidth={1.8}
                              fill="url(#trendGradSearch)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
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

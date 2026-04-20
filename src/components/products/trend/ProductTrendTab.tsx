import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, Loader2, RefreshCw, Sparkles, Flame, AlertTriangle, Calendar, Pencil, Check, X, Search, Zap } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot, Area, AreaChart, ReferenceLine } from "recharts";
import { cn } from "@/lib/utils";
import { useProductTrend } from "@/hooks/useProductTrend";
import { Input } from "@/components/ui/input";
import { SeasonalCycleChart } from "./SeasonalCycleChart";
import { RegionsBreakdown } from "./RegionsBreakdown";

interface ProductTrendTabProps {
  productId: string;
  productName: string;
}

const fmtMonthShort = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
};

const fmtNumber = (n: number) => {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
};

export function ProductTrendTab({ productId, productName }: ProductTrendTabProps) {
  const {
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
    refresh,
    setKeywordOverride,
  } = useProductTrend(productId);

  const [editing, setEditing] = useState(false);
  const [draftKeyword, setDraftKeyword] = useState("");

  const startEdit = () => {
    setDraftKeyword(keyword ?? "");
    setEditing(true);
  };
  const cancelEdit = () => {
    setEditing(false);
    setDraftKeyword("");
  };
  const saveEdit = async () => {
    const trimmed = draftKeyword.trim();
    if (!trimmed) return;
    setEditing(false);
    await setKeywordOverride(trimmed);
  };

  // Estado vazio + erro
  if (!loading && !hasData && !refreshing && error) {
    return (
      <div className="surface-card p-8 text-center border-warning/30">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-warning/10 mb-3">
          <AlertTriangle className="w-6 h-6 text-warning" />
        </div>
        <h3 className="font-semibold text-foreground text-base mb-1">
          Não conseguimos buscar agora
        </h3>
        <p className="text-small text-muted-foreground mb-5 max-w-md mx-auto">
          {error}
        </p>
        <button
          onClick={() => refresh(true)}
          disabled={refreshing}
          className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
        >
          {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Tentar de novo
        </button>
      </div>
    );
  }

  // Estado vazio — primeira vez
  if (!loading && !hasData && !refreshing) {
    return (
      <div className="surface-card p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-3">
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
        <h3 className="font-semibold text-foreground text-base mb-1">
          Descubra a tendência de mercado
        </h3>
        <p className="text-small text-muted-foreground mb-5 max-w-md mx-auto">
          Analise os últimos 12 meses de interesse de busca pelo seu produto, identifique picos sazonais e descubra o melhor momento para investir em estoque e ads.
        </p>
        <button
          onClick={() => refresh(false)}
          disabled={refreshing}
          className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
        >
          {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Analisar mercado
        </button>
        {error && (
          <p className="text-small text-destructive mt-3">{error}</p>
        )}
      </div>
    );
  }

  if (loading || (refreshing && !hasData)) {
    return (
      <div className="surface-card p-8 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-3" />
        <p className="text-small text-muted-foreground">
          {refreshing ? "Buscando dados de tendência (5-15s)..." : "Carregando..."}
        </p>
      </div>
    );
  }

  const peakValue = Math.max(...googleSeries.map((p) => p.interest_score ?? 0));
  const peakPoint = googleSeries.find((p) => p.interest_score === peakValue);

  const maxVolume = Math.max(...shopeeKeywords.map((k) => k.search_volume), 1);
  const classifyVolume = (v: number) => {
    const pct = v / maxVolume;
    if (pct > 0.66) return { label: "Alta", cls: "text-success bg-success/10 border-success/30" };
    if (pct > 0.33) return { label: "Média", cls: "text-warning bg-warning/10 border-warning/30" };
    return { label: "Baixa", cls: "text-muted-foreground bg-secondary border-border" };
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header com termo + editor + refresh */}
      <div className="flex items-start justify-between gap-2 sm:gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-2 w-full sm:max-w-md">
              <Input
                autoFocus
                value={draftKeyword}
                onChange={(e) => setDraftKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveEdit();
                  if (e.key === "Escape") cancelEdit();
                }}
                placeholder="Ex: vestido longo feminino"
                className="h-9 text-sm flex-1 min-w-0"
                maxLength={100}
              />
              <button
                onClick={saveEdit}
                disabled={!draftKeyword.trim() || refreshing}
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 shrink-0"
                title="Reanalisar"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={cancelEdit}
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-secondary shrink-0"
                title="Cancelar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              {keyword && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-small text-muted-foreground">
                    Termo analisado:{" "}
                    <span className="font-semibold text-foreground break-all">{keyword}</span>
                  </p>
                  {keywordOverride && (
                    <span className="text-micro text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      personalizado
                    </span>
                  )}
                  <button
                    onClick={startEdit}
                    className="ml-1 inline-flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    title="Editar termo"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {lastCapture && (
                <p className="text-micro text-muted-foreground/70 mt-0.5">
                  Atualizado em {new Date(lastCapture).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              )}
            </>
          )}
        </div>
        {!editing && (
          <button
            onClick={() => refresh(true)}
            disabled={refreshing}
            className="h-9 px-3 rounded-lg border border-border text-small text-muted-foreground hover:bg-secondary transition-colors inline-flex items-center gap-1.5 shrink-0"
          >
            {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        )}
      </div>

      {/* Aviso de baixa qualidade + sugestões */}
      {lowQuality && !editing && (
        <div className="surface-card p-4 border-warning/30 bg-warning/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground mb-1">
                Pouco volume de busca para "{keyword}"
              </p>
              <p className="text-small text-muted-foreground mb-3">
                Esse termo é específico demais ou pouco buscado no Google. Tente um termo mais genérico para ver tendências reais do mercado.
              </p>
              {suggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="text-micro text-muted-foreground self-center">Sugestões:</span>
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => setKeywordOverride(s)}
                      disabled={refreshing}
                      className="text-small px-2.5 py-1 rounded-md border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={startEdit}
                className="text-small text-primary hover:underline inline-flex items-center gap-1"
              >
                <Pencil className="w-3 h-3" />
                Editar termo manualmente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diagnóstico — cards de insight */}
      {diagnostic && !lowQuality && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
          <div className="surface-card p-4">
            <div className="flex items-center gap-2 mb-1">
              {diagnostic.direction === "up" && <TrendingUp className="w-4 h-4 text-success" />}
              {diagnostic.direction === "down" && <TrendingDown className="w-4 h-4 text-destructive" />}
              {diagnostic.direction === "stable" && <Minus className="w-4 h-4 text-muted-foreground" />}
              <span className="label-metric">Tendência 90d</span>
            </div>
            <p className={cn(
              "font-mono text-xl font-bold",
              diagnostic.direction === "up" && "text-success",
              diagnostic.direction === "down" && "text-destructive",
              diagnostic.direction === "stable" && "text-foreground",
            )}>
              {diagnostic.slopePct > 0 ? "+" : ""}{diagnostic.slopePct.toFixed(1)}%
            </p>
            <p className="text-small text-muted-foreground mt-0.5">
              {diagnostic.direction === "up" && "Interesse acelerando"}
              {diagnostic.direction === "down" && "Interesse caindo"}
              {diagnostic.direction === "stable" && "Estável"}
            </p>
          </div>

          <div className="surface-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="w-4 h-4 text-primary" />
              <span className="label-metric">Pico do ano</span>
            </div>
            <p className="font-mono text-xl font-bold text-foreground capitalize">
              {diagnostic.peakMonth?.split(" ")[0]}
            </p>
            <p className="text-small text-muted-foreground mt-0.5">
              Vale: <span className="capitalize">{diagnostic.valleyMonth?.split(" ")[0]}</span>
            </p>
          </div>

          <div className="surface-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="label-metric">Próximo pico</span>
            </div>
            {diagnostic.nextPeakIn !== null ? (
              <>
                <p className="font-mono text-xl font-bold text-foreground">
                  {diagnostic.nextPeakIn}d
                </p>
                <p className="text-small text-muted-foreground mt-0.5">
                  {diagnostic.hasSeasonality ? "Reforce estoque" : "Sem sazonalidade clara"}
                </p>
              </>
            ) : (
              <>
                <p className="font-mono text-xl font-bold text-muted-foreground/50">—</p>
                <p className="text-small text-muted-foreground mt-0.5">Sem padrão sazonal</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Estado: termo sem dados no Google Trends mas com related/shopee */}
      {googleSeries.length === 0 && !lowQuality && hasData && (
        <div className="surface-card p-4 sm:p-5 border-warning/30 bg-warning/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground mb-1">
                Sem timeline disponível para "{keyword}"
              </p>
              <p className="text-small text-muted-foreground mb-2">
                O Google Trends não retornou histórico pra esse termo. Tente um termo mais genérico ou use uma das sugestões abaixo.
              </p>
              <button
                onClick={startEdit}
                className="text-small text-primary hover:underline inline-flex items-center gap-1"
              >
                <Pencil className="w-3 h-3" />
                Editar termo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gráfico Google Trends 5 anos — esconde se baixa qualidade */}
      {googleSeries.length > 0 && !lowQuality && (() => {
        const validValues = googleSeries
          .map((p) => p.interest_score)
          .filter((v): v is number => v !== null && v > 0);
        const avgValue = validValues.length > 0
          ? Math.round(validValues.reduce((a, b) => a + b, 0) / validValues.length)
          : 0;
        const firstYear = new Date(googleSeries[0].period_date).getUTCFullYear();
        const lastYear = new Date(googleSeries[googleSeries.length - 1].period_date).getUTCFullYear();
        const yearsSpan = lastYear - firstYear + 1;

        // Tick formatter: pra muitos pontos, mostra só ano; pra poucos, mês/ano
        const tickFormatter = (d: string) => {
          const date = new Date(d);
          if (yearsSpan >= 3) {
            return date.toLocaleDateString("pt-BR", { year: "numeric" });
          }
          return date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
        };

        return (
          <div className="surface-card p-5">
            <div className="flex items-start justify-between mb-1 gap-3 flex-wrap">
              <div>
                <p className="section-label">Interesse de busca — Google</p>
                <p className="text-micro text-muted-foreground mt-0.5">
                  {yearsSpan >= 2 ? `Últimos ${yearsSpan} anos` : "Últimos 12 meses"} · escala 0-100 (relativo ao pico)
                </p>
              </div>
              <div className="flex items-center gap-3 text-micro">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-muted-foreground">Pico {peakValue}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-0.5 bg-muted-foreground/60" style={{ borderTop: "1px dashed" }} />
                  <span className="text-muted-foreground">Média {avgValue}</span>
                </div>
              </div>
            </div>
            <div className="h-56 sm:h-64 mt-3 -ml-2 sm:ml-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={googleSeries} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="period_date"
                    tickFormatter={tickFormatter}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    minTickGap={40}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1, strokeDasharray: "3 3" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0].payload as { period_date: string; interest_score: number | null };
                      const v = p.interest_score ?? 0;
                      const date = new Date(p.period_date);
                      const dateLabel = date.toLocaleDateString("pt-BR", {
                        day: "2-digit", month: "long", year: "numeric",
                      });
                      const vsAvg = avgValue > 0 ? Math.round(((v - avgValue) / avgValue) * 100) : 0;
                      const isPeak = v === peakValue && v > 0;
                      return (
                        <div className="bg-card border border-border rounded-lg shadow-lg px-3 py-2 min-w-[180px]">
                          <p className="text-micro text-muted-foreground capitalize">{dateLabel}</p>
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="font-mono text-xl font-bold text-foreground">{v}</span>
                            <span className="text-micro text-muted-foreground">/100</span>
                            {isPeak && (
                              <span className="text-micro font-bold text-primary ml-auto">PICO</span>
                            )}
                          </div>
                          {avgValue > 0 && v > 0 && (
                            <p className={cn(
                              "text-micro mt-1",
                              vsAvg > 5 ? "text-success" : vsAvg < -5 ? "text-destructive" : "text-muted-foreground",
                            )}>
                              {vsAvg > 0 ? "+" : ""}{vsAvg}% vs média do período
                            </p>
                          )}
                        </div>
                      );
                    }}
                  />
                  {avgValue > 0 && (
                    <ReferenceLine
                      y={avgValue}
                      stroke="hsl(var(--muted-foreground))"
                      strokeDasharray="3 3"
                      strokeOpacity={0.5}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="interest_score"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#trendGradient)"
                    activeDot={{ r: 4, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
                  />
                  {peakPoint && (
                    <ReferenceDot
                      x={peakPoint.period_date}
                      y={peakPoint.interest_score ?? 0}
                      r={5}
                      fill="hsl(var(--primary))"
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })()}

      {/* Ciclo sazonal + Regiões — lado a lado em md+ */}
      {!lowQuality && (seasonalCycle.length > 0 || regions.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {seasonalCycle.length > 0 && <SeasonalCycleChart cycle={seasonalCycle} />}
          {regions.length > 0 && <RegionsBreakdown regions={regions} />}
        </div>
      )}


      {/* Oportunidades de mercado — buscas relacionadas (top + rising) */}
      {(relatedRising.length > 0 || relatedTop.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Em alta agora (rising) */}
          {relatedRising.length > 0 && (
            <div className="surface-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-destructive/10">
                  <Zap className="w-4 h-4 text-destructive" />
                </div>
                <div>
                  <p className="section-label leading-none">Em alta agora</p>
                  <p className="text-micro text-muted-foreground mt-0.5">Buscas crescendo no Google</p>
                </div>
              </div>
              <div className="space-y-1">
                {relatedRising.slice(0, 8).map((kw, i) => {
                  const breakout = kw.isBreakout || kw.value >= 5000;
                  const isHot = !breakout && kw.value >= 100;
                  const isWarm = !breakout && !isHot && kw.value >= 25;
                  return (
                    <button
                      key={`${kw.keyword}-${i}`}
                      onClick={() => setKeywordOverride(kw.keyword)}
                      disabled={refreshing}
                      className="w-full flex items-center justify-between gap-3 py-2 px-2 -mx-2 rounded-md hover:bg-secondary/60 transition-colors group disabled:opacity-50"
                      title="Analisar este termo"
                    >
                      <span className="text-sm text-foreground truncate flex-1 text-left group-hover:text-primary transition-colors">
                        {kw.keyword}
                      </span>
                      {breakout ? (
                        <span className="text-micro font-bold px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground">
                          BOMBANDO
                        </span>
                      ) : isHot ? (
                        <span className="text-micro font-semibold px-2 py-0.5 rounded-full bg-warning/15 text-warning border border-warning/30">
                          +{kw.value}%
                        </span>
                      ) : isWarm ? (
                        <span className="text-micro font-semibold px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/30">
                          +{kw.value}%
                        </span>
                      ) : (
                        <span className="text-micro text-muted-foreground">
                          {kw.formattedValue || `+${kw.value}%`}
                        </span>
                      )}
                      <Search className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  );
                })}
              </div>
              <p className="text-micro text-muted-foreground/70 mt-3 pt-3 border-t border-border">
                Clique pra analisar o termo
              </p>
            </div>
          )}

          {/* Buscas populares (top) */}
          {relatedTop.length > 0 && (
            <div className="surface-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
                  <Search className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="section-label leading-none">Buscas populares</p>
                  <p className="text-micro text-muted-foreground mt-0.5">Variações mais buscadas</p>
                </div>
              </div>
              <div className="space-y-1.5">
                {relatedTop.slice(0, 8).map((kw, i) => {
                  const pct = Math.max(0, Math.min(100, kw.value));
                  return (
                    <button
                      key={`${kw.keyword}-${i}`}
                      onClick={() => setKeywordOverride(kw.keyword)}
                      disabled={refreshing}
                      className="w-full py-1.5 px-2 -mx-2 rounded-md hover:bg-secondary/60 transition-colors group disabled:opacity-50 block"
                      title="Analisar este termo"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm text-foreground truncate flex-1 text-left group-hover:text-primary transition-colors">
                          {kw.keyword}
                        </span>
                        <span className="font-mono text-micro text-muted-foreground shrink-0">
                          {pct}
                        </span>
                      </div>
                      <div className="h-1 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary/60 group-hover:bg-primary transition-colors"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-micro text-muted-foreground/70 mt-3 pt-3 border-t border-border">
                Use no título do anúncio pra captar mais buscas
              </p>
            </div>
          )}
        </div>
      )}

      {/* Top keywords Shopee */}
      {shopeeKeywords.length > 0 && (
        <div className="surface-card p-4 sm:p-5">
          <p className="section-label mb-3">Palavras-chave Shopee — volume real</p>
          <div className="space-y-1.5">
            {shopeeKeywords.slice(0, 10).map((kw, i) => {
              const cls = classifyVolume(kw.search_volume);
              return (
                <div
                  key={`${kw.keyword}-${i}`}
                  className="flex items-center justify-between gap-2 sm:gap-3 py-2 border-b border-border last:border-0"
                >
                  <span className="text-sm text-foreground truncate flex-1 min-w-0">
                    {kw.keyword}
                  </span>
                  <span className={cn("text-micro font-semibold px-2 py-0.5 rounded-full border shrink-0 hidden sm:inline-block", cls.cls)}>
                    {cls.label}
                  </span>
                  <span className="font-mono text-small text-muted-foreground w-12 sm:w-16 text-right shrink-0">
                    {fmtNumber(kw.search_volume)}
                  </span>
                  {kw.suggested_bid > 0 && (
                    <span className="font-mono text-small text-primary w-14 text-right shrink-0">
                      R${kw.suggested_bid.toFixed(2)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!googleSeries.length && !shopeeKeywords.length && !relatedTop.length && !relatedRising.length && hasData && (
        <div className="surface-card p-5 text-center">
          <AlertTriangle className="w-5 h-5 text-warning mx-auto mb-2" />
          <p className="text-small text-muted-foreground">
            Nenhum dado disponível ainda. Tente atualizar.
          </p>
        </div>
      )}

      {error && (
        <div className="surface-card p-3 border-destructive/30">
          <p className="text-small text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
}

import { TrendingUp, TrendingDown, Minus, Loader2, RefreshCw, Sparkles, Flame, AlertTriangle, Calendar } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot } from "recharts";
import { cn } from "@/lib/utils";
import { useProductTrend } from "@/hooks/useProductTrend";

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
    diagnostic,
    error,
    refresh,
  } = useProductTrend(productId);

  // Estado vazio + erro — falha na primeira busca (ex: 429 do Google)
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

  // Dados carregados
  const peakValue = Math.max(...googleSeries.map((p) => p.interest_score ?? 0));
  const peakPoint = googleSeries.find((p) => p.interest_score === peakValue);

  // Classifica volume Shopee
  const maxVolume = Math.max(...shopeeKeywords.map((k) => k.search_volume), 1);
  const classifyVolume = (v: number) => {
    const pct = v / maxVolume;
    if (pct > 0.66) return { label: "Alta", cls: "text-success bg-success/10 border-success/30" };
    if (pct > 0.33) return { label: "Média", cls: "text-warning bg-warning/10 border-warning/30" };
    return { label: "Baixa", cls: "text-muted-foreground bg-secondary border-border" };
  };

  return (
    <div className="space-y-5">
      {/* Header com refresh */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          {keyword && (
            <p className="text-small text-muted-foreground">
              Termo analisado: <span className="font-semibold text-foreground">{keyword}</span>
            </p>
          )}
          {lastCapture && (
            <p className="text-micro text-muted-foreground/70 mt-0.5">
              Atualizado em {new Date(lastCapture).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
          )}
        </div>
        <button
          onClick={() => refresh(true)}
          disabled={refreshing}
          className="h-9 px-3 rounded-lg border border-border text-small text-muted-foreground hover:bg-secondary transition-colors inline-flex items-center gap-1.5 shrink-0"
        >
          {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Atualizar
        </button>
      </div>

      {/* Diagnóstico — cards de insight */}
      {diagnostic && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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

      {/* Gráfico Google Trends */}
      {googleSeries.length > 0 && (
        <div className="surface-card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="section-label">Interesse de busca — Google (12 meses)</p>
            <span className="text-micro text-muted-foreground">0-100 relativo</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={googleSeries} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="period_date"
                  tickFormatter={fmtMonthShort}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[0, 100]}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  labelFormatter={(d) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                  formatter={(v: number) => [v, "Interesse"]}
                />
                <Line
                  type="monotone"
                  dataKey="interest_score"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
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
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top keywords Shopee */}
      {shopeeKeywords.length > 0 && (
        <div className="surface-card p-5">
          <p className="section-label mb-3">Palavras-chave Shopee — volume real</p>
          <div className="space-y-1.5">
            {shopeeKeywords.slice(0, 10).map((kw, i) => {
              const cls = classifyVolume(kw.search_volume);
              return (
                <div
                  key={`${kw.keyword}-${i}`}
                  className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0"
                >
                  <span className="text-sm text-foreground truncate flex-1">
                    {kw.keyword}
                  </span>
                  <span className={cn("text-micro font-semibold px-2 py-0.5 rounded-full border", cls.cls)}>
                    {cls.label}
                  </span>
                  <span className="font-mono text-small text-muted-foreground w-16 text-right">
                    {fmtNumber(kw.search_volume)}
                  </span>
                  {kw.suggested_bid > 0 && (
                    <span className="font-mono text-small text-primary w-14 text-right">
                      R${kw.suggested_bid.toFixed(2)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!googleSeries.length && !shopeeKeywords.length && hasData && (
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

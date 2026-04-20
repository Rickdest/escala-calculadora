import { useState, useMemo } from "react";
import {
  Loader2,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  Pencil,
  Check,
  X,
  TrendingUp,
} from "lucide-react";
import { useProductTrend } from "@/hooks/useProductTrend";
import { Input } from "@/components/ui/input";
import { TrendSearchCard } from "@/components/products/TrendSearchCard";
import { ShopeeKeywordsCard } from "@/components/products/trend/ShopeeKeywordsCard";

interface ProductTrendTabProps {
  productId: string;
  productName: string;
}

const fmtVolume = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
};

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

export function ProductTrendTab({ productId, productName }: ProductTrendTabProps) {
  const {
    loading,
    refreshing,
    hasData,
    lastCapture,
    shopeeKeywords,
    keyword,
    keywordOverride,
    error,
    lowQuality,
    suggestions,
    autoSimplified,
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

  // Volume Shopee max para classificação
  const shopeeFooter = useMemo(() => {
    if (shopeeKeywords.length === 0) return null;
    const maxVolume = Math.max(...shopeeKeywords.map((k) => k.search_volume), 1);
    const classifyVolume = (v: number) => {
      const pct = v / maxVolume;
      if (pct > 0.66) return { label: "Alta", cls: "text-success bg-success/10 border-success/30" };
      if (pct > 0.33) return { label: "Média", cls: "text-warning bg-warning/10 border-warning/30" };
      return { label: "Baixa", cls: "text-muted-foreground bg-secondary border-border" };
    };
    return (
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
    );
  }, [shopeeKeywords]);

  // Loading inicial (primeira carga sem dados)
  if (loading && !hasData && !lowQuality && !keyword) {
    return (
      <div className="surface-card p-8 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-3" />
        <p className="text-small text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  // Refresh em andamento sem dados ainda — mostra spinner
  if (refreshing && !hasData && !lowQuality && suggestions.length === 0 && !keyword) {
    return (
      <div className="surface-card p-8 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-3" />
        <p className="text-small text-muted-foreground">
          Buscando dados de tendência (5-15s)...
        </p>
      </div>
    );
  }

  // Estado: erro grave sem dados
  if (!loading && !hasData && !refreshing && !lowQuality && suggestions.length === 0 && error && !keyword) {
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

  // Estado vazio inicial (sem keyword sequer extraída)
  if (!loading && !hasData && !refreshing && !lowQuality && suggestions.length === 0 && !keyword) {
    return (
      <div className="surface-card p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-3">
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
        <h3 className="font-semibold text-foreground text-base mb-1">
          Descubra a tendência de mercado
        </h3>
        <p className="text-small text-muted-foreground mb-5 max-w-md mx-auto">
          Analise o histórico de demanda do seu produto, identifique picos sazonais e descubra o melhor momento para investir em estoque e ads.
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

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Faixa do termo do produto — card sutil */}
      <div className="rounded-lg border border-border bg-surface-2/40 p-3 sm:p-3.5">
        {editing ? (
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
            <Input
              autoFocus
              value={draftKeyword}
              onChange={(e) => setDraftKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEdit();
                if (e.key === "Escape") cancelEdit();
              }}
              placeholder="Ex: vestido longo feminino"
              className="h-9 text-sm flex-1 min-w-0 bg-background"
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
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              {keyword && (
                <>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <p className="text-[10px] uppercase tracking-wide font-bold text-muted-foreground">
                      Termo analisado
                    </p>
                    {keywordOverride && (
                      <span className="text-micro text-primary bg-primary/10 px-1.5 py-0.5 rounded font-semibold">
                        personalizado
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm font-bold text-foreground break-all">{keyword}</p>
                    <button
                      onClick={startEdit}
                      className="inline-flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex-shrink-0"
                      title="Editar termo"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {lastCapture && (
                    <p className="text-micro text-muted-foreground/70 mt-1">
                      Atualizado em {new Date(lastCapture).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  )}
                </>
              )}
            </div>
            <button
              onClick={() => refresh(true)}
              disabled={refreshing}
              className="h-9 px-3 rounded-lg border border-border text-small text-muted-foreground hover:bg-secondary transition-colors inline-flex items-center gap-1.5 shrink-0 self-start"
            >
              {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Atualizar</span>
            </button>
          </div>
        )}
      </div>

      {/* Aviso de baixa qualidade + sugestões */}
      {lowQuality && !editing && (
        <div className="surface-card p-4 sm:p-5 border-warning/30 bg-warning/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <p className="text-sm font-semibold text-foreground">
                  Pouco volume de busca para "{keyword}"
                </p>
                {autoSimplified && (
                  <span className="text-micro text-warning bg-warning/10 px-1.5 py-0.5 rounded border border-warning/20">
                    auto-simplificado
                  </span>
                )}
              </div>
              <p className="text-small text-muted-foreground mb-3">
                Esse termo não tem histórico de demanda suficiente. Tente um termo mais genérico para ver tendências reais do mercado.
              </p>
              {suggestions.length > 0 && (
                <div className="mb-3">
                  <p className="text-micro text-muted-foreground mb-1.5">
                    Tente um destes termos:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => setKeywordOverride(s)}
                        disabled={refreshing}
                        className="text-small px-3 py-1.5 rounded-md border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 font-medium"
                      >
                        <Sparkles className="w-3 h-3" />
                        {s}
                      </button>
                    ))}
                  </div>
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

      {/* Card de análise rica reusado da Análise de demanda */}
      {keyword && !lowQuality && (
        <TrendSearchCard
          key={keyword}
          initialKeyword={keyword}
          variant="embedded"
          extraFooter={shopeeFooter}
        />
      )}

      {/* Se baixa qualidade mas tem keywords Shopee, mostra mesmo assim */}
      {lowQuality && shopeeFooter}

      {error && !lowQuality && (
        <div className="surface-card p-3 border-destructive/30">
          <p className="text-small text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
}

import { ShoppingBag, Info, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "react-router-dom";
import type { ShopeeKeyword } from "@/hooks/useProductTrend";

interface ShopeeKeywordsCardProps {
  keywords: ShopeeKeyword[];
  onAnalyzeKeyword: (keyword: string) => void;
  refreshing?: boolean;
}

const fmtVolume = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
};

function classifyQuality(score: number | null) {
  if (score === null) return null;
  if (score >= 8) return { label: "Alta", cls: "text-success bg-success/10 border-success/30" };
  if (score >= 5) return { label: "Média", cls: "text-warning bg-warning/10 border-warning/30" };
  return { label: "Baixa", cls: "text-muted-foreground bg-secondary border-border" };
}

export function ShopeeKeywordsCard({ keywords, onAnalyzeKeyword, refreshing }: ShopeeKeywordsCardProps) {
  // Estado vazio: produto sem campanha Ads
  if (keywords.length === 0) {
    return (
      <div className="surface-card p-4 sm:p-5 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <ShoppingBag className="w-4 h-4 text-primary" />
          <p className="section-label">Volume real Shopee</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-secondary mb-3">
            <Search className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-small text-muted-foreground mb-3 max-w-xs">
            Conecte o Shopee Ads e crie uma campanha pra ver volume de busca real dos clientes.
          </p>
          <Link
            to="/configuracoes/integracoes"
            className="text-small text-primary hover:underline font-medium"
          >
            Conectar Shopee Ads →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="surface-card p-4 sm:p-5 h-full flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <ShoppingBag className="w-4 h-4 text-primary shrink-0" />
          <p className="section-label truncate">Top palavras Shopee</p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="text-muted-foreground hover:text-foreground transition-colors shrink-0" aria-label="Sobre estes dados">
              <Info className="w-3.5 h-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs">
            <p className="text-xs">
              Volume de busca <strong>real dos últimos 7 dias</strong> na Shopee, vindo do app de Ads. Quanto maior, mais gente está procurando.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="space-y-1 flex-1">
        {keywords.slice(0, 8).map((kw, i) => {
          const quality = classifyQuality(kw.quality_score);
          return (
            <button
              key={`${kw.keyword}-${i}`}
              onClick={() => onAnalyzeKeyword(kw.keyword)}
              disabled={refreshing}
              className="w-full text-left py-2 px-2 -mx-2 rounded-md hover:bg-secondary/50 transition-colors disabled:opacity-50 group"
              title={`Reanalisar tendência Google com: ${kw.keyword}`}
            >
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="text-sm text-foreground truncate flex-1 min-w-0 group-hover:text-primary transition-colors">
                  {kw.keyword}
                </span>
                <span className="font-mono text-sm font-bold text-foreground shrink-0">
                  {fmtVolume(kw.search_volume)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-micro text-muted-foreground">buscas/7d</span>
                {quality && (
                  <span className={cn("text-micro font-semibold px-1.5 py-0.5 rounded border", quality.cls)}>
                    {quality.label}
                  </span>
                )}
                {kw.suggested_bid > 0 && (
                  <span className="text-micro text-muted-foreground ml-auto">
                    Lance R$ {kw.suggested_bid.toFixed(2)}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {refreshing && (
        <div className="flex items-center justify-center gap-2 pt-3 mt-2 border-t border-border">
          <Loader2 className="w-3 h-3 animate-spin text-primary" />
          <span className="text-micro text-muted-foreground">Reanalisando...</span>
        </div>
      )}
    </div>
  );
}

import { forwardRef } from 'react';
import { EnrichedAdsData } from '@/hooks/useAdsData';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Upload, Search, MapPin } from 'lucide-react';
import { getClassCor, getRoasColor } from './adsHelpers';

export const ByProductContent = forwardRef<HTMLDivElement, {
  data: EnrichedAdsData[];
  onImport: () => void;
  onDetail: (d: EnrichedAdsData) => void;
}>(function ByProductContent({ data, onImport, onDetail }, ref) {
  const withPosition = data.filter(d => d.posicao_importada && d.posicao_media !== null);

  if (withPosition.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center">
          <Search className="w-8 h-8 text-text-3" />
        </div>
        <div className="space-y-2">
          <p className="text-[15px] font-bold text-foreground">Análise Individual por Produto</p>
          <p className="text-[13px] text-text-2 max-w-[300px] mx-auto">
            Importe o relatório de um produto específico para análise completa com posicionamento.
          </p>
          <div className="text-left bg-surface-2 rounded-xl p-3 max-w-[300px] mx-auto mt-3">
            <p className="text-[11px] font-bold text-foreground mb-1">Como exportar na Shopee:</p>
            <ol className="text-[11px] text-text-2 space-y-0.5 list-decimal list-inside">
              <li>Shopee Seller Center</li>
              <li>Marketing → Shopee Ads</li>
              <li>Clique no anúncio do produto</li>
              <li>Aba "Dados do Anúncio de Produto"</li>
              <li>Exportar CSV</li>
            </ol>
          </div>
        </div>
        <Button onClick={onImport} className="h-12 w-4/5 max-w-[320px] rounded-xl text-sm font-bold gap-2 mt-4">
          <Upload className="w-4 h-4" /> Importar CSV do Produto
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-bold text-foreground">Produtos com análise de posição</p>
      {withPosition.map(ad => {
        const cls = getClassCor(ad.classificacao);
        return (
          <div
            key={ad.id}
            className="rounded-xl border border-border bg-card p-4 cursor-pointer hover:border-primary/30 transition-colors active:scale-[0.99]"
            onClick={() => onDetail(ad)}
          >
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{ad.nome_produto_csv}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn('text-xs font-bold font-mono tabular-nums', getRoasColor(ad.roas_direto || ad.roas))}>
                    ROAS {(ad.roas_direto || ad.roas).toFixed(2)}
                  </span>
                  {ad.roas_empate && (
                    <span className="text-[11px] text-text-3 font-mono">Empate {ad.roas_empate.toFixed(2)}</span>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="text-xl font-extrabold font-mono tabular-nums text-foreground">#{ad.posicao_media}</span>
                </div>
                <span className={cn('text-[10px] font-bold', cls.color)}>{cls.label}</span>
              </div>
            </div>
          </div>
        );
      })}
      <Button onClick={onImport} variant="outline" className="w-full h-10 rounded-xl text-sm font-bold gap-2 border-dashed">
        <Upload className="w-4 h-4" /> Importar novo CSV de produto
      </Button>
    </div>
  );
});

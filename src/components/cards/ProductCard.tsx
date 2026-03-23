import React, { useState, useRef, useCallback } from 'react';
import { Package, TrendingUp, TrendingDown, MoreVertical, Copy, Trash2, Edit, MapPin, BarChart3, Upload } from 'lucide-react';
import { Product, ProductCalculation } from '@/types/store';
import { cn, getMarginStatus } from '@/lib/utils';
import { calcOutrosCanais, getBestChannel } from '@/lib/outrosCanaisUtils';
import { useStore } from '@/contexts/StoreContext';
import { AdMetricDerived } from '@/lib/shopeeAdsParser';
import { Button } from '@/components/ui/button';
import { ImportAdsModal } from '@/components/roas/ImportAdsModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProductCardProps {
  product: Product;
  calculation: ProductCalculation;
  adsMetric?: AdMetricDerived;
  onEdit: (product: Product) => void;
  onDuplicate: (productId: string) => void;
  onDelete: (productId: string) => void;
  onAdsUpdate?: () => void;
}

function getRoasColor(roas: number) {
  if (roas >= 5) return 'text-success';
  if (roas >= 2) return 'text-warning';
  return 'text-destructive';
}

function getRoasBg(roas: number) {
  if (roas >= 5) return 'bg-success/15 border-success/30';
  if (roas >= 2) return 'bg-warning/15 border-warning/30';
  return 'bg-destructive/15 border-destructive/30';
}

function getAcosColor(acos: number) {
  return acos <= 20 ? 'text-success' : acos <= 40 ? 'text-warning' : 'text-destructive';
}

export function ProductCard({ product, calculation, adsMetric, onEdit, onDuplicate, onDelete, onAdsUpdate }: ProductCardProps) {
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [showAdsImport, setShowAdsImport] = useState(false);

  const { currentStore } = useStore();
  const taxesPercent = currentStore?.config.taxes ?? 0;
  const products = currentStore?.products || [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const status = getMarginStatus(calculation.realMargin);
  const TrendIcon = calculation.realMargin >= 0 ? TrendingUp : TrendingDown;

  const handleTouchStart = useCallback(() => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      onEdit(product);
    }, 500);
  }, [onEdit, product]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchMove = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const channelResults = product.outrosCanais && Object.keys(product.outrosCanais).length > 0
    ? calcOutrosCanais(product.outrosCanais, taxesPercent)
    : null;
  const bestChannel = channelResults ? getBestChannel(channelResults) : null;

  return (
    <>
      <div
        className="glass-card-hover p-4 select-none"
        onDoubleClick={() => onEdit(product)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
      >
        <div className="flex gap-4">
          {/* Product Image or Icon */}
          <div className="flex-shrink-0">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-18 h-18 rounded-xl object-cover"
                style={{ width: '72px', height: '72px' }}
              />
            ) : (
              <div
                className="rounded-xl bg-secondary flex items-center justify-center"
                style={{ width: '72px', height: '72px' }}
              >
                <Package className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-foreground truncate text-base">{product.name}</h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1.5 hover:bg-secondary rounded-lg transition-colors flex-shrink-0">
                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(product)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDuplicate(product.id)}>
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete(product.id)} className="text-destructive focus:text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-4 mt-1.5">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Venda</p>
                <p className="text-sm font-bold">{formatCurrency(product.salePrice)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Custo</p>
                <p className="text-sm font-semibold text-muted-foreground">{formatCurrency(product.costPrice)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Estoque</p>
                <p className={cn(
                  'text-sm font-semibold',
                  product.stockQuantity === 0 ? 'text-destructive' :
                  product.stockQuantity <= 5 ? 'text-warning' : 'text-muted-foreground'
                )}>
                  {product.stockQuantity}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Margin & Profit */}
        <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Lucro</p>
            <p className={cn('text-xl font-extrabold', status.color)}>
              {formatCurrency(calculation.netProfit)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Margem</p>
              <div className="flex items-center gap-1.5 justify-end">
                <TrendIcon className={cn('w-4 h-4', status.color)} />
                <span className={cn('text-xl font-extrabold', status.color)}>
                  {calculation.realMargin.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className={cn(
              'px-3 py-2 rounded-xl text-xs font-bold',
              status.bg, status.color
            )}>
              {calculation.marginDifference >= 0 ? '+' : ''}{calculation.marginDifference.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Ads Section */}
        <div className="mt-3 pt-3 border-t border-dashed border-border/40">
          {!adsMetric ? (
            /* No ads data — show import button */
            <button
              onClick={(e) => { e.stopPropagation(); setShowAdsImport(true); }}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-border text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors active:scale-[0.98]"
            >
              <Upload className="w-3.5 h-3.5" /> Importar relatório de anúncios
            </button>
          ) : (
            /* Has ads data — show badges */
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {adsMetric.avgPosition !== null && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary border border-border text-[11px] font-bold font-mono tabular-nums text-muted-foreground">
                    <MapPin className="w-3 h-3 text-destructive" />
                    Pos. #{adsMetric.avgPosition}
                  </span>
                )}
                <span className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-bold font-mono tabular-nums',
                  getRoasBg(adsMetric.roas), getRoasColor(adsMetric.roas)
                )}>
                  ROAS {adsMetric.roas.toFixed(2)}
                </span>
                <span className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-md bg-secondary border border-border text-[11px] font-bold font-mono tabular-nums',
                  getAcosColor(adsMetric.acos)
                )}>
                  ACOS {adsMetric.acos.toFixed(2)}%
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-secondary border border-border text-[11px] font-mono tabular-nums text-muted-foreground">
                  {adsMetric.itemsSold} vendidos
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Outros Canais */}
        {channelResults && channelResults.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); setCompareOpen(o => !o); }}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-secondary border border-border text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors active:scale-[0.98]"
            >
              🌐 Comparar canais
              <span className="bg-secondary rounded px-1.5 py-0.5 text-[10px] font-bold">
                {channelResults.length} {channelResults.length === 1 ? 'canal' : 'canais'}
              </span>
              <span className={cn('text-[10px] transition-transform', compareOpen && 'rotate-180')}>▼</span>
            </button>

            {compareOpen && (
              <div className="bg-secondary border border-border rounded-xl p-2.5 animate-fade-up">
                <div className="grid grid-cols-4 gap-1.5">
                  {channelResults.map((r) => {
                    const isBest = r.key === bestChannel?.key;
                    const shortLabel: Record<string, string> = {
                      tiktok: 'TikTok',
                      shein: 'Shein',
                      amazon: 'Amazon',
                      ml: 'Merc. Livre',
                    };
                    return (
                      <div
                        key={r.key}
                        className={cn(
                          'relative rounded-lg border px-1.5 py-2 text-center',
                          isBest
                            ? 'border-success/35 bg-success/5'
                            : 'border-border bg-background/50'
                        )}
                      >
                        {isBest && (
                          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[11px] leading-none">👑</span>
                        )}
                        <p className="text-[8px] font-bold uppercase tracking-wide text-muted-foreground leading-tight mb-1">
                          {shortLabel[r.key] ?? r.label}
                        </p>
                        <p className={cn(
                          'text-[13px] font-extrabold tabular-nums font-mono leading-none',
                          r.margin >= 15 ? 'text-success' : r.margin >= 0 ? 'text-warning' : 'text-destructive'
                        )}>
                          {r.margin.toFixed(1)}%
                        </p>
                        <p className="text-[9px] text-muted-foreground tabular-nums font-mono mt-0.5">
                          {formatCurrency(r.netProfit)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ads Import Modal */}
      {showAdsImport && (
        <ImportAdsModal
          products={products}
          preselectedProductId={product.id}
          onClose={() => setShowAdsImport(false)}
          onSuccess={() => { setShowAdsImport(false); onAdsUpdate?.(); }}
        />
      )}
    </>
  );
}

export default React.memo(ProductCard);

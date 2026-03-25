import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Package, MoreVertical, Copy, Trash2, Edit, Upload, TrendingUp, TrendingDown } from 'lucide-react';
import { Product, ProductCalculation } from '@/types/store';
import { cn, getMarginStatus } from '@/lib/utils';
import { useStore } from '@/contexts/StoreContext';
import { AdMetricDerived } from '@/lib/shopeeAdsParser';
import { ImportAdsModal } from '@/components/roas/ImportAdsModal';
import { calcOutrosCanais, getBestChannel } from '@/lib/outrosCanaisUtils';
import { OutrosCanais } from '@/types/store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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

function getPositionColor(pos: number | null | undefined) {
  if (!pos || pos <= 0) return 'text-muted-foreground';
  if (pos <= 3) return 'text-success';
  if (pos <= 8) return 'text-primary';
  if (pos <= 16) return 'text-warning';
  return 'text-destructive';
}

export function ProductCard({ product, calculation, adsMetric, onEdit, onDuplicate, onDelete, onAdsUpdate }: ProductCardProps) {
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);
  const [showAdsImport, setShowAdsImport] = useState(false);

  const { currentStore } = useStore();
  const products = currentStore?.products || [];

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

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
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  }, []);

  const handleTouchMove = useCallback(() => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  }, []);

  const hasOutrosCanais = product.outrosCanais && typeof product.outrosCanais === 'object' && Object.keys(product.outrosCanais).length > 0;

  const channelResults = useMemo(() => {
    if (!hasOutrosCanais) return [];
    return calcOutrosCanais(product.outrosCanais as OutrosCanais, currentStore?.config?.taxes || 0);
  }, [product.outrosCanais, hasOutrosCanais, currentStore?.config?.taxes]);

  const bestChannel = useMemo(() => getBestChannel(channelResults), [channelResults]);

  return (
    <>
      <div
        className="p-3 rounded-xl border border-border bg-card hover:border-primary/30 transition-all cursor-pointer select-none active:scale-[0.995]"
        onClick={() => onEdit(product)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
      >
        {/* Row 1: Image + Name/Price + Menu */}
        <div className="flex items-start gap-3">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-11 h-11 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="w-11 h-11 rounded-lg bg-secondary flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 text-muted-foreground" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-foreground truncate">{product.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-muted-foreground">
                Venda <span className="text-foreground font-medium">{fmt(product.salePrice)}</span>
              </span>
              <span className="text-[11px] text-muted-foreground">
                Custo <span className="text-foreground font-medium">{fmt(product.costPrice)}</span>
              </span>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 hover:bg-secondary rounded-lg transition-colors shrink-0"
              >
                <MoreVertical className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => onEdit(product)}>
                <Edit className="w-4 h-4 mr-2" />Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(product.id)}>
                <Copy className="w-4 h-4 mr-2" />Duplicar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowAdsImport(true)}>
                <Upload className="w-4 h-4 mr-2" />Importar anúncios
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(product.id)} className="text-destructive focus:text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Row 2: Unified metrics bar */}
        <div className="mt-2 bg-secondary/50 rounded-lg px-2.5 py-2 flex items-center gap-1.5 flex-wrap">
          {/* Financial badges */}
          <span className={cn('px-2 py-0.5 rounded-md text-[11px] font-bold inline-flex items-center gap-0.5', status.bg, status.color)}>
            <TrendIcon className="w-3 h-3" />
            {calculation.realMargin.toFixed(1)}%
          </span>
          <span className={cn('px-2 py-0.5 rounded-md text-[11px] font-bold truncate max-w-[120px]', status.bg, status.color)}>
            {fmt(calculation.netProfit)}
          </span>

          {/* Ads metrics (inline, same bar) */}
          {adsMetric && (
            <>
              <span className="w-px h-4 bg-border mx-0.5" />
              {adsMetric.avgPosition != null && adsMetric.avgPosition > 0 && (
                <span className={cn('text-base font-extrabold font-mono tabular-nums leading-none', getPositionColor(adsMetric.avgPosition))}>
                  #{adsMetric.avgPosition}
                </span>
              )}
              <span className="px-1.5 py-0.5 rounded-md bg-background/60 text-[11px] font-bold text-foreground">
                ROAS {adsMetric.roas.toFixed(2)}
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-background/60 text-[11px] font-bold text-foreground">
                ACOS {adsMetric.acos.toFixed(1)}%
              </span>
              {adsMetric.itemsSold > 0 && (
                <span className="px-1.5 py-0.5 rounded-md bg-background/60 text-[11px] font-bold text-foreground">
                  {adsMetric.itemsSold} un
                </span>
              )}
            </>
          )}
        </div>

        {/* Row 3: Action buttons (horizontal) */}
        {(!adsMetric || hasOutrosCanais) && (
          <div className="mt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {!adsMetric && (
              <button
                onClick={() => setShowAdsImport(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed border-border text-[11px] font-medium text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
              >
                <Upload className="w-3 h-3" /> Importar Ads
              </button>
            )}
            {hasOutrosCanais && channelResults.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {channelResults.map(ch => (
                  <span
                    key={ch.key}
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold',
                      ch.margin >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                    )}
                  >
                    {bestChannel?.key === ch.key && '👑'} {ch.label} {ch.margin.toFixed(1)}%
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

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

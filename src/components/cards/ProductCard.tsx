import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Package, MoreVertical, Copy, Trash2, Edit, Upload, BarChart3 } from 'lucide-react';
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

function getPositionDot(pos: number) {
  if (pos <= 3) return 'bg-success';
  if (pos <= 8) return 'bg-primary';
  if (pos <= 16) return 'bg-warning';
  return 'bg-destructive';
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

  // Margin bar: clamp between 0 and target (e.g. 40%)
  const marginBarPercent = Math.max(0, Math.min(calculation.realMargin / 40 * 100, 100));

  const hasAds = !!adsMetric;

  return (
    <>
      <div
        className="p-3 rounded-xl border border-border bg-card hover:border-primary/30 transition-all cursor-pointer select-none active:scale-[0.995]"
        onClick={() => onEdit(product)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
      >
        {/* Row 1: Image + Name + Prices + Menu */}
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
            <p className="text-xs text-muted-foreground mt-0.5">
              <span className="text-primary font-bold">{fmt(product.salePrice)}</span>
              <span className="mx-1.5 text-border">·</span>
              <span>Custo {fmt(product.costPrice)}</span>
            </p>
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

        {/* Row 2: Financial metrics — Margin + Profit + Import button */}
        <div className="mt-2.5 pt-2.5 border-t border-border/50">
          <div className="flex items-start justify-between">
            <div className="flex items-baseline gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Margem</p>
                <p className={cn('text-lg font-extrabold font-mono tabular-nums leading-tight', status.color)}>
                  {calculation.realMargin.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Lucro</p>
                <p className={cn('text-lg font-extrabold font-mono tabular-nums leading-tight', status.color)}>
                  {fmt(calculation.netProfit)}
                </p>
              </div>
            </div>
            {!hasAds && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowAdsImport(true); }}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                title="Importar Ads CSV"
              >
                <BarChart3 className="w-4 h-4" />
              </button>
            )}
          </div>
          {/* Margin progress bar */}
          <div className="mt-1.5 h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', 
                calculation.realMargin >= 20 ? 'bg-success' : 
                calculation.realMargin >= 10 ? 'bg-warning' : 
                calculation.realMargin >= 0 ? 'bg-warning' : 'bg-destructive'
              )}
              style={{ width: `${marginBarPercent}%` }}
            />
          </div>
        </div>

        {/* Row 3: Ads metrics — compact horizontal */}
        {adsMetric && (
          <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-3 text-[11px] font-mono tabular-nums">
            {adsMetric.avgPosition != null && adsMetric.avgPosition > 0 && (
              <span className={cn('flex items-center gap-1 font-bold', getPositionColor(adsMetric.avgPosition))}>
                <span className={cn('w-1.5 h-1.5 rounded-full', getPositionDot(adsMetric.avgPosition))} />
                #{adsMetric.avgPosition}
              </span>
            )}
            <span className="font-bold text-foreground">ROAS {adsMetric.roas.toFixed(2)}</span>
            <span className="text-muted-foreground">ACOS {adsMetric.acos.toFixed(1)}%</span>
            {adsMetric.itemsSold > 0 && (
              <span className="text-muted-foreground">{adsMetric.itemsSold} un</span>
            )}
          </div>
        )}

        {/* Row 4: Other channels — flat chips */}
        {hasOutrosCanais && channelResults.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-1.5 flex-wrap">
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

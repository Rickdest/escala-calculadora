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

function getMetricStyle(margin: number) {
  if (margin < 0) return 'bg-destructive/15 text-destructive';
  if (margin < 10) return 'bg-warning/15 text-warning';
  return 'bg-success/15 text-success';
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
  const metricStyle = getMetricStyle(calculation.realMargin);

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

  const hasAds = !!adsMetric;

  return (
    <>
      <div
        className="p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-all cursor-pointer select-none active:scale-[0.995]"
        onClick={() => onEdit(product)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
      >
        {/* Row 1: Image + Name + Prices + Menu */}
        <div className="flex items-start gap-3">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-14 h-14 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center shrink-0">
              <Package className="w-6 h-6 text-muted-foreground" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base text-foreground truncate">{product.name}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Preço: <span className="text-primary font-bold">{fmt(product.salePrice)}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Custo: <span className="font-medium text-foreground">{fmt(product.costPrice)}</span>
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

        {/* Row 2: Margin + Profit badges */}
        <div className="mt-3 flex items-center justify-center gap-2">
          <span className={cn('rounded-lg px-3 py-1.5 text-sm font-bold', metricStyle)}>
            Margem: {calculation.realMargin.toFixed(1)}%
          </span>
          <span className={cn('rounded-lg px-3 py-1.5 text-sm font-bold', metricStyle)}>
            Lucro: {fmt(calculation.netProfit)}
          </span>
        </div>

        {/* Row 3: Import Ads button (only when no ads) */}
        {!hasAds && (
          <div className="mt-3 flex justify-center">
            <button
              onClick={(e) => { e.stopPropagation(); setShowAdsImport(true); }}
              className="inline-flex items-center gap-2 border border-border rounded-lg px-4 py-2 text-sm font-bold text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              Importar Ads CSV
            </button>
          </div>
        )}

        {/* Row 4: Ads metrics pills */}
        {adsMetric && (
          <div className="mt-3 flex items-center gap-1.5 flex-wrap justify-center">
            {adsMetric.avgPosition != null && adsMetric.avgPosition > 0 && (
              <span className={cn('inline-flex items-center gap-1 bg-secondary rounded-lg px-2.5 py-1 text-xs font-bold', getPositionColor(adsMetric.avgPosition))}>
                <span className={cn('w-1.5 h-1.5 rounded-full', getPositionDot(adsMetric.avgPosition))} />
                Pos. #{adsMetric.avgPosition}
              </span>
            )}
            <span className="bg-secondary rounded-lg px-2.5 py-1 text-xs font-bold text-foreground">
              ROAS {adsMetric.roas.toFixed(2)}
            </span>
            <span className="bg-secondary rounded-lg px-2.5 py-1 text-xs font-bold text-muted-foreground">
              ACOS {adsMetric.acos.toFixed(1)}%
            </span>
            {adsMetric.directAcos != null && adsMetric.directAcos > 0 && (
              <span className="bg-secondary rounded-lg px-2.5 py-1 text-xs font-bold text-muted-foreground">
                ACOS direto {adsMetric.directAcos.toFixed(1)}%
              </span>
            )}
            {adsMetric.itemsSold > 0 && (
              <span className="bg-secondary rounded-lg px-2.5 py-1 text-xs font-bold text-muted-foreground">
                {adsMetric.itemsSold} vendidos
              </span>
            )}
          </div>
        )}

        {/* Row 5: Other channels chips */}
        {hasOutrosCanais && channelResults.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5 flex-wrap justify-center">
            {channelResults.map(ch => (
              <span
                key={ch.key}
                className={cn(
                  'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold',
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

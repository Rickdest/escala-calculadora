import React, { useState, useRef, useCallback } from 'react';
import { Package, TrendingUp, TrendingDown, MoreVertical, Copy, Trash2, Edit, Upload, BarChart3 } from 'lucide-react';
import { Product, ProductCalculation } from '@/types/store';
import { cn, getMarginStatus } from '@/lib/utils';
import { useStore } from '@/contexts/StoreContext';
import { AdMetricDerived } from '@/lib/shopeeAdsParser';
import { ImportAdsModal } from '@/components/roas/ImportAdsModal';
import { useIsMobile } from '@/hooks/use-mobile';
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

export function ProductCard({ product, calculation, adsMetric, onEdit, onDuplicate, onDelete, onAdsUpdate }: ProductCardProps) {
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);
  const [showAdsImport, setShowAdsImport] = useState(false);
  const isMobile = useIsMobile();

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

  const stockAlert = product.stockQuantity === 0
    ? 'zero'
    : (product.minStockQuantity && product.stockQuantity <= product.minStockQuantity)
      ? 'low'
      : null;

  return (
    <>
      <div
        className="flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-all cursor-pointer select-none active:scale-[0.995]"
        onClick={() => onEdit(product)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
      >
        {/* Image */}
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-12 h-12 md:w-14 md:h-14 rounded-xl object-cover shrink-0" />
        ) : (
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-secondary flex items-center justify-center shrink-0">
            <Package className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground" />
          </div>
        )}

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm text-foreground truncate">{product.name}</h3>
          <div className="flex items-center gap-2 md:gap-3 mt-1 flex-wrap">
            <span className="text-[11px] text-muted-foreground">
              Venda <span className="text-foreground font-medium">{fmt(product.salePrice)}</span>
            </span>
            <span className="text-[11px] text-muted-foreground">
              Custo <span className="text-foreground font-medium">{fmt(product.costPrice)}</span>
            </span>
            {stockAlert === 'zero' ? (
              <span className="px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-bold">
                Sem estoque
              </span>
            ) : stockAlert === 'low' ? (
              <span className="px-1.5 py-0.5 rounded-full bg-warning/10 text-warning text-[10px] font-bold">
                Estoque baixo ({product.stockQuantity})
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground">
                Est. <span className="text-foreground font-medium">{product.stockQuantity}</span>
              </span>
            )}
          </div>
        </div>

        {/* Desktop: Lucro + Margem inline */}
        {!isMobile && (
          <>
            <div className="text-right shrink-0">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Lucro</p>
              <p className={cn('text-sm font-extrabold font-mono tabular-nums', status.color)}>
                {fmt(calculation.netProfit)}
              </p>
            </div>
            <div className="text-right shrink-0 min-w-[72px]">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Margem</p>
              <div className="flex items-center gap-1.5 justify-end">
                <TrendIcon className={cn('w-3.5 h-3.5', status.color)} />
                <span className={cn('text-sm font-extrabold font-mono tabular-nums', status.color)}>
                  {calculation.realMargin.toFixed(1)}%
                </span>
              </div>
            </div>
            {calculation.marginDifference !== 0 && (
              <span className={cn(
                'px-2 py-1 rounded-lg text-[10px] font-bold shrink-0',
                status.bg, status.color
              )}>
                {calculation.marginDifference >= 0 ? '+' : ''}{calculation.marginDifference.toFixed(1)}%
              </span>
            )}
          </>
        )}

        {/* Mobile: stacked lucro/margem */}
        {isMobile && (
          <div className="text-right shrink-0">
            <p className={cn('text-sm font-extrabold font-mono tabular-nums', status.color)}>
              {fmt(calculation.netProfit)}
            </p>
            <div className="flex items-center gap-1 justify-end mt-0.5">
              <TrendIcon className={cn('w-3 h-3', status.color)} />
              <span className={cn('text-xs font-bold font-mono tabular-nums', status.color)}>
                {calculation.realMargin.toFixed(1)}%
              </span>
            </div>
          </div>
        )}

        {/* Menu */}
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

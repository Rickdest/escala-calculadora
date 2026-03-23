import { useState, useRef, useCallback } from 'react';
import { Package, TrendingUp, TrendingDown, MoreVertical, Copy, Trash2, Edit, Boxes } from 'lucide-react';
import { Product, ProductCalculation } from '@/types/store';
import { cn, getMarginStatus } from '@/lib/utils';
import { calcOutrosCanais, getBestChannel } from '@/lib/outrosCanaisUtils';
import { useStore } from '@/contexts/StoreContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProductCardProps {
  product: Product;
  calculation: ProductCalculation;
  onEdit: (product: Product) => void;
  onDuplicate: (productId: string) => void;
  onDelete: (productId: string) => void;
}

export function ProductCard({ product, calculation, onEdit, onDuplicate, onDelete }: ProductCardProps) {
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);
  const [compareOpen, setCompareOpen] = useState(false);

  const { currentStore } = useStore();
  const taxesPercent = currentStore?.config.taxes ?? 0;

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

      {/* Calculation Results */}
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

      {/* Outros Canais */}
      {channelResults && channelResults.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); setCompareOpen(o => !o); }}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-surface-2 border border-border text-xs font-semibold text-text-2 hover:border-primary/40 hover:text-primary transition-colors active:scale-[0.98]"
          >
            🌐 Comparar canais
            <span className="bg-white/8 rounded px-1.5 py-0.5 text-[10px] font-bold">
              {channelResults.length} {channelResults.length === 1 ? 'canal' : 'canais'}
            </span>
            <span className={cn('text-[10px] transition-transform', compareOpen && 'rotate-180')}>▼</span>
          </button>

          {compareOpen && (
            <div className="bg-surface-2 border border-border rounded-xl p-2.5 animate-fade-up">
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
                      <p className="text-[8px] font-bold uppercase tracking-wide text-text-3 leading-tight mb-1">
                        {shortLabel[r.key] ?? r.label}
                      </p>
                      <p className={cn(
                        'text-[13px] font-extrabold tabular-nums font-mono leading-none',
                        r.margin >= 15 ? 'text-success' : r.margin >= 0 ? 'text-warning' : 'text-danger'
                      )}>
                        {r.margin.toFixed(1)}%
                      </p>
                      <p className="text-[9px] text-text-3 tabular-nums font-mono mt-0.5">
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
  );
}

export default React.memo(ProductCard);

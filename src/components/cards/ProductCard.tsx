import React, { useRef, useCallback } from 'react';
import { Package, MoreVertical, Copy, Trash2, Edit, ChevronRight } from 'lucide-react';
import { Product, ProductCalculation, StoreConfig } from '@/types/store';
import { cn, getMarginStatus } from '@/lib/utils';
import { calcFullRoas } from '@/lib/roasUtils';
import { calcOutrosCanais } from '@/lib/outrosCanaisUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProductCardProps {
  product: Product;
  calculation: ProductCalculation;
  config?: StoreConfig;
  onEdit: (product: Product) => void;
  onDuplicate: (productId: string) => void;
  onDelete: (productId: string) => void;
  onCardClick?: (product: Product) => void;
  /** @deprecated use onCardClick */
  onTap?: () => void;
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export function ProductCard({
  product,
  calculation,
  config,
  onEdit,
  onDuplicate,
  onDelete,
  onCardClick,
  onTap,
}: ProductCardProps) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  const missingCost = !product.costPrice || product.costPrice <= 0;
  const status = getMarginStatus(calculation.realMargin);

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

  const handleClick = useCallback(() => {
    if (!isLongPress.current) {
      if (onCardClick) onCardClick(product);
      else if (onTap) onTap();
      else onEdit(product);
    }
  }, [onCardClick, onTap, onEdit, product]);

  const taxes = config?.taxes ?? 0;
  const desiredMargin = config?.desiredMargin ?? 15;

  // ── Header with image, name, menu (shared) ──
  const cardHeader = (
    <div className="flex items-start gap-3">
      {product.imageUrl ? (
        <img src={product.imageUrl} alt={product.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
      ) : (
        <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shrink-0">
          <Package className="w-5 h-5 text-muted-foreground" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-subtitle text-foreground truncate">{product.name}</h3>
        <p className="text-small text-muted-foreground mt-0.5 truncate">
          <span className="font-semibold text-primary">{fmt(product.salePrice)}</span>
          <span className="mx-1">venda · custo</span>
          <span className="font-semibold text-foreground">{fmt(product.costPrice)}</span>
        </p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button onClick={(e) => e.stopPropagation()} className="p-1.5 hover:bg-secondary rounded-lg transition-colors shrink-0">
            <MoreVertical className="w-4 h-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={() => { onEdit(product); }}>
            <Edit className="w-4 h-4 mr-2" /> Editar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { onDuplicate(product.id); }}>
            <Copy className="w-4 h-4 mr-2" /> Duplicar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { onDelete(product.id); }} className="text-destructive focus:text-destructive">
            <Trash2 className="w-4 h-4 mr-2" /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  // ── Comparativo de Canais - apenas canais com dados reais cadastrados ──
  const channelResults = product.outrosCanais
    ? calcOutrosCanais(product.outrosCanais, taxes)
    : [];
  const bestChannel = channelResults[0];

  const roasResult = config ? calcFullRoas(product.salePrice, product.costPrice, config, product.packagingCost) : null;
  const roasEmpate = roasResult?.roasEmpate;

  return (
    <div
      className={cn(
        "rounded-card border bg-card p-4 cursor-pointer select-none active:scale-[0.995] transition-all",
        missingCost ? "border-warning/50" : "border-border hover:border-primary/30"
      )}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onClick={handleClick}
    >
      {cardHeader}

      {missingCost && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-warning bg-warning/10 border border-warning/20 rounded px-2 py-1">
          ⚠ Custo não informado - preencha para calcular margem real
        </div>
      )}

      {/* ── METRICS: inline 3-column ── */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="text-center">
          {calculation.realMargin > 200 || calculation.realMargin < -100 ? (
            <p className="font-mono text-lg font-extrabold leading-tight text-warning">⚠ Revisar</p>
          ) : (
            <p className={cn('font-mono text-lg font-extrabold leading-tight', status.color)}>
              {calculation.realMargin.toFixed(1)}%
            </p>
          )}
          <p className="label-metric">Margem</p>
        </div>

        <div className="text-center">
          <p className={cn('font-mono text-sm font-extrabold leading-tight', status.color)}>
            {fmt(calculation.netProfit)}
          </p>
          <p className="label-metric">Lucro/un</p>
        </div>

        <div className="text-center">
          <p className="font-mono text-lg font-extrabold leading-tight text-warning">
            {roasEmpate && roasEmpate > 0 ? `${roasEmpate.toFixed(2)}x` : '-'}
          </p>
          <p className="label-metric">ROAS empate</p>
        </div>
      </div>

      {/* ── COMPARATIVO DE CANAIS: só canais cadastrados em "Outros Canais" ── */}
      {config && channelResults.length > 0 && (
        <div className="mt-3">
          <p className="label-metric mb-1.5">
            Comparativo de canais
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {channelResults.map(c => (
              <div key={c.key} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-secondary/50">
                <span className="text-small font-medium text-foreground truncate">
                  {c.key === bestChannel?.key && (
                    <span className="text-warning mr-0.5">★</span>
                  )}
                  {c.label}
                </span>
                <span className={cn('text-small font-bold font-mono',
                  c.margin >= desiredMargin ? 'text-success' :
                  c.margin >= 0 ? 'text-foreground' : 'text-destructive'
                )}>
                  {c.margin.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* ── FOOTER: stock + ver detalhes ── */}
      <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between">
        <div className={cn('flex items-center gap-1.5 text-small', 
          product.stockQuantity === 0 ? 'text-destructive' :
          product.stockQuantity <= (product.minStockQuantity ?? 5) ? 'text-warning' :
          'text-muted-foreground'
        )}>
          <Package className="w-3.5 h-3.5" />
          <span className="font-medium">{product.stockQuantity ?? 0} un</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); if (onCardClick) onCardClick(product); else onEdit(product); }}
          className="flex items-center gap-1 text-small font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          Ver detalhes <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default React.memo(ProductCard);

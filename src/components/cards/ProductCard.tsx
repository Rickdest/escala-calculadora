import React, { useRef, useCallback } from 'react';
import { Package, MoreVertical, Copy, Trash2, Edit, Upload, ChevronRight } from 'lucide-react';
import { Product, ProductCalculation, StoreConfig } from '@/types/store';
import { cn, getMarginStatus } from '@/lib/utils';
import { calcFullRoas } from '@/lib/roasUtils';
import { getRoasColor } from '@/components/roas/adsHelpers';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ── Taxas por plataforma (faixa única simplificada para comparação rápida) ──
const PLATFORM_FEES: { id: string; name: string; feePercent: number; feeFixed: number }[] = [
  { id: 'shopee',  name: 'Shopee',        feePercent: 20,  feeFixed: 4   },
  { id: 'amazon',  name: 'Amazon',         feePercent: 15,  feeFixed: 0   },
  { id: 'shein',   name: 'Shein',          feePercent: 20,  feeFixed: 0   },
  { id: 'ml',      name: 'Mercado Livre',  feePercent: 14,  feeFixed: 0   },
  { id: 'tiktok',  name: 'TikTok Shop',    feePercent: 12,  feeFixed: 4   },
];

function calcPlatformMargin(
  salePrice: number,
  costPrice: number,
  packagingCost: number,
  feePercent: number,
  feeFixed: number,
  taxes: number
): number {
  const fee = salePrice * (feePercent / 100) + feeFixed;
  const tax = salePrice * (taxes / 100);
  const net = salePrice - costPrice - packagingCost - fee - tax;
  return salePrice > 0 ? (net / salePrice) * 100 : 0;
}

interface ProductCardProps {
  product: Product;
  calculation: ProductCalculation;
  config?: StoreConfig;
  adsMetric?: {
    roas: number;
    acos: number;
    directAcos?: number | null;
    itemsSold: number;
    avgPosition?: number | null;
    directRoas?: number | null;
    spend?: number;
  } | null;
  onEdit: (product: Product) => void;
  onDuplicate: (productId: string) => void;
  onDelete: (productId: string) => void;
  onImportAds?: (productId: string) => void;
  onCardClick?: (product: Product) => void;
  /** @deprecated use onCardClick */
  onTap?: () => void;
  onAdsUpdate?: () => void;
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export function ProductCard({
  product,
  calculation,
  config,
  adsMetric,
  onEdit,
  onDuplicate,
  onDelete,
  onImportAds,
  onCardClick,
  onTap,
  onAdsUpdate,
}: ProductCardProps) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

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
        <h3 className="font-bold text-sm text-foreground truncate">{product.name}</h3>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
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

  // ── Platform margins ──
  const platformMargins = PLATFORM_FEES
    .filter(p => p.id !== 'shopee')
    .map(p => ({
      ...p,
      margin: calcPlatformMargin(
        product.salePrice,
        product.costPrice,
        product.packagingCost,
        p.feePercent,
        p.feeFixed,
        taxes
      ),
    }))
    .sort((a, b) => b.margin - a.margin);

  const bestPlatform = platformMargins[0];

  const roasResult = config ? calcFullRoas(product.salePrice, product.costPrice, config, product.packagingCost) : null;
  const roasEmpate = roasResult?.roasEmpate;

  return (
    <div
      className="rounded-2xl border border-border bg-card p-4 cursor-pointer select-none active:scale-[0.995] transition-all hover:border-primary/30"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onClick={handleClick}
    >
      {cardHeader}

      {/* ── METRICS: inline 3-column ── */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="text-center">
          <p className={cn('font-mono text-lg font-extrabold leading-tight', status.color)}>
            {calculation.realMargin.toFixed(1)}%
          </p>
          <p className="text-[10px] font-medium text-muted-foreground mt-0.5">Margem</p>
        </div>

        <div className="text-center">
          <p className={cn('font-mono text-sm font-extrabold leading-tight', status.color)}>
            {fmt(calculation.netProfit)}
          </p>
          <p className="text-[10px] font-medium text-muted-foreground mt-0.5">Lucro</p>
        </div>

        <div className="text-center">
          <p className="font-mono text-lg font-extrabold leading-tight text-warning">
            {roasEmpate && roasEmpate > 0 ? `${roasEmpate.toFixed(2)}x` : '—'}
          </p>
          <p className="text-[10px] font-medium text-muted-foreground mt-0.5">ROAS empate</p>
        </div>
      </div>

      {/* ── PLATFORMS: 2×2 grid with best highlighted ── */}
      {config && (
        <div className="mt-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Margem em outras plataformas
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {platformMargins.map(p => (
              <div key={p.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-secondary/50">
                <span className="text-[11px] font-medium text-foreground truncate">
                  {p.id === bestPlatform.id && (
                    <span className="text-warning mr-0.5">★</span>
                  )}
                  {p.name}
                </span>
                <span className={cn('text-[11px] font-bold font-mono', 
                  p.margin >= desiredMargin ? 'text-success' :
                  p.margin >= 0 ? 'text-foreground' : 'text-destructive'
                )}>
                  {p.margin.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ADS: compact 3-column card ── */}
      {adsMetric ? (
        <div className="mt-3 pt-3 border-t border-dashed border-border/40">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className={cn('w-1.5 h-1.5 rounded-full', adsMetric.roas >= 5 ? 'bg-success' : adsMetric.roas >= 2 ? 'bg-warning' : 'bg-destructive')} />
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Ads Shopee</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {(() => {
                const pos = adsMetric.avgPosition;
                const hasPos = pos != null && pos > 0;
                const isGreen = hasPos && pos <= 10;
                const isYellow = hasPos && pos > 10 && pos <= 20;
                return (
                  <div className={cn(
                    'rounded-lg border px-2 py-2 text-center',
                    hasPos
                      ? isGreen ? 'bg-success/5 border-success/25'
                        : isYellow ? 'bg-warning/5 border-warning/25'
                        : 'bg-destructive/5 border-destructive/25'
                      : 'border-border/60 bg-secondary/30'
                  )}>
                    <p className="text-[8px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Posição</p>
                    <p className={cn(
                      'font-black font-mono tabular-nums leading-none',
                      hasPos
                        ? isGreen ? 'text-success' : isYellow ? 'text-warning' : 'text-destructive'
                        : 'text-muted-foreground'
                    )}>
                      {hasPos ? (
                        <>
                          <span className="text-[11px]">#</span>
                          <span className="text-[20px]">{pos}</span>
                        </>
                      ) : '—'}
                    </p>
                  </div>
                );
              })()}

              <div className={cn('rounded-lg border px-2 py-2 text-center',
                adsMetric.roas >= 5 ? 'bg-success/5 border-success/25'
                : adsMetric.roas >= 2 ? 'bg-warning/5 border-warning/25'
                : 'bg-destructive/5 border-destructive/25'
              )}>
                <p className="text-[8px] font-bold uppercase tracking-wide text-muted-foreground mb-1">ROAS</p>
                <p className={cn('text-[20px] font-black font-mono tabular-nums leading-none', getRoasColor(adsMetric.roas))}>
                  {adsMetric.roas.toFixed(2)}
                </p>
                {adsMetric.directRoas != null && adsMetric.directRoas > 0 && (
                  <p className="text-[8px] text-muted-foreground font-mono mt-0.5">
                    direto {adsMetric.directRoas.toFixed(2)}
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-border bg-secondary/30 px-2 py-2 text-center">
                <p className="text-[8px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Custo/un</p>
                <p className="text-[15px] font-black font-mono tabular-nums leading-none text-foreground">
                  {adsMetric.spend && adsMetric.itemsSold > 0 ? fmt(adsMetric.spend / adsMetric.itemsSold) : '—'}
                </p>
                {adsMetric.itemsSold > 0 && (
                  <p className="text-[8px] text-muted-foreground font-mono mt-0.5">
                    {adsMetric.itemsSold} vendidos
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); onImportAds?.(product.id); }}
          className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-border/60 bg-transparent hover:bg-secondary transition-colors text-[11px] text-muted-foreground hover:text-foreground"
        >
          <Upload className="w-3.5 h-3.5" />
          Importar relatório de Ads
        </button>
      )}

      {/* ── FOOTER: stock + ver detalhes ── */}
      <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between">
        <div className={cn('flex items-center gap-1.5 text-xs', 
          product.stockQuantity === 0 ? 'text-destructive' :
          product.stockQuantity <= (product.minStockQuantity ?? 5) ? 'text-warning' :
          'text-muted-foreground'
        )}>
          <Package className="w-3.5 h-3.5" />
          <span className="font-medium">{product.stockQuantity ?? 0} un</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); if (onCardClick) onCardClick(product); else onEdit(product); }}
          className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          Ver detalhes <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default React.memo(ProductCard);

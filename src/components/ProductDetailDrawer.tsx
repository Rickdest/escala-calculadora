import { X, Sparkles, Copy, Trash2, Share2, Package } from 'lucide-react';
import { Product, ProductCalculation, StoreConfig, getShopeeFeeForPrice } from '@/types/store';
import { calcProductRoas } from '@/lib/roasUtils';
import { cn, getMarginStatus } from '@/lib/utils';
import { toast } from 'sonner';

interface ProductDetailDrawerProps {
  product: Product;
  calculation: ProductCalculation;
  config: StoreConfig;
  open: boolean;
  onClose: () => void;
  onEdit: (product: Product) => void;
  onDuplicate: (productId: string) => void;
  onDelete: (productId: string) => void;
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export function ProductDetailDrawer({
  product,
  calculation,
  config,
  open,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
}: ProductDetailDrawerProps) {
  if (!open) return null;

  const status = getMarginStatus(calculation.realMargin);
  const roas = calcProductRoas(product, config);
  const marginDiff = calculation.marginDifference;
  const fee = getShopeeFeeForPrice(product.salePrice);

  const costItems = [
    { label: 'Custo do produto', value: product.costPrice, dot: 'bg-primary' },
    { label: `Taxa Shopee (${fee.percent}% + R$${fee.fixed})`, value: calculation.totalShopeeFee, dot: 'bg-warning' },
    { label: 'Embalagem', value: product.packagingCost, dot: 'bg-foreground' },
    { label: `Impostos (${config.taxes}%)`, value: calculation.taxes, dot: 'bg-primary' },
    { label: `Comissão afiliados (${config.affiliateCommission}%)`, value: calculation.affiliateCommission, dot: 'bg-muted-foreground' },
    { label: `Campanhas Shopee (${config.shopeeCampaigns}%)`, value: calculation.shopeeCampaigns, dot: 'bg-muted-foreground' },
    { label: 'Shopee Acelera', value: calculation.shopeeAcelera, dot: 'bg-muted-foreground' },
  ];

  const handleShare = async () => {
    const text = [
      `📊 Análise — ${product.name}`,
      ``,
      `💰 Preço de venda: ${fmt(product.salePrice)}`,
      `📈 Lucro por venda: ${fmt(calculation.netProfit)}`,
      `📉 Margem real: ${calculation.realMargin.toFixed(1)}%`,
      roas.roasEmpate ? `⚡ ROAS de empate: ${roas.roasEmpate.toFixed(2)}x` : '',
      roas.roasSaudavel ? `✅ ROAS saudável: ${roas.roasSaudavel.toFixed(2)}x` : '',
      roas.roasIdeal ? `🎯 ROAS ideal: ${roas.roasIdeal.toFixed(2)}x` : '',
      ``,
      `— Calculado com Precify`,
    ].filter(Boolean).join('\n');

    try {
      await navigator.clipboard.writeText(text);
      toast.success('Resultado copiado!');
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      toast.success('Resultado copiado!');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col md:flex-row md:items-center md:justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Drawer */}
      <div
        className="relative w-full h-full md:h-auto bg-card border border-border flex flex-col animate-slide-up overflow-hidden md:max-w-lg md:max-h-[90vh] md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shrink-0">
              <Package className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground text-sm truncate">{product.name}</h3>
            <p className="text-xs text-muted-foreground">
              Venda {fmt(product.salePrice)} · Custo {fmt(product.costPrice)}
            </p>
            <span className={cn('inline-flex items-center mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full', status.bg, status.color, status.border, 'border')}>
              ✓ {status.label}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg shrink-0">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Key metrics */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-border bg-card p-3 text-center">
              <p className={cn('text-lg font-extrabold font-mono tabular-nums', calculation.netProfit >= 0 ? 'text-success' : 'text-destructive')}>
                {fmt(calculation.netProfit)}
              </p>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Lucro líquido</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 text-center">
              <p className={cn('text-lg font-extrabold font-mono tabular-nums', status.color)}>
                {calculation.realMargin.toFixed(1)}%
              </p>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Margem real</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 text-center">
              <p className={cn('text-lg font-extrabold font-mono tabular-nums', marginDiff >= 0 ? 'text-success' : 'text-destructive')}>
                {marginDiff >= 0 ? '+' : ''}{marginDiff.toFixed(1)}%
              </p>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">vs meta {config.desiredMargin}%</p>
            </div>
          </div>

          {/* Cost breakdown */}
          <div className="rounded-xl border border-border p-4 space-y-2.5">
            <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Breakdown de custos</p>
            <div className="space-y-2">
              {costItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span className={cn('w-2 h-2 rounded-full', item.dot)} />
                    {item.label}
                  </span>
                  <span className="font-bold font-mono tabular-nums text-foreground">
                    {item.value > 0 ? fmt(item.value) : '—'}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-2 flex items-center justify-between text-sm font-bold">
              <span className="text-foreground">Total de custos</span>
              <span className="font-mono tabular-nums text-foreground">{fmt(calculation.totalCosts)}</span>
            </div>
          </div>

          {/* ROAS reference */}
          {!roas.margemInsuficiente && roas.roasEmpate && (
            <div className="rounded-xl border border-border p-4 space-y-3">
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">ROAS de referência (Ads)</p>
              <div className="space-y-2.5">
                {[
                  { label: 'Ponto de empate', value: roas.roasEmpate, color: 'text-destructive', bg: 'bg-destructive', width: '25%' },
                  { label: 'Saudável', value: roas.roasSaudavel, color: 'text-warning', bg: 'bg-warning', width: '55%' },
                  { label: 'Ideal', value: roas.roasIdeal, color: 'text-success', bg: 'bg-success', width: '100%' },
                ].map((row) => row.value != null && (
                  <div key={row.label} className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-32 shrink-0">{row.label}</span>
                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full', row.bg)} style={{ width: row.width }} />
                    </div>
                    <span className={cn('text-sm font-bold font-mono tabular-nums w-12 text-right', row.color)}>
                      {row.value.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Variations */}
          {product.hasVariations && product.variations.length > 0 && (
            <div className="rounded-xl border border-border p-4 space-y-3">
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                Variações · {product.variations.length} opções
              </p>
              <div className="space-y-2">
                {product.variations.map((v, i) => {
                  const label = Object.values(v.attributes).join(' / ');
                  const isLow = v.stockQuantity <= (product.minStockQuantity ?? 5) && v.stockQuantity > 0;
                  const isEmpty = v.stockQuantity === 0;
                  return (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">Estoque: {v.stockQuantity}</span>
                        <span className={cn(
                          'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                          isEmpty ? 'bg-destructive/10 text-destructive border-destructive/30'
                            : isLow ? 'bg-warning/10 text-warning border-warning/30'
                            : 'bg-success/10 text-success border-success/30'
                        )}>
                          {isEmpty ? 'zerado' : isLow ? 'baixo' : 'ok'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stock (no variations) */}
          {!product.hasVariations && (
            <div className="rounded-xl border border-border p-4 space-y-2">
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Estoque</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Quantidade atual</span>
                <span className="font-bold font-mono tabular-nums text-foreground">{product.stockQuantity} un.</span>
              </div>
              {product.stockQuantity <= (product.minStockQuantity ?? 5) && (
                <p className="text-xs text-warning font-medium">
                  ⚠️ Abaixo do mínimo ({product.minStockQuantity ?? 5} un.)
                </p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-border p-4 grid grid-cols-2 gap-2 mobile-sheet-footer md:pb-4 flex-shrink-0">
          <button
            onClick={() => { onEdit(product); onClose(); }}
            className="flex items-center justify-center gap-2 h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-[13px] active:scale-[0.98] transition-transform"
          >
            <Sparkles className="w-4 h-4" />
            Editar produto
          </button>
          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 h-11 rounded-xl bg-secondary text-foreground font-semibold text-[13px] active:scale-[0.98] transition-transform"
          >
            <Share2 className="w-4 h-4" />
            Compartilhar
          </button>
          <button
            onClick={() => { onDuplicate(product.id); onClose(); }}
            className="flex items-center justify-center gap-2 h-11 rounded-xl bg-secondary text-foreground font-semibold text-[13px] active:scale-[0.98] transition-transform"
          >
            <Copy className="w-4 h-4" />
            Duplicar
          </button>
          <button
            onClick={() => { onDelete(product.id); onClose(); }}
            className="flex items-center justify-center gap-2 h-11 rounded-xl border border-destructive/30 text-destructive font-semibold text-[13px] active:scale-[0.98] transition-transform"
          >
            <Trash2 className="w-4 h-4" />
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

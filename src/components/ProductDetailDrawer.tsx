import { useState, useRef, useMemo, useEffect } from 'react';
import { X, Trash2, Share2, Pencil, Package } from 'lucide-react';
import { Product, ProductCalculation, StoreConfig, getShopeeFeeForPrice } from '@/types/store';
import { calculateProduct } from '@/lib/calculateProduct';
import { calcFullRoas } from '@/lib/roasUtils';
import { calcOutrosCanais } from '@/lib/outrosCanaisUtils';
import { cn, getMarginStatus } from '@/lib/utils';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

interface ProductDetailDrawerProps {
  product: Product;
  calculation: ProductCalculation;
  config: StoreConfig;
  open: boolean;
  onClose: () => void;
  onEdit: (product: Product) => void;
  onDuplicate: (productId: string) => void;
  onDelete: (productId: string) => void;
  onSave?: (productData: Partial<Product>) => void | Promise<void>;
}

export function ProductDetailDrawer({
  product,
  calculation,
  config,
  open,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
  onSave,
}: ProductDetailDrawerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [monthlySales, setMonthlySales] = useState(50);

  useEffect(() => {
    setMonthlySales(50);
  }, [product.id]);

  const editCalc = useMemo(() => calculateProduct(product, config), [product, config]);
  const editRoas = useMemo(() => calcFullRoas(product.salePrice, product.costPrice, config, product.packagingCost), [product, config]);

  // Canais cadastrados pelo usuário em "Outros Canais" (cálculo real por canal)
  const { allChannels, bestChannel, hasOutrosCanais } = useMemo(() => {
    const outros = calcOutrosCanais(product.outrosCanais ?? {}, config.taxes ?? 0);
    const shopee = {
      key: 'shopee',
      label: 'Shopee',
      margin: editCalc.realMargin,
      netProfit: editCalc.netProfit,
      salePrice: product.salePrice,
    };
    const all = [shopee, ...outros].sort((a, b) => b.margin - a.margin);
    return { allChannels: all, bestChannel: all[0], hasOutrosCanais: outros.length > 0 };
  }, [product, config, editCalc]);

  const projection = useMemo(() => {
    const revenue = product.salePrice * monthlySales;
    const costs = editCalc.totalCosts * monthlySales;
    const profit = editCalc.netProfit * monthlySales;
    return { revenue, costs, profit, margin: editCalc.realMargin };
  }, [product, editCalc, monthlySales]);

  if (!open) return null;

  const status = getMarginStatus(editCalc.realMargin);
  const fee = getShopeeFeeForPrice(product.salePrice);
  const marginDiff = editCalc.marginDifference;

  const statusBadge = (() => {
    if (editCalc.realMargin < 0) return { text: '✕ Prejuízo', cls: 'bg-destructive/10 text-destructive border-destructive/30' };
    if (editCalc.realMargin < 10) return { text: '⚠ Atenção', cls: 'bg-warning/10 text-warning border-warning/30' };
    const diff = marginDiff >= 0 ? `+${marginDiff.toFixed(1)}` : marginDiff.toFixed(1);
    return { text: `✓ ${status.label} · ${diff}% vs meta`, cls: 'bg-success/10 text-success border-success/30' };
  })();

  const costItems = [
    { label: 'Custo do produto', value: product.costPrice, dot: 'bg-blue-400' },
    { label: `Taxa Shopee (${fee.percent}% + R$${fee.fixed})`, value: editCalc.totalShopeeFee, dot: 'bg-primary' },
    { label: 'Embalagem', value: product.packagingCost, dot: 'bg-purple-400' },
    { label: `Impostos (${config.taxes}%)`, value: editCalc.taxes, dot: 'bg-muted-foreground' },
    { label: `Afiliados (${config.affiliateCommission}%)`, value: editCalc.affiliateCommission, dot: 'bg-muted-foreground' },
    { label: `Campanhas (${config.shopeeCampaigns}%)`, value: editCalc.shopeeCampaigns, dot: 'bg-muted-foreground' },
    { label: 'Shopee Acelera', value: editCalc.shopeeAcelera, dot: 'bg-muted-foreground' },
  ];

  const handleShare = async () => {
    const text = [
      `📊 Análise — ${product.name}`,
      ``,
      `💰 Preço de venda: ${fmt(product.salePrice)}`,
      `📈 Lucro por venda: ${fmt(editCalc.netProfit)}`,
      `📉 Margem real: ${editCalc.realMargin.toFixed(1)}%`,
      editRoas.roasEmpate ? `⚡ ROAS de empate: ${editRoas.roasEmpate.toFixed(2)}x` : '',
      ``,
      `— Calculado com Skalify`,
    ].filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Resultado copiado!');
    } catch {
      toast.success('Resultado copiado!');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative mt-auto w-full h-[90vh] bg-card border-t border-border flex flex-col animate-slide-up overflow-hidden rounded-t-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-2.5 pb-1.5 shrink-0">
          <div className="w-9 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="px-4 pb-3 shrink-0">
          <div className="flex items-start gap-2.5 mb-2">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt="" className="w-10 h-10 rounded-card object-cover shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-card bg-secondary flex items-center justify-center shrink-0">
                <Package className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-subtitle leading-tight truncate">{product.name}</h3>
              <p className="text-small text-muted-foreground font-mono mt-0.5">
                <span className="text-primary font-medium">{fmt(product.salePrice)}</span> venda · custo {fmt(product.costPrice)}
              </p>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0">
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
          <span className={cn('inline-flex items-center text-small font-semibold px-2.5 py-0.5 rounded-full border', statusBadge.cls)}>
            {statusBadge.text}
          </span>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-3 gap-2 px-3.5 pb-3 shrink-0">
          <div className="bg-secondary/50 border border-border rounded-card p-2.5">
            <p className={cn('font-mono text-base font-bold leading-none', editCalc.netProfit >= 0 ? 'text-success' : 'text-destructive')}>
              {fmt(editCalc.netProfit)}
            </p>
            <p className="label-metric">Lucro/un</p>
          </div>
          <div className="bg-secondary/50 border border-border rounded-card p-2.5">
            <p className={cn('font-mono text-base font-bold leading-none', status.color)}>
              {editCalc.realMargin.toFixed(1)}%
            </p>
            <p className="label-metric">Margem</p>
          </div>
          <div className="bg-secondary/50 border border-border rounded-card p-2.5">
            <p className={cn('font-mono text-base font-bold leading-none', marginDiff >= 0 ? 'text-primary' : 'text-destructive')}>
              {marginDiff >= 0 ? '+' : ''}{marginDiff.toFixed(1)}%
            </p>
            <p className="label-metric">vs Meta {config.desiredMargin}%</p>
          </div>
        </div>

        {/* Scrollable content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto pb-4">
          {/* Breakdown de Custos */}
          <div className="border-t border-border px-4 py-3 space-y-1.5">
            <p className="section-label mb-2.5">Breakdown de Custos</p>
            {costItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-1">
                <span className="flex items-center gap-2 text-small text-muted-foreground">
                  <span className={cn('w-[7px] h-[7px] rounded-full', item.dot)} />
                  {item.label}
                </span>
                <span className={cn('font-mono text-small font-medium', item.value > 0 ? 'text-foreground' : 'text-muted-foreground/50')}>
                  {item.value > 0 ? fmt(item.value) : '—'}
                </span>
              </div>
            ))}
            <div className="border-t border-border pt-2 mt-2 flex justify-between">
              <span className="text-body font-semibold text-foreground">Total de custos</span>
              <span className="font-mono text-body font-bold text-destructive">{fmt(editCalc.totalCosts)}</span>
            </div>
          </div>

          {/* ROAS de Referência */}
          {!editRoas.margemInsuficiente && editRoas.roasEmpate && (
            <div className="border-t border-border px-4 py-3">
              <p className="section-label mb-2.5">ROAS de Referência (Ads)</p>
              <div className="space-y-1.5">
                {[
                  { label: 'Ponto de empate', value: editRoas.roasEmpate, color: 'text-destructive', bg: 'bg-destructive', w: 30 },
                  { label: 'Saudável', value: editRoas.roasSaudavel, color: 'text-warning', bg: 'bg-warning', w: 50 },
                  { label: 'Ideal', value: editRoas.roasIdeal, color: 'text-success', bg: 'bg-success', w: 77 },
                ].map((row) => row.value != null && (
                  <div key={row.label} className="flex items-center gap-2">
                    <span className="text-small text-muted-foreground w-[76px] shrink-0">{row.label}</span>
                    <div className="flex-1 h-[5px] bg-secondary rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full', row.bg)} style={{ width: `${row.w}%` }} />
                    </div>
                    <span className={cn('font-mono text-small font-bold w-[30px] text-right', row.color)}>
                      {row.value.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comparativo de Canais — só canais cadastrados */}
          <div className="border-t border-border px-4 py-3">
            <p className="section-label mb-2.5">Comparativo de Canais</p>
            {hasOutrosCanais ? (
              <>
                <div className="grid grid-cols-2 gap-1.5">
                  {allChannels.map(c => (
                    <div key={c.key} className={cn(
                      'bg-secondary/50 border rounded-lg px-2.5 py-2 flex items-center justify-between',
                      c.key === bestChannel?.key ? 'border-primary/25' : 'border-border'
                    )}>
                      <span className="text-small text-muted-foreground flex items-center gap-1">
                        {c.key === bestChannel?.key && <span className="text-primary text-micro">★</span>}
                        {c.label}
                      </span>
                      <span className={cn('font-mono text-small font-bold',
                        c.margin >= config.desiredMargin ? 'text-success' :
                        c.margin >= 0 ? 'text-foreground' : 'text-destructive'
                      )}>
                        {c.margin.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
                {bestChannel && (
                  <div className="mt-3 bg-secondary/50 border border-border rounded-input p-3">
                    <p className="label-metric mb-1.5">🏆 Melhor canal</p>
                    <p className="text-body font-semibold text-foreground">{bestChannel.label} — {bestChannel.margin.toFixed(1)}% de margem</p>
                    {bestChannel.key !== 'shopee' && (
                      <p className="text-small text-muted-foreground mt-0.5">
                        {fmt(bestChannel.netProfit - editCalc.netProfit)}/un a mais que na Shopee
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="bg-secondary/30 border border-dashed border-border rounded-lg p-4 text-center">
                <p className="text-small text-muted-foreground mb-2">
                  Nenhum outro canal cadastrado para este produto.
                </p>
                <button
                  onClick={() => { onEdit(product); onClose(); }}
                  className="text-small font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  Preencher "Outros Canais" →
                </button>
              </div>
            )}
          </div>

          {/* Projeção Mensal */}
          <div className="border-t border-border px-4 py-3.5">
            <p className="section-label mb-3">Projeção Mensal</p>
            <div className="flex items-center gap-2.5 mb-2.5">
              <span className="text-small text-muted-foreground flex-1">Vendas por mês</span>
              <input
                value={monthlySales}
                onChange={e => setMonthlySales(Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)))}
                type="number"
                className="w-14 h-8 bg-secondary border border-border rounded-[7px] text-center font-mono text-sm font-semibold text-primary outline-none"
              />
            </div>
            <Slider
              value={[monthlySales]}
              onValueChange={([v]) => setMonthlySales(v)}
              min={1}
              max={1000}
              step={1}
              className="mb-4"
            />
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-secondary/50 border border-border rounded-lg p-2.5">
                <p className="font-mono text-sm font-bold text-success">{fmt(projection.revenue)}</p>
                <p className="label-metric text-muted-foreground">Receita bruta</p>
              </div>
              <div className="bg-secondary/50 border border-border rounded-lg p-2.5">
                <p className="font-mono text-sm font-bold text-destructive">{fmt(projection.costs)}</p>
                <p className="label-metric text-muted-foreground">Custos totais</p>
              </div>
              <div className="bg-secondary/50 border border-border rounded-lg p-2.5">
                <p className={cn('font-mono text-sm font-bold', projection.profit >= 0 ? 'text-success' : 'text-destructive')}>{fmt(projection.profit)}</p>
                <p className="label-metric text-muted-foreground">Lucro mensal</p>
              </div>
              <div className="bg-secondary/50 border border-border rounded-lg p-2.5">
                <p className={cn('font-mono text-sm font-bold', status.color)}>{projection.margin.toFixed(1)}%</p>
                <p className="label-metric text-muted-foreground">Margem</p>
              </div>
            </div>
            <div className={cn(
              'mt-2.5 py-2.5 px-3 rounded-input border text-center text-small font-medium',
              projection.profit >= 0 ? 'bg-success/5 border-success/20 text-success' : 'bg-destructive/5 border-destructive/20 text-destructive'
            )}>
              {projection.profit >= 0
                ? `✓ Lucrativo com ${monthlySales} vendas/mês`
                : `✕ Prejuízo com ${monthlySales} vendas/mês`}
            </div>
          </div>

          {/* Estoque */}
          <div className="border-t border-border px-4 py-3">
            <p className="section-label mb-2.5">Estoque</p>
            <div className="flex items-center justify-between">
              <span className="text-body text-muted-foreground">Quantidade atual</span>
              <span className="font-mono text-xl font-bold text-foreground">{product.stockQuantity} un.</span>
            </div>
            {product.stockQuantity <= (product.minStockQuantity ?? 5) && (
              <p className="text-small text-warning font-medium mt-1">
                ⚠ Abaixo do mínimo ({product.minStockQuantity ?? 5} un.)
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-card border-t border-border flex gap-2">
          <button
            onClick={() => { onDelete(product.id); onClose(); }}
            className="h-11 px-3.5 rounded-button bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleShare}
            className="h-11 px-3.5 rounded-button bg-transparent text-muted-foreground border border-border flex items-center justify-center"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => { onEdit(product); onClose(); }}
            className="flex-[2] h-11 rounded-button font-semibold text-body flex items-center justify-center gap-1.5 bg-primary text-primary-foreground"
          >
            <Pencil className="w-4 h-4" />
            Editar produto
          </button>
        </div>
      </div>
    </div>
  );
}

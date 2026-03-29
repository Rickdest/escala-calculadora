import { useState, useRef, useMemo, useEffect } from 'react';
import { X, Trash2, Share2, Sparkles, Save, Package } from 'lucide-react';
import { Product, ProductCalculation, StoreConfig, getShopeeFeeForPrice } from '@/types/store';
import { calcFullRoas } from '@/lib/roasUtils';
import { calculateProduct as calculateProductFn } from '@/lib/calculateProduct';
import { calcOutrosCanais, getBestChannel, ChannelResult } from '@/lib/outrosCanaisUtils';
import { cn, getMarginStatus } from '@/lib/utils';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';

/* ── helpers ── */
const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const PLATFORM_FEES = [
  { id: 'shopee', name: 'Shopee', feePercent: 20, feeFixed: 4 },
  { id: 'amazon', name: 'Amazon', feePercent: 15, feeFixed: 0 },
  { id: 'shein', name: 'Shein', feePercent: 20, feeFixed: 0 },
  { id: 'ml', name: 'Mercado Livre', feePercent: 14, feeFixed: 0 },
  { id: 'tiktok', name: 'TikTok Shop', feePercent: 12, feeFixed: 4 },
];

function calcPlatformMargin(sp: number, cp: number, pkg: number, fp: number, ff: number, tax: number) {
  const fee = sp * (fp / 100) + ff;
  const t = sp * (tax / 100);
  const net = sp - cp - pkg - fee - t;
  return sp > 0 ? (net / sp) * 100 : 0;
}

type DrawerTab = 'resumo' | 'editar' | 'projecao' | 'canais';

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
  const [tab, setTab] = useState<DrawerTab>('resumo');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [monthlySales, setMonthlySales] = useState(50);

  // Edit form state
  const [editName, setEditName] = useState(product.name);
  const [editCost, setEditCost] = useState(product.costPrice.toString());
  const [editSale, setEditSale] = useState(product.salePrice.toString());
  const [editPkg, setEditPkg] = useState(product.packagingCost.toString());

  // Edit preview calc
  const editCalc = useMemo(() => {
    const sp = parseFloat(editSale) || 0;
    const cp = parseFloat(editCost) || 0;
    const pkg = parseFloat(editPkg) || 0;
    if (sp <= 0 || cp <= 0 || !config) return null;
    const draft = { ...product, costPrice: cp, salePrice: sp, packagingCost: pkg, name: editName };
    return calculateProductFn(draft, config);
  }, [editName, editCost, editSale, editPkg, config, product]);

  // Channels
  const channelResults = useMemo(() => {
    if (!product.outrosCanais) return [];
    return calcOutrosCanais(product.outrosCanais, config.taxes);
  }, [product.outrosCanais, config.taxes]);

  const allPlatformMargins = useMemo(() => {
    const taxes = config.taxes ?? 0;
    return PLATFORM_FEES.map(p => ({
      ...p,
      margin: calcPlatformMargin(product.salePrice, product.costPrice, product.packagingCost, p.feePercent, p.feeFixed, taxes),
    })).sort((a, b) => b.margin - a.margin);
  }, [product, config]);

  // Projection
  const projection = useMemo(() => {
    const revenue = product.salePrice * monthlySales;
    const costs = calculation.totalCosts * monthlySales;
    const profit = calculation.netProfit * monthlySales;
    return { revenue, costs, profit, margin: calculation.realMargin };
  }, [product, calculation, monthlySales]);

  // Reset on product change
  useEffect(() => {
    setEditName(product.name);
    setEditCost(product.costPrice.toString());
    setEditSale(product.salePrice.toString());
    setEditPkg(product.packagingCost.toString());
    setTab('resumo');
  }, [product.id]);

  // Scroll to top on tab change
  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [tab]);

  if (!open) return null;

  const status = getMarginStatus(calculation.realMargin);
  const roas = calcFullRoas(product.salePrice, product.costPrice, config, product.packagingCost);
  const marginDiff = calculation.marginDifference;
  const fee = getShopeeFeeForPrice(product.salePrice);

  // Edit preview calc
  const editCalc = useMemo(() => {
    const sp = parseFloat(editSale) || 0;
    const cp = parseFloat(editCost) || 0;
    const pkg = parseFloat(editPkg) || 0;
    if (sp <= 0 || cp <= 0) return null;
    const draft = { ...product, costPrice: cp, salePrice: sp, packagingCost: pkg, name: editName };
    return calculateProductFn(draft, config);
  }, [editName, editCost, editSale, editPkg, config, product]);

  // Channels
  const channelResults = useMemo(() => {
    if (!product.outrosCanais) return [];
    return calcOutrosCanais(product.outrosCanais, config.taxes);
  }, [product.outrosCanais, config.taxes]);

  const allPlatformMargins = useMemo(() => {
    const taxes = config.taxes ?? 0;
    return PLATFORM_FEES.map(p => ({
      ...p,
      margin: calcPlatformMargin(product.salePrice, product.costPrice, product.packagingCost, p.feePercent, p.feeFixed, taxes),
    })).sort((a, b) => b.margin - a.margin);
  }, [product, config]);

  const bestPlatform = allPlatformMargins[0];
  const shopeeMargin = allPlatformMargins.find(p => p.id === 'shopee');

  // Status badge
  const statusBadge = (() => {
    if (calculation.realMargin < 0) return { text: '✕ Prejuízo', cls: 'bg-destructive/10 text-destructive border-destructive/30' };
    if (calculation.realMargin < 10) return { text: '⚠ Atenção', cls: 'bg-warning/10 text-warning border-warning/30' };
    const diff = marginDiff >= 0 ? `+${marginDiff.toFixed(1)}` : marginDiff.toFixed(1);
    return { text: `✓ ${status.label} · ${diff}% vs meta`, cls: 'bg-success/10 text-success border-success/30' };
  })();

  const costItems = [
    { label: 'Custo do produto', value: product.costPrice, dot: 'bg-blue-400' },
    { label: `Taxa Shopee (${fee.percent}% + R$${fee.fixed})`, value: calculation.totalShopeeFee, dot: 'bg-primary' },
    { label: 'Embalagem', value: product.packagingCost, dot: 'bg-purple-400' },
    { label: `Impostos (${config.taxes}%)`, value: calculation.taxes, dot: 'bg-muted-foreground' },
    { label: `Afiliados (${config.affiliateCommission}%)`, value: calculation.affiliateCommission, dot: 'bg-muted-foreground' },
    { label: `Campanhas (${config.shopeeCampaigns}%)`, value: calculation.shopeeCampaigns, dot: 'bg-muted-foreground' },
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
      ``,
      `— Calculado com Precify`,
    ].filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Resultado copiado!');
    } catch {
      toast.success('Resultado copiado!');
    }
  };

  const handleSaveEdit = async () => {
    if (onSave) {
      await onSave({
        name: editName,
        costPrice: parseFloat(editCost) || product.costPrice,
        salePrice: parseFloat(editSale) || product.salePrice,
        packagingCost: parseFloat(editPkg) || 0,
      });
      setTab('resumo');
    } else {
      onEdit({ ...product, name: editName, costPrice: parseFloat(editCost) || product.costPrice, salePrice: parseFloat(editSale) || product.salePrice, packagingCost: parseFloat(editPkg) || 0 });
      onClose();
    }
  };

  // Projection
  const projection = useMemo(() => {
    const revenue = product.salePrice * monthlySales;
    const costs = calculation.totalCosts * monthlySales;
    const profit = calculation.netProfit * monthlySales;
    return { revenue, costs, profit, margin: calculation.realMargin };
  }, [product, calculation, monthlySales]);

  const tabs: { id: DrawerTab; label: string }[] = [
    { id: 'resumo', label: 'Resumo' },
    { id: 'editar', label: 'Editar' },
    { id: 'projecao', label: 'Projeção' },
    { id: 'canais', label: 'Canais' },
  ];

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
              <img src={product.imageUrl} alt="" className="w-10 h-10 rounded-[10px] object-cover shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-[10px] bg-secondary flex items-center justify-center shrink-0">
                <Package className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm leading-tight truncate">{product.name}</h3>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                <span className="text-primary font-medium">{fmt(product.salePrice)}</span> venda · custo {fmt(product.costPrice)}
              </p>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0">
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
          <span className={cn('inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full border', statusBadge.cls)}>
            {statusBadge.text}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex px-4 border-b border-border shrink-0">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex-1 text-center py-2 text-xs font-medium border-b-2 transition-colors -mb-px',
                tab === t.id ? 'text-primary border-primary' : 'text-muted-foreground border-transparent'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto pb-24">
          {/* ── TAB RESUMO ── */}
          {tab === 'resumo' && (
            <>
              {/* 3 metrics */}
              <div className="grid grid-cols-3 gap-2 p-3.5">
                <div className="bg-secondary/50 border border-border rounded-[10px] p-2.5">
                  <p className={cn('font-mono text-base font-bold leading-none', calculation.netProfit >= 0 ? 'text-success' : 'text-destructive')}>
                    {fmt(calculation.netProfit)}
                  </p>
                  <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mt-1">Lucro/un</p>
                </div>
                <div className="bg-secondary/50 border border-border rounded-[10px] p-2.5">
                  <p className={cn('font-mono text-base font-bold leading-none', status.color)}>
                    {calculation.realMargin.toFixed(1)}%
                  </p>
                  <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mt-1">Margem</p>
                </div>
                <div className="bg-secondary/50 border border-border rounded-[10px] p-2.5">
                  <p className={cn('font-mono text-base font-bold leading-none', marginDiff >= 0 ? 'text-primary' : 'text-destructive')}>
                    {marginDiff >= 0 ? '+' : ''}{marginDiff.toFixed(1)}%
                  </p>
                  <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mt-1">vs Meta {config.desiredMargin}%</p>
                </div>
              </div>

              {/* Breakdown */}
              <div className="border-t border-border px-4 py-3 space-y-1.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2.5">Breakdown de Custos</p>
                {costItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className={cn('w-[7px] h-[7px] rounded-full', item.dot)} />
                      {item.label}
                    </span>
                    <span className={cn('font-mono text-xs font-medium', item.value > 0 ? 'text-foreground' : 'text-muted-foreground/50')}>
                      {item.value > 0 ? fmt(item.value) : '—'}
                    </span>
                  </div>
                ))}
                <div className="border-t border-border pt-2 mt-2 flex justify-between">
                  <span className="text-[13px] font-semibold text-foreground">Total de custos</span>
                  <span className="font-mono text-sm font-bold text-destructive">{fmt(calculation.totalCosts)}</span>
                </div>
              </div>

              {/* ROAS */}
              {!roas.margemInsuficiente && roas.roasEmpate && (
                <div className="border-t border-border px-4 py-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2.5">ROAS de Referência (Ads)</p>
                  <div className="space-y-1.5">
                    {[
                      { label: 'Ponto de empate', value: roas.roasEmpate, color: 'text-destructive', bg: 'bg-destructive', w: 30 },
                      { label: 'Saudável', value: roas.roasSaudavel, color: 'text-warning', bg: 'bg-warning', w: 50 },
                      { label: 'Ideal', value: roas.roasIdeal, color: 'text-success', bg: 'bg-success', w: 77 },
                    ].map((row) => row.value != null && (
                      <div key={row.label} className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground w-[76px] shrink-0">{row.label}</span>
                        <div className="flex-1 h-[5px] bg-secondary rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full', row.bg)} style={{ width: `${row.w}%` }} />
                        </div>
                        <span className={cn('font-mono text-xs font-bold w-[30px] text-right', row.color)}>
                          {row.value.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stock */}
              <div className="border-t border-border px-4 py-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2.5">Estoque</p>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-muted-foreground">Quantidade atual</span>
                  <span className="font-mono text-xl font-bold text-foreground">{product.stockQuantity} un.</span>
                </div>
                {product.stockQuantity <= (product.minStockQuantity ?? 5) && (
                  <p className="text-[11px] text-warning font-medium mt-1">
                    ⚠ Abaixo do mínimo ({product.minStockQuantity ?? 5} un.)
                  </p>
                )}
              </div>
            </>
          )}

          {/* ── TAB EDITAR ── */}
          {tab === 'editar' && (
            <div className="px-4 py-3.5 space-y-3">
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Nome do produto *</label>
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full h-[42px] bg-secondary border border-border rounded-[9px] px-3 text-sm text-foreground font-sans"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Preço de custo *</label>
                  <div className="flex items-center h-[42px] bg-secondary border border-border rounded-[9px] px-3">
                    <span className="text-muted-foreground font-mono text-[13px] mr-1.5">R$</span>
                    <input
                      value={editCost}
                      onChange={e => setEditCost(e.target.value)}
                      type="number"
                      className="flex-1 bg-transparent text-foreground font-mono text-[15px] font-medium outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Preço de venda *</label>
                  <div className="flex items-center h-[42px] bg-secondary border border-border rounded-[9px] px-3">
                    <span className="text-muted-foreground font-mono text-[13px] mr-1.5">R$</span>
                    <input
                      value={editSale}
                      onChange={e => setEditSale(e.target.value)}
                      type="number"
                      className="flex-1 bg-transparent text-foreground font-mono text-[15px] font-medium outline-none"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Embalagem e insumos</label>
                <div className="flex items-center h-[42px] bg-secondary border border-border rounded-[9px] px-3">
                  <span className="text-muted-foreground font-mono text-[13px] mr-1.5">R$</span>
                  <input
                    value={editPkg}
                    onChange={e => setEditPkg(e.target.value)}
                    type="number"
                    className="flex-1 bg-transparent text-foreground font-mono text-[15px] font-medium outline-none"
                  />
                </div>
              </div>

              {/* Preview card */}
              {editCalc && (
                <div className="bg-success/5 border border-success/20 rounded-[10px] p-3">
                  <p className="text-[10px] font-bold text-success uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    📊 Prévia do Cálculo
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="font-mono text-lg font-bold text-success">{fmt(editCalc.netProfit)}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Lucro líquido</p>
                    </div>
                    <div>
                      <p className="font-mono text-lg font-bold text-success">{editCalc.realMargin.toFixed(1)}%</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Margem real</p>
                    </div>
                  </div>
                  <div className="border-t border-success/20 mt-2 pt-2 flex justify-between text-[11px] text-muted-foreground">
                    <span>Taxa Shopee (automática)</span>
                    <span className="font-mono">{fmt(editCalc.totalShopeeFee)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB PROJEÇÃO ── */}
          {tab === 'projecao' && (
            <div className="px-4 py-3.5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Simulação Mensal</p>
              <div className="flex items-center gap-2.5 mb-2.5">
                <span className="text-xs text-muted-foreground flex-1">Vendas por mês</span>
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
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Receita bruta</p>
                </div>
                <div className="bg-secondary/50 border border-border rounded-lg p-2.5">
                  <p className="font-mono text-sm font-bold text-destructive">{fmt(projection.costs)}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Custos totais</p>
                </div>
                <div className="bg-secondary/50 border border-border rounded-lg p-2.5">
                  <p className={cn('font-mono text-sm font-bold', projection.profit >= 0 ? 'text-success' : 'text-destructive')}>{fmt(projection.profit)}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Lucro mensal</p>
                </div>
                <div className="bg-secondary/50 border border-border rounded-lg p-2.5">
                  <p className={cn('font-mono text-sm font-bold', status.color)}>{projection.margin.toFixed(1)}%</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Margem</p>
                </div>
              </div>
              <div className={cn(
                'mt-2.5 py-2.5 px-3 rounded-[9px] border text-center text-xs font-medium',
                projection.profit >= 0 ? 'bg-success/5 border-success/20 text-success' : 'bg-destructive/5 border-destructive/20 text-destructive'
              )}>
                {projection.profit >= 0
                  ? `✓ Lucrativo com ${monthlySales} vendas/mês`
                  : `✕ Prejuízo com ${monthlySales} vendas/mês`}
              </div>
            </div>
          )}

          {/* ── TAB CANAIS ── */}
          {tab === 'canais' && (
            <div className="px-4 py-3.5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Margem em Outras Plataformas</p>
              <div className="grid grid-cols-2 gap-1.5">
                {allPlatformMargins.map(p => (
                  <div key={p.id} className={cn(
                    'bg-secondary/50 border rounded-lg px-2.5 py-2 flex items-center justify-between',
                    p.id === bestPlatform?.id ? 'border-primary/25' : 'border-border'
                  )}>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      {p.id === bestPlatform?.id && <span className="text-primary text-[10px]">★</span>}
                      {p.name}
                    </span>
                    <span className={cn('font-mono text-xs font-bold',
                      p.margin >= config.desiredMargin ? 'text-success' :
                      p.margin >= 0 ? 'text-foreground' : 'text-destructive'
                    )}>
                      {p.margin.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
              {bestPlatform && shopeeMargin && (
                <div className="mt-3 bg-secondary/50 border border-border rounded-[9px] p-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">🏆 Melhor canal</p>
                  <p className="text-[13px] font-semibold text-foreground">{bestPlatform.name} — {bestPlatform.margin.toFixed(1)}% de margem</p>
                  {bestPlatform.id !== 'shopee' && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {fmt(((bestPlatform.margin - shopeeMargin.margin) / 100) * product.salePrice)}/un a mais que na Shopee
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-3 pb-5 bg-gradient-to-t from-card via-card to-transparent flex gap-2">
          <button
            onClick={() => { onDelete(product.id); onClose(); }}
            className="h-11 px-3.5 rounded-[11px] bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleShare}
            className="h-11 px-3.5 rounded-[11px] bg-transparent text-muted-foreground border border-border flex items-center justify-center"
          >
            <Share2 className="w-4 h-4" />
          </button>
          {tab === 'editar' ? (
            <button
              onClick={handleSaveEdit}
              className="flex-[2] h-11 rounded-[11px] bg-success text-white font-semibold text-sm flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              Salvar alterações
            </button>
          ) : (
            <button
              onClick={() => setTab('editar')}
              className="flex-[2] h-11 rounded-[11px] bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              Editar produto
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

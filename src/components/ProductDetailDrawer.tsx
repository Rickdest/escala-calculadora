import { useState, useRef, useMemo, useEffect } from 'react';
import { X, Trash2, Share2, Pencil, Package, Save, ChevronDown } from 'lucide-react';
import { Product, ProductCalculation, StoreConfig, getShopeeFeeForPrice } from '@/types/store';
import { calculateProduct } from '@/lib/calculateProduct';
import { calcFullRoas } from '@/lib/roasUtils';
import { calcOutrosCanais } from '@/lib/outrosCanaisUtils';
import { cn, getMarginStatus } from '@/lib/utils';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
  const [activeTab, setActiveTab] = useState<'info' | 'edit'>('info');

  // Edit state
  const [editName, setEditName] = useState(product.name);
  const [editCost, setEditCost] = useState(product.costPrice);
  const [editSale, setEditSale] = useState(product.salePrice);
  const [editPkg, setEditPkg] = useState(product.packagingCost);
  const [optionalOpen, setOptionalOpen] = useState(false);

  // Sync edit state when product changes
  useEffect(() => {
    setEditName(product.name);
    setEditCost(product.costPrice);
    setEditSale(product.salePrice);
    setEditPkg(product.packagingCost);
    setActiveTab('info');
  }, [product.id]);

  // Live calculation from edited values
  const editedProduct = useMemo(() => ({
    ...product,
    name: editName,
    costPrice: editCost,
    salePrice: editSale,
    packagingCost: editPkg,
  }), [product, editName, editCost, editSale, editPkg]);

  const editCalc = useMemo(() => calculateProduct(editedProduct, config), [editedProduct, config]);
  const editRoas = useMemo(() => calcFullRoas(editSale, editCost, config, editPkg), [editSale, editCost, config, editPkg]);

  const hasChanges = editName !== product.name || editCost !== product.costPrice || editSale !== product.salePrice || editPkg !== product.packagingCost;

  // Platform margins (from edited values)
  const allPlatformMargins = useMemo(() => {
    const taxes = config.taxes ?? 0;
    return PLATFORM_FEES.map(p => ({
      ...p,
      margin: calcPlatformMargin(editSale, editCost, editPkg, p.feePercent, p.feeFixed, taxes),
    })).sort((a, b) => b.margin - a.margin);
  }, [editSale, editCost, editPkg, config]);

  // Projection (from edited values)
  const projection = useMemo(() => {
    const revenue = editSale * monthlySales;
    const costs = editCalc.totalCosts * monthlySales;
    const profit = editCalc.netProfit * monthlySales;
    return { revenue, costs, profit, margin: editCalc.realMargin };
  }, [editSale, editCalc, monthlySales]);

  if (!open) return null;

  const status = getMarginStatus(editCalc.realMargin);
  const fee = getShopeeFeeForPrice(editSale);
  const marginDiff = editCalc.marginDifference;
  const bestPlatform = allPlatformMargins[0];
  const shopeeMargin = allPlatformMargins.find(p => p.id === 'shopee');

  const statusBadge = (() => {
    if (editCalc.realMargin < 0) return { text: '✕ Prejuízo', cls: 'bg-destructive/10 text-destructive border-destructive/30' };
    if (editCalc.realMargin < 10) return { text: '⚠ Atenção', cls: 'bg-warning/10 text-warning border-warning/30' };
    const diff = marginDiff >= 0 ? `+${marginDiff.toFixed(1)}` : marginDiff.toFixed(1);
    return { text: `✓ ${status.label} · ${diff}% vs meta`, cls: 'bg-success/10 text-success border-success/30' };
  })();

  const costItems = [
    { label: 'Custo do produto', value: editCalc.totalCosts > 0 ? editCost : 0, dot: 'bg-blue-400' },
    { label: `Taxa Shopee (${fee.percent}% + R$${fee.fixed})`, value: editCalc.totalShopeeFee, dot: 'bg-primary' },
    { label: 'Embalagem', value: editPkg, dot: 'bg-purple-400' },
    { label: `Impostos (${config.taxes}%)`, value: editCalc.taxes, dot: 'bg-muted-foreground' },
    { label: `Afiliados (${config.affiliateCommission}%)`, value: editCalc.affiliateCommission, dot: 'bg-muted-foreground' },
    { label: `Campanhas (${config.shopeeCampaigns}%)`, value: editCalc.shopeeCampaigns, dot: 'bg-muted-foreground' },
    { label: 'Shopee Acelera', value: editCalc.shopeeAcelera, dot: 'bg-muted-foreground' },
  ];

  const handleShare = async () => {
    const text = [
      `📊 Análise — ${editName}`,
      ``,
      `💰 Preço de venda: ${fmt(editSale)}`,
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

  const handleSave = async () => {
    if (!onSave) return;
    await onSave({
      name: editName,
      costPrice: editCost,
      salePrice: editSale,
      packagingCost: editPkg,
    });
    toast.success('Produto atualizado!');
    onClose();
  };

  const inputClass = "w-full h-[38px] bg-secondary border border-border rounded-lg px-3 font-mono text-body text-foreground outline-none focus:border-primary focus:shadow-[0_0_0_2px_rgba(249,115,22,0.1)] transition-colors";

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
              <h3 className="font-semibold text-foreground text-subtitle leading-tight truncate">{editName}</h3>
              <p className="text-small text-muted-foreground font-mono mt-0.5">
                <span className="text-primary font-medium">{fmt(editSale)}</span> venda · custo {fmt(editCost)}
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

        {/* Tabs */}
        <div className="flex border-b border-border shrink-0">
          <button
            onClick={() => setActiveTab('info')}
            className={cn(
              'flex-1 py-2.5 text-xs font-bold text-center transition-colors border-b-2',
              activeTab === 'info'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground'
            )}
          >
            📋 Informações
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={cn(
              'flex-1 py-2.5 text-xs font-bold text-center transition-colors border-b-2',
              activeTab === 'edit'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground'
            )}
          >
            ✏ Editar
          </button>
        </div>

        {/* Scrollable content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto pb-4">

          {/* ═══ ABA INFO ═══ */}
          {activeTab === 'info' && (
            <>
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

              {/* Margem por Canal */}
              <div className="border-t border-border px-4 py-3">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="section-label">Margem em Outras Plataformas</p>
                  <button
                    onClick={() => setActiveTab('edit')}
                    className="text-micro text-primary font-medium"
                  >
                    Editar taxas ✎
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {allPlatformMargins.map(p => (
                    <div key={p.id} className={cn(
                      'bg-secondary/50 border rounded-lg px-2.5 py-2 flex items-center justify-between',
                      p.id === bestPlatform?.id ? 'border-primary/25' : 'border-border'
                    )}>
                      <span className="text-small text-muted-foreground flex items-center gap-1">
                        {p.id === bestPlatform?.id && <span className="text-primary text-micro">★</span>}
                        {p.name}
                      </span>
                      <span className={cn('font-mono text-small font-bold',
                        p.margin >= config.desiredMargin ? 'text-success' :
                        p.margin >= 0 ? 'text-foreground' : 'text-destructive'
                      )}>
                        {p.margin.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
                {bestPlatform && shopeeMargin && (
                  <div className="mt-3 bg-secondary/50 border border-border rounded-input p-3">
                    <p className="label-metric mb-1.5">🏆 Melhor canal</p>
                    <p className="text-body font-semibold text-foreground">{bestPlatform.name} — {bestPlatform.margin.toFixed(1)}% de margem</p>
                    {bestPlatform.id !== 'shopee' && (
                      <p className="text-small text-muted-foreground mt-0.5">
                        {fmt(((bestPlatform.margin - shopeeMargin.margin) / 100) * editSale)}/un a mais que na Shopee
                      </p>
                    )}
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
            </>
          )}

          {/* ═══ ABA EDITAR ═══ */}
          {activeTab === 'edit' && (
            <>
              {/* Dados do Produto */}
              <div className="px-4 py-3.5 space-y-3">
                <p className="text-micro uppercase text-primary font-semibold tracking-wider flex items-center gap-1.5">
                  <Pencil className="w-3 h-3" /> Dados do produto
                </p>

                {/* Nome */}
                <div>
                  <label className="text-micro uppercase text-muted-foreground mb-1.5 block tracking-wider">Nome do produto</label>
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className={inputClass}
                  />
                </div>

                {/* Custo | Venda */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-micro uppercase text-muted-foreground mb-1.5 block tracking-wider">Custo (R$)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-small">R$</span>
                      <input
                        type="number"
                        value={editCost || ''}
                        onChange={e => setEditCost(Number(e.target.value) || 0)}
                        className={cn(inputClass, 'pl-9')}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-micro uppercase text-muted-foreground mb-1.5 block tracking-wider">Venda (R$)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-small">R$</span>
                      <input
                        type="number"
                        value={editSale || ''}
                        onChange={e => setEditSale(Number(e.target.value) || 0)}
                        className={cn(inputClass, 'pl-9')}
                      />
                    </div>
                  </div>
                </div>

                {/* Embalagem */}
                <div>
                  <label className="text-micro uppercase text-muted-foreground mb-1.5 block tracking-wider">Embalagem (R$)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-small">R$</span>
                    <input
                      type="number"
                      value={editPkg || ''}
                      onChange={e => setEditPkg(Number(e.target.value) || 0)}
                      className={cn(inputClass, 'pl-9')}
                    />
                  </div>
                </div>
              </div>

              {/* Preview live */}
              <div className="mx-4 bg-success/10 border border-success/20 rounded-card p-2.5 flex items-center justify-between">
                <div className="text-center flex-1">
                  <p className={cn('font-mono text-small font-bold', editCalc.netProfit >= 0 ? 'text-success' : 'text-destructive')}>
                    {fmt(editCalc.netProfit)}
                  </p>
                  <p className="text-micro text-muted-foreground">Lucro/un</p>
                </div>
                <div className="w-px h-6 bg-success/20" />
                <div className="text-center flex-1">
                  <p className={cn('font-mono text-small font-bold', status.color)}>
                    {editCalc.realMargin.toFixed(1)}%
                  </p>
                  <p className="text-micro text-muted-foreground">Margem</p>
                </div>
                <div className="w-px h-6 bg-success/20" />
                <div className="text-center flex-1">
                  <p className="font-mono text-small font-bold text-foreground">
                    {editRoas.roasEmpate ? editRoas.roasEmpate.toFixed(2) : '—'}
                  </p>
                  <p className="text-micro text-muted-foreground">ROAS emp.</p>
                </div>
              </div>

              {/* Taxas por Canal */}
              <div className="border-t border-border mt-3.5 px-4 py-3.5 space-y-2">
                <p className="text-micro uppercase text-muted-foreground font-semibold tracking-wider">Taxas por canal</p>
                {PLATFORM_FEES.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-1.5">
                    <div className="flex-1 min-w-0">
                      <span className="text-small text-foreground font-medium">{p.name}</span>
                      <span className="text-micro text-muted-foreground ml-1.5">
                        {p.feeFixed > 0 ? `${p.feePercent}% + R$${p.feeFixed}` : `${p.feePercent}%`}
                      </span>
                    </div>
                    <div className="relative w-[72px]">
                      <input
                        type="number"
                        value={p.feePercent}
                        readOnly
                        className="w-full h-[32px] bg-secondary border border-border rounded-lg px-2 pr-6 font-mono text-small text-foreground text-right outline-none"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-micro">%</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Custos opcionais */}
              <div className="border-t border-border px-4 py-3">
                <Collapsible open={optionalOpen} onOpenChange={setOptionalOpen}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full py-1">
                    <span className="text-micro uppercase text-muted-foreground font-semibold tracking-wider">Custos opcionais</span>
                    <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform', optionalOpen && 'rotate-180')} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-small text-muted-foreground">Impostos</span>
                      <span className="font-mono text-small text-foreground">{config.taxes}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-small text-muted-foreground">Afiliados</span>
                      <span className="font-mono text-small text-foreground">{config.affiliateCommission}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-small text-muted-foreground">Campanhas Shopee</span>
                      <span className="font-mono text-small text-foreground">{config.shopeeCampaigns}%</span>
                    </div>
                    <p className="text-micro text-muted-foreground/60 pt-1">
                      Esses valores vêm das configurações da loja.
                    </p>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </>
          )}
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

          {activeTab === 'info' ? (
            <button
              onClick={() => setActiveTab('edit')}
              className="flex-[2] h-11 rounded-button font-semibold text-body flex items-center justify-center gap-1.5 bg-primary text-primary-foreground"
            >
              <Pencil className="w-4 h-4" />
              Editar produto
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className={cn(
                'flex-[2] h-11 rounded-button font-semibold text-body flex items-center justify-center gap-1.5 transition-colors',
                hasChanges
                  ? 'bg-success text-white'
                  : 'bg-secondary text-muted-foreground border border-border'
              )}
            >
              <Save className="w-4 h-4" />
              Salvar alterações
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

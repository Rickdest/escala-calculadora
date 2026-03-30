import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Share2, Save, Package, Camera } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
import { Product, StoreConfig, getShopeeFeeForPrice } from '@/types/store';
import { calculateProduct as calculateProductFn } from '@/lib/calculateProduct';
import { calcFullRoas } from '@/lib/roasUtils';
import { calcOutrosCanais, getBestChannel } from '@/lib/outrosCanaisUtils';
import { cn, getMarginStatus } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { AppLayout } from '@/components/layout/AppLayout';
import { toast } from 'sonner';

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

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentStore, updateProduct, deleteProduct, calculateProduct } = useStore();

  const product = currentStore?.products.find(p => p.id === id);
  const config = currentStore?.config;

  useEffect(() => {
    if (!currentStore) return;
    if (currentStore.products.length > 0 && !product) {
      toast.error('Produto não encontrado');
      navigate('/products', { replace: true });
    }
  }, [product, currentStore, navigate]);

  // Edit state
  const [editName, setEditName] = useState('');
  const [editCost, setEditCost] = useState('');
  const [editSale, setEditSale] = useState('');
  const [editPkg, setEditPkg] = useState('');
  const [monthlySales, setMonthlySales] = useState(50);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setEditName(product.name);
      setEditCost(product.costPrice.toString());
      setEditSale(product.salePrice.toString());
      setEditPkg(product.packagingCost.toString());
    }
  }, [product?.id]);

  if (!product || !config) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  const calculation = calculateProduct(product, config);
  const status = getMarginStatus(calculation.realMargin);
  const roas = calcFullRoas(product.salePrice, product.costPrice, config, product.packagingCost);
  const marginDiff = calculation.marginDifference;
  const fee = getShopeeFeeForPrice(product.salePrice);

  // Live edit preview
  const editCalc = (() => {
    const sp = parseFloat(editSale) || 0;
    const cp = parseFloat(editCost) || 0;
    const pkg = parseFloat(editPkg) || 0;
    if (sp <= 0 || cp <= 0) return null;
    const draft = { ...product, costPrice: cp, salePrice: sp, packagingCost: pkg, name: editName };
    return calculateProductFn(draft, config);
  })();

  const allPlatformMargins = PLATFORM_FEES.map(p => ({
    ...p,
    margin: calcPlatformMargin(product.salePrice, product.costPrice, product.packagingCost, p.feePercent, p.feeFixed, config.taxes ?? 0),
  })).sort((a, b) => b.margin - a.margin);

  const bestPlatform = allPlatformMargins[0];
  const shopeeMargin = allPlatformMargins.find(p => p.id === 'shopee');

  const costItems = [
    { label: 'Custo do produto', value: product.costPrice, dot: 'bg-blue-400' },
    { label: `Taxa Shopee (${fee.percent}% + R$${fee.fixed})`, value: calculation.totalShopeeFee, dot: 'bg-primary' },
    { label: 'Embalagem', value: product.packagingCost, dot: 'bg-purple-400' },
    { label: `Impostos (${config.taxes}%)`, value: calculation.taxes, dot: 'bg-muted-foreground' },
    { label: `Afiliados (${config.affiliateCommission}%)`, value: calculation.affiliateCommission, dot: 'bg-muted-foreground' },
    { label: `Campanhas (${config.shopeeCampaigns}%)`, value: calculation.shopeeCampaigns, dot: 'bg-muted-foreground' },
    { label: 'Shopee Acelera', value: calculation.shopeeAcelera, dot: 'bg-muted-foreground' },
  ];

  const projection = {
    revenue: product.salePrice * monthlySales,
    costs: calculation.totalCosts * monthlySales,
    profit: calculation.netProfit * monthlySales,
    margin: calculation.realMargin,
  };

  const statusBadge = (() => {
    if (calculation.realMargin < 0) return { text: '✕ Prejuízo', cls: 'bg-destructive/10 text-destructive border-destructive/30' };
    if (calculation.realMargin < 10) return { text: '⚠ Atenção', cls: 'bg-warning/10 text-warning border-warning/30' };
    const diff = marginDiff >= 0 ? `+${marginDiff.toFixed(1)}` : marginDiff.toFixed(1);
    return { text: `✓ ${status.label} · ${diff}% vs meta`, cls: 'bg-success/10 text-success border-success/30' };
  })();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProduct(product.id, {
        name: editName,
        costPrice: parseFloat(editCost) || product.costPrice,
        salePrice: parseFloat(editSale) || product.salePrice,
        packagingCost: parseFloat(editPkg) || 0,
      });
      toast.success('Produto atualizado!');
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    await deleteProduct(product.id);
    navigate('/products', { replace: true });
    toast.success('Produto excluído');
  };

  const handleShare = async () => {
    const text = [
      `📊 Análise — ${product.name}`,
      `💰 Preço de venda: ${fmt(product.salePrice)}`,
      `📈 Lucro por venda: ${fmt(calculation.netProfit)}`,
      `📉 Margem real: ${calculation.realMargin.toFixed(1)}%`,
      roas.roasEmpate ? `⚡ ROAS de empate: ${roas.roasEmpate.toFixed(2)}x` : '',
      `— Calculado com Skalify`,
    ].filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Resultado copiado!');
    } catch { toast.success('Resultado copiado!'); }
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center gap-3 py-4 border-b border-border mb-6">
        <button onClick={() => navigate('/products')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Produtos
        </button>
        <div className="flex-1 flex items-center gap-3 min-w-0">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-bold text-foreground text-base truncate">{product.name}</h1>
            <p className="text-xs text-muted-foreground font-mono">
              <span className="text-primary font-medium">{fmt(product.salePrice)}</span> venda · custo {fmt(product.costPrice)}
            </p>
          </div>
        </div>
        <button onClick={handleDelete} className="h-9 px-3 rounded-lg border border-destructive/30 text-destructive text-xs font-medium flex items-center gap-1.5 hover:bg-destructive/5 transition-colors">
          <Trash2 className="w-3.5 h-3.5" /> Excluir
        </button>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-[2fr_3fr] gap-8 pb-12">
        {/* ── LEFT: Form ── */}
        <div className="space-y-5">
          <h2 className="text-lg font-bold text-foreground">Editar produto</h2>

          {/* Image */}
          <div className="w-full aspect-square max-w-[200px] rounded-2xl bg-secondary border border-border flex items-center justify-center cursor-pointer hover:border-primary/30 transition-colors overflow-hidden">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center text-muted-foreground">
                <Camera className="w-8 h-8 mx-auto mb-1" />
                <p className="text-xs">Foto do produto</p>
              </div>
            )}
          </div>

          {/* Fields */}
          <div className="space-y-3">
            <div>
              <label className="label-field">Nome do produto *</label>
              <input value={editName} onChange={e => setEditName(e.target.value)}
                className="w-full h-11 bg-secondary border border-border rounded-xl px-3 text-sm text-foreground" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-field">Preço de custo *</label>
                <div className="flex items-center h-11 bg-secondary border border-border rounded-xl px-3">
                  <span className="text-muted-foreground font-mono text-sm mr-1.5">R$</span>
                  <input value={editCost} onChange={e => setEditCost(e.target.value)} type="number"
                    className="flex-1 bg-transparent text-foreground font-mono text-sm font-medium outline-none" />
                </div>
              </div>
              <div>
                <label className="label-field">Preço de venda *</label>
                <div className="flex items-center h-11 bg-secondary border border-border rounded-xl px-3">
                  <span className="text-muted-foreground font-mono text-sm mr-1.5">R$</span>
                  <input value={editSale} onChange={e => setEditSale(e.target.value)} type="number"
                    className="flex-1 bg-transparent text-foreground font-mono text-sm font-medium outline-none" />
                </div>
              </div>
            </div>
            <div>
              <label className="label-field">Embalagem e insumos</label>
              <div className="flex items-center h-11 bg-secondary border border-border rounded-xl px-3">
                <span className="text-muted-foreground font-mono text-sm mr-1.5">R$</span>
                <input value={editPkg} onChange={e => setEditPkg(e.target.value)} type="number"
                  className="flex-1 bg-transparent text-foreground font-mono text-sm font-medium outline-none" />
              </div>
            </div>
          </div>

          {/* Save button */}
          <button onClick={handleSave} disabled={isSaving}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50">
            <Save className="w-4 h-4" />
            {isSaving ? 'Salvando...' : 'Salvar alterações'}
          </button>
          <button onClick={handleShare} className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors">
            Compartilhar resultado ↗
          </button>
        </div>

        {/* ── RIGHT: Live results ── */}
        <div className="space-y-5">
          {/* Status badge */}
          <span className={cn('inline-flex items-center text-small font-semibold px-3 py-1 rounded-full border', statusBadge.cls)}>
            {statusBadge.text}
          </span>

          {/* Bloco 1 — Key Metrics */}
          <div className="surface-card p-5">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className={cn('font-mono text-2xl font-bold', calculation.netProfit >= 0 ? 'text-success' : 'text-destructive')}>
                  {fmt(editCalc ? editCalc.netProfit : calculation.netProfit)}
                </p>
                <p className="label-metric">Lucro/un</p>
              </div>
              <div>
                <p className={cn('font-mono text-2xl font-bold', status.color)}>
                  {(editCalc ? editCalc.realMargin : calculation.realMargin).toFixed(1)}%
                </p>
                <p className="label-metric">Margem real</p>
              </div>
              <div>
                <p className={cn('font-mono text-2xl font-bold', marginDiff >= 0 ? 'text-primary' : 'text-destructive')}>
                  {marginDiff >= 0 ? '+' : ''}{(editCalc ? editCalc.marginDifference : marginDiff).toFixed(1)}%
                </p>
                <p className="label-metric">vs Meta {config.desiredMargin}%</p>
              </div>
            </div>
          </div>

          {/* Bloco 2 — Breakdown */}
          <div className="surface-card p-5 space-y-2">
            <p className="section-label mb-3">Breakdown de Custos</p>
            {costItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-1">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className={cn('w-2 h-2 rounded-full', item.dot)} />
                  {item.label}
                </span>
                <span className={cn('font-mono text-sm font-medium', item.value > 0 ? 'text-foreground' : 'text-muted-foreground/50')}>
                  {item.value > 0 ? fmt(item.value) : '—'}
                </span>
              </div>
            ))}
            <div className="border-t border-border pt-2 mt-2 flex justify-between">
              <span className="text-sm font-semibold text-foreground">Total de custos</span>
              <span className="font-mono text-sm font-bold text-destructive">{fmt(calculation.totalCosts)}</span>
            </div>
          </div>

          {/* Bloco 3 — ROAS */}
          {!roas.margemInsuficiente && roas.roasEmpate && (
            <div className="surface-card p-5">
              <p className="section-label mb-3">ROAS de Referência (Ads)</p>
              <div className="space-y-2">
                {[
                  { label: 'Ponto de empate', value: roas.roasEmpate, color: 'text-destructive', bg: 'bg-destructive', w: 30 },
                  { label: 'Saudável', value: roas.roasSaudavel, color: 'text-warning', bg: 'bg-warning', w: 50 },
                  { label: 'Ideal', value: roas.roasIdeal, color: 'text-success', bg: 'bg-success', w: 77 },
                ].map((row) => row.value != null && (
                  <div key={row.label} className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-32 shrink-0">{row.label}</span>
                    <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full', row.bg)} style={{ width: `${row.w}%` }} />
                    </div>
                    <span className={cn('font-mono text-sm font-bold w-12 text-right', row.color)}>
                      {row.value.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bloco 4 — Channels */}
          <div className="surface-card p-5">
            <p className="section-label mb-3">Comparativo de Canais</p>
            <div className="grid grid-cols-2 gap-2">
              {allPlatformMargins.map(p => (
                <div key={p.id} className={cn(
                  'bg-secondary/50 border rounded-lg px-3 py-2.5 flex items-center justify-between',
                  p.id === bestPlatform?.id ? 'border-primary/25' : 'border-border'
                )}>
                  <span className="text-small text-muted-foreground flex items-center gap-1">
                    {p.id === bestPlatform?.id && <span className="text-primary text-micro">🏆</span>}
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
            {bestPlatform && shopeeMargin && bestPlatform.id !== 'shopee' && (
              <div className="mt-3 bg-secondary/30 border border-border rounded-lg p-3">
                <p className="text-small font-semibold text-foreground">{bestPlatform.name} — {bestPlatform.margin.toFixed(1)}% de margem</p>
                <p className="text-small text-muted-foreground mt-0.5">
                  {fmt(((bestPlatform.margin - shopeeMargin.margin) / 100) * product.salePrice)}/un a mais que na Shopee
                </p>
              </div>
            )}
          </div>

          {/* Bloco 5 — Projection */}
          <div className="surface-card p-5">
            <p className="section-label mb-3">Projeção Mensal</p>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm text-muted-foreground flex-1">Vendas por mês</span>
              <input value={monthlySales} onChange={e => setMonthlySales(Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)))}
                type="number" className="w-16 h-9 bg-secondary border border-border rounded-lg text-center font-mono text-sm font-semibold text-primary outline-none" />
            </div>
            <Slider value={[monthlySales]} onValueChange={([v]) => setMonthlySales(v)} min={1} max={1000} step={1} className="mb-4" />
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-secondary/50 border border-border rounded-lg p-3">
                <p className="font-mono text-base font-bold text-success">{fmt(projection.revenue)}</p>
                <p className="label-metric text-muted-foreground">Receita bruta</p>
              </div>
              <div className="bg-secondary/50 border border-border rounded-lg p-3">
                <p className="font-mono text-base font-bold text-destructive">{fmt(projection.costs)}</p>
                <p className="label-metric text-muted-foreground">Custos totais</p>
              </div>
              <div className="bg-secondary/50 border border-border rounded-lg p-3">
                <p className={cn('font-mono text-base font-bold', projection.profit >= 0 ? 'text-success' : 'text-destructive')}>{fmt(projection.profit)}</p>
                <p className="label-metric text-muted-foreground">Lucro mensal</p>
              </div>
              <div className="bg-secondary/50 border border-border rounded-lg p-3">
                <p className={cn('font-mono text-base font-bold', status.color)}>{projection.margin.toFixed(1)}%</p>
                <p className="label-metric text-muted-foreground">Margem</p>
              </div>
            </div>
          </div>

          {/* Bloco 6 — Stock */}
          <div className="surface-card p-5">
            <p className="section-label mb-3">Estoque</p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Quantidade atual</span>
              <span className="font-mono text-2xl font-bold text-foreground">{product.stockQuantity} un.</span>
            </div>
            {product.stockQuantity <= (product.minStockQuantity ?? 5) && (
              <p className="text-small text-warning font-medium mt-1.5">
                ⚠ Abaixo do mínimo ({product.minStockQuantity ?? 5} un.)
              </p>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

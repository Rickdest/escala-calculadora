import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Share2, Package, Pencil, MoreVertical, Wallet, Target, BarChart3, Boxes, TrendingUp } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
import { getShopeeFeeForPrice } from '@/types/store';
import { calcFullRoas } from '@/lib/roasUtils';
import { cn, getMarginStatus } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProductForm } from '@/components/forms/ProductForm';
import { calcOutrosCanais } from '@/lib/outrosCanaisUtils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductTrendTab } from '@/components/products/trend/ProductTrendTab';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

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

  const [monthlySales, setMonthlySales] = useState(50);
  const [showProductForm, setShowProductForm] = useState(false);

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

  // Canais cadastrados pelo usuário em "Outros Canais" (cálculo real por canal)
  const outrosCanaisResults = calcOutrosCanais(product.outrosCanais ?? {}, config.taxes ?? 0);
  const shopeeChannel = {
    key: 'shopee',
    label: 'Shopee',
    margin: calculation.realMargin,
    netProfit: calculation.netProfit,
    salePrice: product.salePrice,
  };
  const allChannels = [shopeeChannel, ...outrosCanaisResults].sort((a, b) => b.margin - a.margin);
  const bestChannel = allChannels[0];
  const hasOutrosCanais = outrosCanaisResults.length > 0;

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

  const stockLow = product.stockQuantity <= (product.minStockQuantity ?? 5);

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

  const handleProductFormSave = async (data: any) => {
    await updateProduct(product.id, data);
    setShowProductForm(false);
    toast.success('Produto atualizado!');
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 md:px-8 pb-28 md:pb-12">
        {/* Breadcrumb */}
        <button
          onClick={() => navigate('/products')}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Produtos
        </button>

        {/* Header */}
        <div className="flex items-start gap-3 md:gap-4 pb-5 md:pb-6 border-b border-border mb-5 md:mb-6">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt="" className="w-12 h-12 md:w-20 md:h-20 rounded-xl md:rounded-2xl object-cover shrink-0" />
          ) : (
            <div className="w-12 h-12 md:w-20 md:h-20 rounded-xl md:rounded-2xl bg-secondary flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 md:w-7 md:h-7 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-foreground text-base md:text-xl leading-tight mb-1 md:mb-1.5 line-clamp-2">{product.name}</h1>
            <p className="text-xs md:text-sm text-muted-foreground font-mono mb-1.5 md:mb-2">
              <span className="text-primary font-semibold">{fmt(product.salePrice)}</span> <span className="hidden md:inline">venda · </span><span className="md:hidden">·</span> custo {fmt(product.costPrice)}
            </p>
            <span className={cn('hidden md:inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border', statusBadge.cls)}>
              {statusBadge.text}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowProductForm(true)}
              className="hidden md:flex h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold items-center gap-1.5 hover:bg-primary/90 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" /> Editar
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-10 w-10 rounded-lg border border-border text-muted-foreground flex items-center justify-center hover:bg-secondary transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleShare} className="cursor-pointer">
                  <Share2 className="w-4 h-4 mr-2" /> Compartilhar análise
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Excluir produto
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Status badge — mobile only (desktop é inline no header) */}
        <div className="md:hidden mb-4 -mt-2">
          <span className={cn('inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border', statusBadge.cls)}>
            {statusBadge.text}
          </span>
        </div>

        {/* Hero Metrics — 4 KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 md:mb-6">
          <div className="surface-card p-4">
            <p className={cn('font-mono text-2xl md:text-2xl font-bold', calculation.netProfit >= 0 ? 'text-success' : 'text-destructive')}>
              {fmt(calculation.netProfit)}
            </p>
            <p className="label-metric mt-1">Lucro/un</p>
          </div>
          <div className={cn('surface-card p-4 border-l-2',
            calculation.realMargin < 0 ? 'border-l-destructive' :
            calculation.realMargin < 10 ? 'border-l-warning' : 'border-l-success'
          )}>
            <p className={cn('font-mono text-2xl md:text-2xl font-bold', status.color)}>
              {calculation.realMargin.toFixed(1)}%
            </p>
            <p className="label-metric mt-1">Margem real</p>
          </div>
          <div className="surface-card p-4">
            <p className={cn('font-mono text-2xl md:text-2xl font-bold', marginDiff >= 0 ? 'text-primary' : 'text-destructive')}>
              {marginDiff >= 0 ? '+' : ''}{marginDiff.toFixed(1)}%
            </p>
            <p className="label-metric mt-1">vs Meta {config.desiredMargin}%</p>
          </div>
          <div className="surface-card p-4">
            <p className={cn('font-mono text-2xl md:text-2xl font-bold', roas.roasEmpate ? 'text-foreground' : 'text-muted-foreground/50')}>
              {roas.roasEmpate ? `${roas.roasEmpate.toFixed(2)}x` : '—'}
            </p>
            <p className="label-metric mt-1">ROAS empate</p>
          </div>
        </div>

        {/* Grid 2 colunas */}
        <div className="grid md:grid-cols-2 gap-5 mb-5">
          {/* Coluna esquerda — Breakdown */}
          <div className="surface-card p-5">
            <p className="section-label mb-3 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              Breakdown de Custos
            </p>
            <div className="space-y-1">
              {costItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-1.5">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className={cn('w-2 h-2 rounded-full', item.dot)} />
                    {item.label}
                  </span>
                  <span className={cn('font-mono text-sm font-medium', item.value > 0 ? 'text-foreground' : 'text-muted-foreground/50')}>
                    {item.value > 0 ? fmt(item.value) : '—'}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-3 mt-3 flex justify-between">
              <span className="text-sm font-semibold text-foreground">Total de custos</span>
              <span className="font-mono text-sm font-bold text-destructive">{fmt(calculation.totalCosts)}</span>
            </div>
          </div>

          {/* Coluna direita — ROAS + Canais + Estoque */}
          <div className="flex flex-col gap-5">
            {/* ROAS */}
            {!roas.margemInsuficiente && roas.roasEmpate && (
              <div className="surface-card p-5">
                <p className="section-label mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  ROAS de Referência (Ads)
                </p>
                <div className="space-y-2.5">
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

            {/* Canais */}
            <div className="surface-card p-5 order-2 md:order-none">
              <p className="section-label mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Comparativo de Canais
              </p>
              {hasOutrosCanais ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {allChannels.map(c => (
                      <div key={c.key} className={cn(
                        'bg-secondary/50 border rounded-lg px-3 py-2.5 flex items-center justify-between',
                        c.key === bestChannel?.key ? 'border-primary/25' : 'border-border'
                      )}>
                        <span className="text-small text-muted-foreground flex items-center gap-1">
                          {c.key === bestChannel?.key && <span className="text-primary text-micro">🏆</span>}
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
                  {bestChannel && bestChannel.key !== 'shopee' && (
                    <div className="mt-3 bg-secondary/30 border border-border rounded-lg p-3">
                      <p className="text-small font-semibold text-foreground">{bestChannel.label} — {bestChannel.margin.toFixed(1)}% de margem</p>
                      <p className="text-small text-muted-foreground mt-0.5">
                        {fmt(bestChannel.netProfit - calculation.netProfit)}/un a mais que na Shopee
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-secondary/30 border border-dashed border-border rounded-lg p-4 text-center">
                  <p className="text-small text-muted-foreground mb-2">
                    Nenhum outro canal cadastrado para este produto.
                  </p>
                  <button
                    onClick={() => setShowProductForm(true)}
                    className="text-small font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    Preencher "Outros Canais" →
                  </button>
                </div>
              )}
            </div>

            {/* Estoque */}
            <div className={cn(
              'surface-card p-5 border order-1 md:order-none',
              stockLow ? 'border-warning/40' : 'border-border'
            )}>
              <div className="flex items-center justify-between mb-2">
                <p className="section-label flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-primary" />
                  Estoque
                </p>
                {stockLow && (
                  <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/30">
                    ⚠ Reposição
                  </span>
                )}
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">Quantidade atual</span>
                <span className="font-mono text-2xl font-bold text-foreground">{product.stockQuantity} un.</span>
              </div>
              {stockLow && (
                <p className="text-small text-warning font-medium mt-2">
                  Abaixo do mínimo ({product.minStockQuantity ?? 5} un.)
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Projeção Mensal — full width */}
        <div className="surface-card p-5">
          <p className="section-label mb-3">Projeção Mensal</p>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm text-muted-foreground flex-1">Vendas por mês</span>
            <input value={monthlySales} onChange={e => setMonthlySales(Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)))}
              type="number" className="w-16 h-9 bg-secondary border border-border rounded-lg text-center font-mono text-sm font-semibold text-primary outline-none" />
          </div>
          <Slider value={[monthlySales]} onValueChange={([v]) => setMonthlySales(v)} min={1} max={1000} step={1} className="mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
      </div>

      {/* CTA flutuante mobile-only — acima do BottomNavigation */}
      <div className="md:hidden fixed bottom-16 left-0 right-0 z-40 px-4 py-3 bg-background/95 backdrop-blur-sm border-t border-border">
        <button
          onClick={() => setShowProductForm(true)}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors active:scale-[0.98]"
        >
          <Pencil className="w-4 h-4" /> Editar produto
        </button>
      </div>

      {/* ProductForm Modal */}
      {showProductForm && (
        <ProductForm
          product={product}
          onClose={() => setShowProductForm(false)}
          onSave={handleProductFormSave}
        />
      )}
    </AppLayout>
  );
}

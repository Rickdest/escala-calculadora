import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Trash2, Share2, Package, Pencil, MoreVertical, Wallet, Target,
  BarChart3, Boxes, TrendingUp, DollarSign, Percent, Gauge, Zap, ChevronDown, Store,
} from 'lucide-react';
import { MarketplacesTab } from '@/components/products/MarketplacesTab';
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

const SALES_PRESETS = [30, 50, 100, 200, 500];

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
  const [showAllCosts, setShowAllCosts] = useState(false);

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
  const bestChannelMargin = Math.max(...allChannels.map(c => Math.abs(c.margin)), 1);

  const allCostItems = [
    { label: 'Custo do produto', value: product.costPrice, color: 'hsl(217 91% 60%)' },
    { label: `Taxa Shopee (${fee.percent}% + R$${fee.fixed})`, value: calculation.totalShopeeFee, color: 'hsl(var(--primary))' },
    { label: 'Embalagem', value: product.packagingCost, color: 'hsl(271 91% 65%)' },
    { label: `Impostos (${config.taxes}%)`, value: calculation.taxes, color: 'hsl(48 96% 53%)' },
    { label: `Afiliados (${config.affiliateCommission}%)`, value: calculation.affiliateCommission, color: 'hsl(173 80% 40%)' },
    { label: `Campanhas (${config.shopeeCampaigns}%)`, value: calculation.shopeeCampaigns, color: 'hsl(330 81% 60%)' },
    { label: 'Shopee Acelera', value: calculation.shopeeAcelera, color: 'hsl(24 95% 53%)' },
  ];
  const visibleCosts = showAllCosts ? allCostItems : allCostItems.filter(c => c.value > 0);
  const hiddenCount = allCostItems.length - allCostItems.filter(c => c.value > 0).length;

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

  // Estoque: estimativa de dias (usa monthlySales como proxy)
  const dailySales = monthlySales / 30;
  const stockDays = dailySales > 0 ? Math.round(product.stockQuantity / dailySales) : null;
  const minStock = product.minStockQuantity ?? 5;
  const stockLow = product.stockQuantity <= minStock;
  const stockMedium = !stockLow && product.stockQuantity <= minStock * 2;
  const stockMax = Math.max(minStock * 4, product.stockQuantity, 1);
  const stockPct = Math.min(100, (product.stockQuantity / stockMax) * 100);
  const stockBarColor = stockLow ? 'bg-destructive' : stockMedium ? 'bg-warning' : 'bg-success';

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
      <div className="max-w-6xl mx-auto px-4 md:px-8 pb-36 md:pb-12">
        {/* Breadcrumb */}
        <button
          onClick={() => navigate('/products')}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-3 md:py-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Produtos
        </button>

        {/* Header */}
        <div className="flex items-start gap-3 md:gap-4 pb-4 md:pb-6 border-b border-border mb-4 md:mb-6">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt="" className="w-14 h-14 md:w-20 md:h-20 rounded-xl md:rounded-2xl object-cover shrink-0" />
          ) : (
            <div className="w-14 h-14 md:w-20 md:h-20 rounded-xl md:rounded-2xl bg-secondary flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 md:w-7 md:h-7 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-foreground text-base md:text-xl leading-tight mb-1.5 line-clamp-2 md:line-clamp-2">
              {product.name}
            </h1>
            {/* Micro-row: preço + custo */}
            <div className="flex items-center gap-1.5 text-xs md:text-sm text-muted-foreground font-mono mb-1.5 md:mb-2 flex-wrap">
              <span className="text-primary font-semibold">{fmt(product.salePrice)}</span>
              <span className="text-muted-foreground/50">·</span>
              <span>custo {fmt(product.costPrice)}</span>
            </div>
            {/* Status badge — único, dentro do header */}
            <span className={cn('inline-flex items-center text-[11px] md:text-xs font-semibold px-2 md:px-2.5 py-0.5 md:py-1 rounded-full border', statusBadge.cls)}>
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
                <button className="h-9 w-9 md:h-10 md:w-10 rounded-lg border border-border text-muted-foreground flex items-center justify-center hover:bg-secondary transition-colors">
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

        <Tabs defaultValue="analise" className="w-full">
          <TabsList className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border border-border h-10 mb-4 md:mb-5 w-full grid grid-cols-2 md:inline-flex md:w-auto md:bg-secondary/50">
            <TabsTrigger value="analise" className="text-xs md:text-sm data-[state=active]:bg-background min-w-0">
              <BarChart3 className="w-3.5 h-3.5 mr-1 md:mr-1.5 shrink-0" />
              <span className="truncate">Análise</span>
            </TabsTrigger>
            <TabsTrigger value="tendencia" className="text-xs md:text-sm data-[state=active]:bg-background min-w-0">
              <TrendingUp className="w-3.5 h-3.5 mr-1 md:mr-1.5 shrink-0" />
              <span className="truncate">Tendência</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analise" className="mt-0 space-y-4 md:space-y-5">
            {/* Hero KPI tiles 2x2 mobile / 4 cols desktop */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
              {/* Lucro/un */}
              <div className={cn(
                'surface-card p-3 md:p-4 border-l-2 relative overflow-hidden',
                calculation.netProfit >= 0 ? 'border-l-success' : 'border-l-destructive'
              )}>
                <DollarSign className="absolute top-2 right-2 w-3 h-3 text-muted-foreground/40" />
                <p className={cn(
                  'font-mono text-lg md:text-2xl font-bold tabular-nums truncate',
                  calculation.netProfit >= 0 ? 'text-success' : 'text-destructive'
                )}>
                  {fmt(calculation.netProfit)}
                </p>
                <p className="label-metric mt-0.5 md:mt-1">Lucro/un</p>
              </div>

              {/* Margem real */}
              <div className={cn('surface-card p-3 md:p-4 border-l-2 relative overflow-hidden',
                calculation.realMargin < 0 ? 'border-l-destructive' :
                calculation.realMargin < 10 ? 'border-l-warning' : 'border-l-success'
              )}>
                <Percent className="absolute top-2 right-2 w-3 h-3 text-muted-foreground/40" />
                <p className={cn('font-mono text-lg md:text-2xl font-bold tabular-nums truncate', status.color)}>
                  {calculation.realMargin.toFixed(1)}%
                </p>
                <p className="label-metric mt-0.5 md:mt-1">Margem real</p>
              </div>

              {/* vs Meta */}
              <div className={cn('surface-card p-3 md:p-4 border-l-2 relative overflow-hidden',
                marginDiff >= 0 ? 'border-l-primary' : 'border-l-destructive'
              )}>
                <Target className="absolute top-2 right-2 w-3 h-3 text-muted-foreground/40" />
                <p className={cn('font-mono text-lg md:text-2xl font-bold tabular-nums truncate', marginDiff >= 0 ? 'text-primary' : 'text-destructive')}>
                  {marginDiff >= 0 ? '+' : ''}{marginDiff.toFixed(1)}%
                </p>
                <p className="label-metric mt-0.5 md:mt-1">vs Meta {config.desiredMargin}%</p>
              </div>

              {/* ROAS empate */}
              <div className={cn('surface-card p-3 md:p-4 border-l-2 relative overflow-hidden',
                roas.roasEmpate ? 'border-l-foreground/30' : 'border-l-muted-foreground/20'
              )}>
                <Gauge className="absolute top-2 right-2 w-3 h-3 text-muted-foreground/40" />
                <p className={cn('font-mono text-lg md:text-2xl font-bold tabular-nums truncate', roas.roasEmpate ? 'text-foreground' : 'text-muted-foreground/50')}>
                  {roas.roasEmpate ? `${roas.roasEmpate.toFixed(2)}x` : '—'}
                </p>
                <p className="label-metric mt-0.5 md:mt-1">ROAS empate</p>
              </div>
            </div>

            {/* Grid 2 colunas */}
            <div className="grid md:grid-cols-2 gap-4 md:gap-5">
              {/* Coluna esquerda — Breakdown */}
              <div className="surface-card p-4 md:p-5">
                <p className="section-label mb-3 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-primary" />
                  Breakdown de Custos
                </p>

                {/* Stack bar visual */}
                {calculation.totalCosts > 0 && (
                  <div className="mb-4">
                    <div className="h-2 w-full rounded-full overflow-hidden flex bg-secondary">
                      {allCostItems.filter(c => c.value > 0).map((item) => {
                        const pct = (item.value / calculation.totalCosts) * 100;
                        return (
                          <div
                            key={item.label}
                            style={{ width: `${pct}%`, background: item.color }}
                            title={`${item.label}: ${pct.toFixed(1)}%`}
                          />
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      Distribuição proporcional dos custos
                    </p>
                  </div>
                )}

                <div className="space-y-1">
                  {visibleCosts.map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 py-1.5">
                      <span className="flex items-center gap-2 text-sm text-muted-foreground min-w-0 flex-1">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: item.color }}
                        />
                        <span className="truncate">{item.label}</span>
                      </span>
                      <span className={cn(
                        'font-mono text-sm font-medium tabular-nums w-24 text-right shrink-0',
                        item.value > 0 ? 'text-foreground' : 'text-muted-foreground/50'
                      )}>
                        {item.value > 0 ? fmt(item.value) : '—'}
                      </span>
                    </div>
                  ))}
                </div>

                {hiddenCount > 0 && !showAllCosts && (
                  <button
                    onClick={() => setShowAllCosts(true)}
                    className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1"
                  >
                    <ChevronDown className="w-3 h-3" />
                    Ver {hiddenCount} {hiddenCount === 1 ? 'item zerado' : 'itens zerados'}
                  </button>
                )}

                <div className="border-t border-border pt-3 mt-3 flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-foreground">Total de custos</span>
                  <span className="font-mono text-sm font-bold text-destructive tabular-nums">{fmt(calculation.totalCosts)}</span>
                </div>
              </div>

              {/* Coluna direita */}
              <div className="flex flex-col gap-4 md:gap-5">
                {/* ROAS — chips empilhados */}
                {!roas.margemInsuficiente && roas.roasEmpate && (
                  <div className="surface-card p-4 md:p-5">
                    <p className="section-label mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      ROAS de Referência (Ads)
                    </p>
                    <div className="space-y-2.5">
                      {[
                        { label: 'Ponto de empate', value: roas.roasEmpate, bg: 'bg-destructive', chip: 'bg-destructive/10 text-destructive border-destructive/30', w: 30 },
                        { label: 'Saudável', value: roas.roasSaudavel, bg: 'bg-warning', chip: 'bg-warning/10 text-warning border-warning/30', w: 60 },
                        { label: 'Ideal', value: roas.roasIdeal, bg: 'bg-success', chip: 'bg-success/10 text-success border-success/30', w: 90 },
                      ].map((row) => row.value != null && (
                        <div key={row.label}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs md:text-sm text-muted-foreground">{row.label}</span>
                            <span className={cn('font-mono text-xs md:text-sm font-bold px-2 py-0.5 rounded-md border tabular-nums', row.chip)}>
                              {row.value.toFixed(2)}x
                            </span>
                          </div>
                          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div className={cn('h-full rounded-full transition-all', row.bg)} style={{ width: `${row.w}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Canais — lista vertical no mobile, 2 col desktop */}
                <div className="surface-card p-4 md:p-5">
                  <p className="section-label mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    Comparativo de Canais
                  </p>
                  {hasOutrosCanais ? (
                    <>
                      <div className="space-y-2 md:grid md:grid-cols-2 md:gap-2 md:space-y-0">
                        {allChannels.map(c => {
                          const widthPct = Math.min(100, (Math.abs(c.margin) / bestChannelMargin) * 100);
                          const isBest = c.key === bestChannel?.key;
                          return (
                            <div key={c.key} className={cn(
                              'bg-secondary/50 border rounded-lg px-3 py-2.5',
                              isBest ? 'border-primary/30' : 'border-border'
                            )}>
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="text-xs md:text-sm text-muted-foreground flex items-center gap-1 min-w-0">
                                  {isBest && <span className="text-primary text-xs shrink-0">🏆</span>}
                                  <span className="truncate">{c.label}</span>
                                </span>
                                <span className={cn('font-mono text-sm font-bold tabular-nums shrink-0',
                                  c.margin >= config.desiredMargin ? 'text-success' :
                                  c.margin >= 0 ? 'text-foreground' : 'text-destructive'
                                )}>
                                  {c.margin.toFixed(1)}%
                                </span>
                              </div>
                              <div className="h-1 bg-secondary rounded-full overflow-hidden">
                                <div className={cn('h-full',
                                  c.margin >= config.desiredMargin ? 'bg-success' :
                                  c.margin >= 0 ? 'bg-primary/60' : 'bg-destructive'
                                )} style={{ width: `${widthPct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {bestChannel && bestChannel.key !== 'shopee' && (
                        <div className="mt-3 bg-secondary/30 border border-border rounded-lg p-3">
                          <p className="text-xs md:text-sm font-semibold text-foreground">{bestChannel.label} — {bestChannel.margin.toFixed(1)}% de margem</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {fmt(bestChannel.netProfit - calculation.netProfit)}/un a mais que na Shopee
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="bg-secondary/30 border border-dashed border-border rounded-lg p-4 text-center">
                      <p className="text-xs md:text-sm text-muted-foreground mb-2">
                        Nenhum outro canal cadastrado para este produto.
                      </p>
                      <button
                        onClick={() => setShowProductForm(true)}
                        className="text-xs md:text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                      >
                        Preencher "Outros Canais" →
                      </button>
                    </div>
                  )}
                </div>

                {/* Taxas dos outros marketplaces — breakdown por canal */}
                {hasOutrosCanais && (
                  <div className="surface-card p-4 md:p-5">
                    <p className="section-label mb-3 flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-primary" />
                      Taxas dos Outros Marketplaces
                    </p>
                    <div className="space-y-4">
                      {outrosCanaisResults.map((c) => {
                        const visibleFees = c.fees.filter(f => f.value > 0);
                        if (visibleFees.length === 0) return null;
                        return (
                          <div key={c.key} className="bg-secondary/40 border border-border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-foreground">{c.label}</span>
                              <span className="text-[11px] text-muted-foreground">
                                Venda: <span className="font-mono tabular-nums text-foreground">{fmt(c.salePrice)}</span>
                              </span>
                            </div>
                            <div className="space-y-1">
                              {visibleFees.map((f, i) => (
                                <div key={i} className="flex items-center justify-between gap-3 text-xs">
                                  <span className="text-muted-foreground truncate">{f.label}</span>
                                  <span className="font-mono tabular-nums text-foreground shrink-0">{fmt(f.value)}</span>
                                </div>
                              ))}
                            </div>
                            <div className="border-t border-border/60 mt-2 pt-2 flex items-center justify-between text-xs">
                              <span className="font-semibold text-foreground">Total de taxas</span>
                              <span className="font-mono font-bold tabular-nums text-destructive">{fmt(c.totalFees)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-3">
                      Custo do produto não está incluído nas taxas — ele compõe o custo total junto com estas tarifas do canal.
                    </p>
                  </div>
                )}

                {/* Estoque com mini-progresso */}
                <div className={cn(
                  'surface-card p-4 md:p-5 border',
                  stockLow ? 'border-destructive/40' : stockMedium ? 'border-warning/40' : 'border-border'
                )}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="section-label flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-primary" />
                      Estoque
                    </p>
                    {stockLow && (
                      <span className="inline-flex items-center text-[10px] md:text-xs font-semibold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/30">
                        ⚠ Reposição
                      </span>
                    )}
                    {stockMedium && (
                      <span className="inline-flex items-center text-[10px] md:text-xs font-semibold px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/30">
                        Atenção
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="font-mono text-2xl font-bold text-foreground tabular-nums">{product.stockQuantity}</span>
                    <span className="text-xs text-muted-foreground">
                      mín. {minStock} un.
                    </span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-2">
                    <div className={cn('h-full transition-all', stockBarColor)} style={{ width: `${stockPct}%` }} />
                  </div>
                  {stockDays !== null && (
                    <p className="text-[11px] md:text-xs text-muted-foreground">
                      ~{stockDays} {stockDays === 1 ? 'dia' : 'dias'} de venda
                      <span className="text-muted-foreground/50"> · estimado a {monthlySales}/mês</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Projeção Mensal — full width */}
            <div className="surface-card p-4 md:p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <p className="section-label flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  Projeção Mensal
                </p>
                <div className="flex items-baseline gap-1.5 bg-secondary/60 border border-border rounded-lg px-2.5 py-1">
                  <input
                    value={monthlySales}
                    onChange={e => setMonthlySales(Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)))}
                    type="number"
                    className="w-12 bg-transparent text-right font-mono text-sm font-bold text-primary outline-none tabular-nums"
                  />
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">vendas/mês</span>
                </div>
              </div>

              {/* Presets rápidos — wrap, sem scroll */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {SALES_PRESETS.map(preset => (
                  <button
                    key={preset}
                    onClick={() => setMonthlySales(preset)}
                    className={cn(
                      'flex-1 min-w-[52px] h-8 rounded-md text-xs font-semibold border transition-all tabular-nums',
                      monthlySales === preset
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-secondary/40 text-muted-foreground border-border hover:bg-secondary hover:text-foreground'
                    )}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Slider com labels min/max */}
              <div className="mb-4">
                <Slider value={[monthlySales]} onValueChange={([v]) => setMonthlySales(v)} min={1} max={1000} step={1} />
                <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground/60 font-mono tabular-nums">
                  <span>1</span>
                  <span>1.000</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="bg-secondary/50 border border-border rounded-lg p-3">
                  <p className="font-mono text-sm md:text-base font-bold text-success tabular-nums truncate">{fmt(projection.revenue)}</p>
                  <p className="label-metric text-muted-foreground mt-0.5">Receita bruta</p>
                </div>
                <div className="bg-secondary/50 border border-border rounded-lg p-3">
                  <p className="font-mono text-sm md:text-base font-bold text-destructive tabular-nums truncate">{fmt(projection.costs)}</p>
                  <p className="label-metric text-muted-foreground mt-0.5">Custos totais</p>
                </div>
                <div className="bg-secondary/50 border border-border rounded-lg p-3">
                  <p className={cn('font-mono text-sm md:text-base font-bold tabular-nums truncate', projection.profit >= 0 ? 'text-success' : 'text-destructive')}>{fmt(projection.profit)}</p>
                  <p className="label-metric text-muted-foreground mt-0.5">Lucro mensal</p>
                </div>
                <div className="bg-secondary/50 border border-border rounded-lg p-3">
                  <p className={cn('font-mono text-sm md:text-base font-bold tabular-nums', status.color)}>{projection.margin.toFixed(1)}%</p>
                  <p className="label-metric text-muted-foreground mt-0.5">Margem</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tendencia" className="mt-0">
            <ProductTrendTab productId={product.id} productName={product.name} />
          </TabsContent>
        </Tabs>
      </div>

      {/* FAB pill mobile-only — flutua acima do BottomNavigation */}
      <div className="md:hidden fixed bottom-20 left-1/2 -translate-x-1/2 z-40">
        <button
          onClick={() => setShowProductForm(true)}
          className="h-12 px-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 shadow-[0_8px_24px_-4px_hsl(var(--primary)/0.5)] hover:bg-primary/90 transition-all active:scale-[0.97]"
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

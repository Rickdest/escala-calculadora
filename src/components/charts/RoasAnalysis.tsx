import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { getShopeeFeeForPrice, Product } from '@/types/store';
import { cn } from '@/lib/utils';
import {
  Target, AlertTriangle, TrendingUp, TrendingDown,
  Package, Search, DollarSign,
  BarChart3, PieChart, Zap, Percent, Info, Megaphone, Minus
} from 'lucide-react';
import {
  Tooltip as ShadTooltip,
  TooltipContent as ShadTooltipContent,
  TooltipProvider as ShadTooltipProvider,
  TooltipTrigger as ShadTooltipTrigger,
} from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { TooltipLabel, getTooltipText } from '@/components/roas/TooltipLabel';
import { ProductHealthBanner } from '@/components/roas/ProductHealthBanner';
import { AdsTab } from '@/components/roas/AdsTab';

// ─── Shared Utilities ───

interface RoasResult {
  roasAtual: number | null;
  roasEmpate: number | null;
  roasSaudavel: number | null;
  roasIdeal: number | null;
  lucroBruto: number;
  taxaShopee: number;
  valorRecebido: number;
  margemInsuficiente: boolean;
}

function calcRoasFromValues(precoVenda: number, custoP: number, gastoAds: number, receitaAds: number): RoasResult {
  const fee = getShopeeFeeForPrice(precoVenda);
  const taxaShopee = (precoVenda * fee.percent / 100) + fee.fixed;
  const valorRecebido = precoVenda - taxaShopee;
  const lucroBruto = valorRecebido - custoP;
  if (lucroBruto <= 0) {
    return { roasAtual: null, roasEmpate: null, roasSaudavel: null, roasIdeal: null, lucroBruto, taxaShopee, valorRecebido, margemInsuficiente: true };
  }
  const roasEmpate = parseFloat((precoVenda / lucroBruto).toFixed(2));
  const roasSaudavel = parseFloat((roasEmpate / 0.61).toFixed(2));
  const roasIdeal = parseFloat((roasEmpate / 0.40).toFixed(2));
  const roasAtual = gastoAds > 0 ? parseFloat((receitaAds / gastoAds).toFixed(2)) : null;
  return { roasAtual, roasEmpate, roasSaudavel, roasIdeal, lucroBruto, taxaShopee, valorRecebido, margemInsuficiente: false };
}

function getRoasStatus(roasAtual: number, roasEmpate: number, roasSaudavel: number, roasIdeal: number) {
  if (roasAtual < roasEmpate) return 'danger';
  if (roasAtual === roasEmpate) return 'empate';
  if (roasAtual < roasSaudavel) return 'warning';
  if (roasAtual < roasIdeal) return 'medium';
  return 'success';
}

const statusColors: Record<string, string> = { danger: 'text-destructive', empate: 'text-orange-400', warning: 'text-yellow-400', medium: 'text-primary', success: 'text-success' };
const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const CHART_COLORS = [
  'hsl(16, 100%, 50%)',
  'hsl(152, 70%, 42%)',
  'hsl(40, 95%, 50%)',
  'hsl(220, 70%, 55%)',
  'hsl(280, 70%, 55%)',
];

// ─── Section Label ───

function SectionLabel({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-primary" />
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{children}</p>
    </div>
  );
}

// ─── Cost Breakdown Donut ───

function CostBreakdownChart({ product, roasData }: { product: Product; roasData: RoasResult }) {
  const data = useMemo(() => [
    { name: 'Custo Produto', value: product.costPrice, color: CHART_COLORS[0] },
    { name: 'Taxa Shopee', value: roasData.taxaShopee, color: CHART_COLORS[1] },
    { name: 'Lucro', value: Math.max(0, roasData.lucroBruto), color: CHART_COLORS[2] },
  ], [product, roasData]);

  return (
    <div className="flex items-center gap-3">
      <ResponsiveContainer width={100} height={100}>
        <RechartsPie data={data}>
          <Pie data={data} cx="50%" cy="50%" innerRadius={28} outerRadius={45} paddingAngle={3} dataKey="value" strokeWidth={0}>
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <Tooltip formatter={(v: number) => formatCurrency(v)} />
        </RechartsPie>
      </ResponsiveContainer>
      <div className="flex-1 space-y-1.5">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-muted-foreground flex-1 text-[11px]">{item.name}</span>
            <span className="font-bold tabular-nums text-[11px] font-mono">{formatCurrency(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── KPI Card ───

function KpiCard({ icon: Icon, label, value, subValue, variant = 'default', highlight = false, tooltipKey, large = false }: {
  icon: React.ElementType; label: string; value: string; subValue?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  highlight?: boolean;
  tooltipKey?: string;
  large?: boolean;
}) {
  const variants = {
    default: 'bg-card border-border',
    success: 'bg-success/5 border-success/20',
    warning: 'bg-warning/5 border-warning/20',
    danger: 'bg-destructive/5 border-destructive/20',
  };
  const iconVariants = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-success/15 text-success',
    warning: 'bg-warning/15 text-warning',
    danger: 'bg-destructive/15 text-destructive',
  };

  return (
    <div className={cn(
      'rounded-xl border p-3 md:p-4 transition-all duration-200',
      variants[variant],
      highlight && 'border-primary/40 ring-1 ring-primary/10',
    )}>
      <div className="flex flex-col items-center text-center md:flex-row md:items-start md:text-left gap-1 md:gap-3">
        <div className={cn(
          'w-9 h-9 rounded-lg items-center justify-center flex-shrink-0 hidden md:flex',
          iconVariants[variant],
        )}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          {tooltipKey ? (
            <TooltipLabel label={label} tooltip={getTooltipText(tooltipKey)} />
          ) : (
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{label}</p>
          )}
          <p className={cn('font-extrabold tabular-nums leading-tight font-mono mt-1', large ? 'text-xl md:text-2xl' : 'text-lg')}>{value}</p>
          {subValue && <p className="text-[10px] text-muted-foreground mt-0.5">{subValue}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Product Selector ───

function ProductSelector({ products, selectedId, onSelect }: { products: Product[]; selectedId: string; onSelect: (id: string) => void }) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q));
  }, [products, search]);

  return (
    <div className="space-y-3">
      {products.length > 3 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar produto..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 input-modern h-10 text-sm" />
        </div>
      )}
      <div className="grid grid-cols-1 gap-1.5 max-h-[260px] overflow-y-auto pr-0.5 scrollbar-none" style={{ overscrollBehavior: 'contain', scrollbarWidth: 'none' }}>
        {filtered.map(p => {
          const isActive = p.id === selectedId;
          const roasData = calcRoasFromValues(p.salePrice, p.costPrice, p.adsCost, p.adsRevenue);
          const hasAds = p.adsCost > 0;

          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 border group active:scale-[0.98]',
                isActive
                  ? 'bg-primary/10 border-primary/30'
                  : 'bg-card border-border hover:bg-card/80 hover:border-primary/20'
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                isActive ? 'bg-primary/20' : 'bg-secondary group-hover:bg-primary/10'
              )}>
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <Package className={cn('w-4 h-4 transition-colors', isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-primary/70')} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-semibold truncate transition-colors', isActive ? 'text-foreground' : 'text-foreground')}>{p.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground tabular-nums font-mono">{formatCurrency(p.salePrice)}</span>
                  {hasAds && roasData.roasAtual !== null && !roasData.margemInsuficiente && (
                    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums font-mono',
                      roasData.roasAtual >= (roasData.roasIdeal || 0) ? 'bg-success/15 text-success' :
                      roasData.roasAtual >= (roasData.roasEmpate || 0) ? 'bg-warning/15 text-warning' :
                      'bg-destructive/15 text-destructive'
                    )}>
                      {roasData.roasAtual.toFixed(1)}x
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {filtered.length === 0 && search.trim() && (
        <p className="text-center text-xs text-muted-foreground py-3">Nenhum produto encontrado</p>
      )}
    </div>
  );
}

// ─── ROAS Dashboard (Product Analysis) ───

function ProductAnalysis() {
  const { currentStore, updateProduct } = useStore();
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [gastoAds, setGastoAds] = useState<string>('');
  const [receitaAds, setReceitaAds] = useState<string>('');

  const selectedProduct = useMemo(() => {
    if (!currentStore || !selectedProductId) return null;
    return currentStore.products.find(p => p.id === selectedProductId) || null;
  }, [currentStore, selectedProductId]);

  useEffect(() => {
    if (selectedProduct) {
      setGastoAds(selectedProduct.adsCost > 0 ? String(selectedProduct.adsCost) : '');
      setReceitaAds(selectedProduct.adsRevenue > 0 ? String(selectedProduct.adsRevenue) : '');
    }
  }, [selectedProduct?.id]);

  useEffect(() => {
    if (!selectedProduct) return;
    const timeout = setTimeout(() => {
      const newGasto = parseFloat(gastoAds) || 0;
      const newReceita = parseFloat(receitaAds) || 0;
      if (newGasto !== selectedProduct.adsCost || newReceita !== selectedProduct.adsRevenue) {
        updateProduct(selectedProduct.id, { adsCost: newGasto, adsRevenue: newReceita });
      }
    }, 800);
    return () => clearTimeout(timeout);
  }, [gastoAds, receitaAds, selectedProduct?.id]);

  const roasData = useMemo(() => {
    if (!selectedProduct) return null;
    return calcRoasFromValues(selectedProduct.salePrice, selectedProduct.costPrice, parseFloat(gastoAds) || 0, parseFloat(receitaAds) || 0);
  }, [selectedProduct, gastoAds, receitaAds]);

  const marginPercent = useMemo(() => {
    if (!roasData || !selectedProduct) return 0;
    return (roasData.lucroBruto / selectedProduct.salePrice) * 100;
  }, [roasData, selectedProduct]);

  const status = roasData && !roasData.margemInsuficiente && roasData.roasAtual !== null && roasData.roasEmpate && roasData.roasSaudavel && roasData.roasIdeal
    ? getRoasStatus(roasData.roasAtual, roasData.roasEmpate, roasData.roasSaudavel, roasData.roasIdeal) : null;

  if (!currentStore || currentStore.products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mb-3">
          <Target className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="text-sm font-bold text-foreground mb-1">Nenhum produto cadastrado</p>
        <p className="text-xs text-muted-foreground max-w-xs">Adicione seus produtos na página Produtos para começar a analisar o ROAS.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Desktop: 2-column layout | Mobile: stacked */}
      <div className="md:grid md:grid-cols-12 md:gap-6 space-y-4 md:space-y-0">
        {/* Left: Product Selector + Ads Input */}
        <div className="md:col-span-4 space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <SectionLabel icon={Package}>Produto</SectionLabel>
            <ProductSelector products={currentStore.products} selectedId={selectedProductId} onSelect={setSelectedProductId} />
          </div>

          {selectedProduct && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-4 animate-fade-in">
              <SectionLabel icon={DollarSign}>Dados de Ads</SectionLabel>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <TooltipLabel label="Gasto em Ads (R$)" tooltip={getTooltipText('gasto_ads')} />
                  <Input type="number" inputMode="decimal" min="0" step="0.01" value={gastoAds} onChange={e => setGastoAds(e.target.value)} placeholder="0,00" className="input-modern h-11 text-sm font-semibold" />
                </div>
                <div className="space-y-1.5">
                  <TooltipLabel label="Receita Ads (R$)" tooltip={getTooltipText('receita_ads')} />
                  <Input type="number" inputMode="decimal" min="0" step="0.01" value={receitaAds} onChange={e => setReceitaAds(e.target.value)} placeholder="0,00" className="input-modern h-11 text-sm font-semibold" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Zap className="w-3 h-3 text-primary" /> Valores salvos automaticamente
              </p>
            </div>
          )}
        </div>

        {/* Right: Results */}
        <div className="md:col-span-8 space-y-4">
          {selectedProduct && roasData && !roasData.margemInsuficiente && (
            <>
              {/* Health Banner */}
              <ProductHealthBanner marginPercent={marginPercent} />

              {/* Hero Results - 3-column KPIs with tooltips */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 animate-fade-in">
                {[
                  { label: 'ROAS Empate', value: roasData.roasEmpate!.toFixed(2) + 'x', color: 'text-orange-400', tip: 'ROAS mínimo para não ter prejuízo. Abaixo disso cada venda com anúncio gera perda.' },
                  { label: 'ROAS Saudável', value: roasData.roasSaudavel!.toFixed(2) + 'x', color: 'text-primary', tip: 'A partir daqui o lucro já é consistente e seguro para escalar.' },
                  { label: 'ROAS Ideal', value: roasData.roasIdeal!.toFixed(2) + 'x', color: 'text-success', tip: 'Margem excelente. Nesse nível vale aumentar o investimento em Ads com confiança.' },
                ].map(({ label, value, color, tip }) => (
                  <div key={label} className="rounded-xl border border-border bg-card p-3 flex items-center justify-between md:flex-col md:text-center">
                    <div className="flex items-center gap-1 md:justify-center">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{label}</p>
                      <ShadTooltipProvider delayDuration={200}>
                        <ShadTooltip>
                          <ShadTooltipTrigger asChild>
                            <button type="button" className="text-muted-foreground hover:text-primary transition-colors focus:outline-none">
                              <Info className="w-3 h-3" />
                            </button>
                          </ShadTooltipTrigger>
                          <ShadTooltipContent side="top" className="max-w-[220px] text-xs leading-relaxed">
                            {tip}
                          </ShadTooltipContent>
                        </ShadTooltip>
                      </ShadTooltipProvider>
                    </div>
                    <p className={cn('font-extrabold tabular-nums font-mono text-lg md:mt-1', color)}>{value}</p>
                  </div>
                ))}
              </div>

              {/* ROAS Progress Bar */}
              {roasData.roasAtual !== null && roasData.roasEmpate && roasData.roasIdeal && status && (
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <SectionLabel icon={BarChart3}>Posição do ROAS</SectionLabel>
                  <div className="relative pt-1">
                    <div className="w-full h-3 rounded-full bg-secondary overflow-hidden relative">
                      <div className="absolute inset-0 rounded-full" style={{
                        background: `linear-gradient(to right, hsl(0 85% 60%) 0%, hsl(25 95% 55%) ${(roasData.roasEmpate / Math.max(roasData.roasIdeal * 1.3, roasData.roasAtual * 1.1)) * 100}%, hsl(45 95% 50%) ${(roasData.roasSaudavel! / Math.max(roasData.roasIdeal * 1.3, roasData.roasAtual * 1.1)) * 100}%, hsl(100 60% 45%) ${(roasData.roasIdeal / Math.max(roasData.roasIdeal * 1.3, roasData.roasAtual * 1.1)) * 100}%, hsl(152 70% 42%) 100%)`,
                        opacity: 0.25,
                      }} />
                      <div
                        className={cn('h-full rounded-full transition-all duration-700 ease-out relative z-10',
                          status === 'danger' && 'bg-destructive',
                          status === 'empate' && 'bg-orange-400',
                          status === 'warning' && 'bg-yellow-400',
                          status === 'medium' && 'bg-primary',
                          status === 'success' && 'bg-success',
                        )}
                        style={{ width: `${Math.min((roasData.roasAtual / Math.max(roasData.roasIdeal * 1.3, roasData.roasAtual * 1.1)) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="absolute top-1 h-3 w-0.5 bg-orange-400/60 rounded-full z-20" style={{ left: `${(roasData.roasEmpate / Math.max(roasData.roasIdeal * 1.3, roasData.roasAtual * 1.1)) * 100}%` }} />
                    <div className="absolute top-1 h-3 w-0.5 bg-yellow-400/60 rounded-full z-20" style={{ left: `${(roasData.roasSaudavel! / Math.max(roasData.roasIdeal * 1.3, roasData.roasAtual * 1.1)) * 100}%` }} />
                    <div className="absolute top-1 h-3 w-0.5 bg-success/60 rounded-full z-20" style={{ left: `${(roasData.roasIdeal / Math.max(roasData.roasIdeal * 1.3, roasData.roasAtual * 1.1)) * 100}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground font-bold">
                    <span>0</span>
                    <span className="text-orange-400">Empate {roasData.roasEmpate.toFixed(1)}</span>
                    <span className="text-yellow-400">Saudável {roasData.roasSaudavel?.toFixed(1)}</span>
                    <span className="text-success">Ideal {roasData.roasIdeal.toFixed(1)}</span>
                  </div>
                </div>
              )}

              {/* Cost Breakdown */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <SectionLabel icon={PieChart}>Composição do Preço</SectionLabel>
                <CostBreakdownChart product={selectedProduct} roasData={roasData} />
              </div>

              {/* Lucro + Taxa */}
              <div className="grid grid-cols-2 gap-3">
                <KpiCard icon={DollarSign} label="Lucro Bruto" value={formatCurrency(roasData.lucroBruto)} subValue="Antes de Ads" variant={roasData.lucroBruto > 0 ? 'success' : 'danger'} tooltipKey="lucro_bruto" />
                <KpiCard icon={Percent} label="Taxa Shopee" value={formatCurrency(roasData.taxaShopee)} subValue={`${((roasData.taxaShopee / selectedProduct.salePrice) * 100).toFixed(1)}% do preço`} variant="default" tooltipKey="taxa_shopee" />
              </div>

            </>
          )}

          {selectedProduct && roasData?.margemInsuficiente && (
            <div className="space-y-4 animate-fade-in">
              <ProductHealthBanner marginPercent={marginPercent} />
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-destructive text-sm">Margem insuficiente para anunciar</p>
                    <p className="text-xs text-muted-foreground mt-1">Lucro antes de Ads: {formatCurrency(roasData.lucroBruto)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Aumente o preço de venda ou reduza o custo do produto.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!selectedProduct && (
            <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl border border-border bg-card">
              <Target className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-semibold text-muted-foreground">Selecione um produto</p>
              <p className="text-xs text-muted-foreground mt-1">Escolha um produto ao lado para ver a análise de ROAS</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Ranking ───

function RoasRanking() {
  const { currentStore } = useStore();
  const ranking = useMemo(() => {
    if (!currentStore || currentStore.products.length === 0) return [];
    return currentStore.products
      .map(p => {
        const data = calcRoasFromValues(p.salePrice, p.costPrice, p.adsCost, p.adsRevenue);
        const status = data.roasAtual !== null && data.roasEmpate && data.roasSaudavel && data.roasIdeal && !data.margemInsuficiente
          ? getRoasStatus(data.roasAtual, data.roasEmpate, data.roasSaudavel, data.roasIdeal) : null;
        return { product: p, ...data, status };
      })
      .sort((a, b) => {
        if (a.roasAtual !== null && b.roasAtual !== null) return b.roasAtual - a.roasAtual;
        if (a.roasAtual !== null) return -1;
        if (b.roasAtual !== null) return 1;
        return (a.roasEmpate ?? 999) - (b.roasEmpate ?? 999);
      });
  }, [currentStore]);

  const chartData = useMemo(() => {
    return ranking
      .filter(r => r.roasAtual !== null)
      .slice(0, 8)
      .map(r => ({
        name: r.product.name.length > 12 ? r.product.name.slice(0, 12) + '…' : r.product.name,
        roas: r.roasAtual!,
        empate: r.roasEmpate || 0,
        ideal: r.roasIdeal || 0,
        status: r.status,
      }));
  }, [ranking]);

  if (!currentStore || ranking.length === 0) return null;

  const withAds = ranking.filter(r => r.roasAtual !== null);
  const withoutAds = ranking.filter(r => r.roasAtual === null);

  return (
    <div className="space-y-4">
      <SectionLabel icon={BarChart3}>Ranking de Produtos</SectionLabel>
      <div className="md:grid md:grid-cols-12 md:gap-6 space-y-4 md:space-y-0">
        <div className="md:col-span-5">
          {chartData.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3 md:sticky md:top-20">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Comparativo de ROAS</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '10px', fontSize: '11px' }} />
                  <Bar dataKey="roas" name="ROAS Atual" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.status === 'danger' ? 'hsl(0, 85%, 60%)' : entry.status === 'warning' ? 'hsl(40, 95%, 50%)' : 'hsl(152, 70%, 42%)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className="md:col-span-7 space-y-4">
          {withAds.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 px-1">
                <TrendingUp className="w-3 h-3" /> Com dados de Ads ({withAds.length})
              </p>
              {withAds.map((r, i) => {
                const rankIcon = r.roasAtual! >= 5 ? TrendingUp : r.roasAtual! >= 2 ? AlertTriangle : TrendingDown;
                const RankIcon = rankIcon;
                return (
                <div key={r.product.id} className="rounded-xl border border-border bg-card p-4 animate-fade-in transition-all duration-200 hover:border-primary/20" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-sm font-extrabold flex-shrink-0',
                      r.status === 'success' ? 'bg-success/15 text-success' : r.status === 'warning' ? 'bg-warning/15 text-warning' : 'bg-destructive/15 text-destructive')}>
                      #{i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-foreground truncate text-sm flex-1">{r.product.name}</p>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <RankIcon className={cn('w-4 h-4', r.roasAtual! >= 5 ? 'text-success' : r.roasAtual! >= 2 ? 'text-warning' : 'text-destructive')} />
                          <span className={cn('font-extrabold text-xl tabular-nums font-mono', statusColors[r.status as keyof typeof statusColors])}>{r.roasAtual!.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground tabular-nums font-mono">{formatCurrency(r.product.adsCost)}</span>
                        <span className="text-xs text-muted-foreground">→</span>
                        <span className="text-xs text-success font-semibold tabular-nums font-mono">{formatCurrency(r.product.adsRevenue)}</span>
                      </div>
                      <div className="flex gap-3 text-[11px] text-muted-foreground mt-1">
                        <span>Emp: <span className="text-warning font-bold font-mono">{r.roasEmpate?.toFixed(1)}</span></span>
                        <span>Ideal: <span className="text-primary font-bold font-mono">{r.roasIdeal?.toFixed(1)}</span></span>
                      </div>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
          {withoutAds.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">Sem dados de Ads ({withoutAds.length})</p>
              {withoutAds.map(r => (
                <div key={r.product.id} className="rounded-xl border border-border bg-card p-3.5 opacity-50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-extrabold flex-shrink-0 bg-secondary text-muted-foreground">—</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground truncate text-sm">{r.product.name}</p>
                      <p className="text-xs text-muted-foreground tabular-nums font-mono">{formatCurrency(r.product.salePrice)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {r.margemInsuficiente ? (
                        <span className="text-xs font-bold text-destructive">Margem insuficiente</span>
                      ) : (
                        <div className="text-[10px] text-muted-foreground space-y-0.5">
                          <p>Emp: <span className="text-warning font-bold font-mono">{r.roasEmpate?.toFixed(2)}</span></p>
                          <p>Ideal: <span className="text-primary font-bold font-mono">{r.roasIdeal?.toFixed(2)}</span></p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Export ───

export function RoasAnalysis() {
  return (
    <div className="space-y-4 pb-20 md:pb-4">
      <Tabs defaultValue="product" className="w-full">
        <TabsList className="w-full grid grid-cols-2 h-11 rounded-full bg-card p-1 border border-border sticky top-0 z-10">
          <TabsTrigger value="product" className="text-[13px] font-bold rounded-full gap-1.5 transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none">
            <Target className="w-4 h-4" />
            ROAS
          </TabsTrigger>
          <TabsTrigger value="ads" className="text-[13px] font-bold rounded-full gap-1.5 transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none">
            <Megaphone className="w-4 h-4" />
            Shopee Ads
          </TabsTrigger>
        </TabsList>
        <TabsContent value="product" className="mt-4 animate-fade-in">
          <ProductAnalysis />
          <div className="mt-6">
            <RoasRanking />
          </div>
        </TabsContent>
        <TabsContent value="ads" className="mt-4 animate-fade-in">
          <AdsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

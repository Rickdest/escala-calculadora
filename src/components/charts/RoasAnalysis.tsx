import { useState, useMemo, useEffect } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { Product } from '@/types/store';
import { cn } from '@/lib/utils';
import { calcFullRoas, calcProductRoas, getRoasStatus, RoasResult } from '@/lib/roasUtils';
import { getMarginStatus } from '@/lib/utils';
import {
  Target, AlertTriangle, TrendingUp,
  Package, Search, DollarSign,
  BarChart3, PieChart, Zap, Percent, Info, Megaphone, ChevronDown, X
} from 'lucide-react';
import {
  Tooltip as ShadTooltip,
  TooltipContent as ShadTooltipContent,
  TooltipProvider as ShadTooltipProvider,
  TooltipTrigger as ShadTooltipTrigger,
} from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, Tooltip,
} from 'recharts';
import { TooltipLabel, getTooltipText } from '@/components/roas/TooltipLabel';
import { AdsTab } from '@/components/roas/AdsTab';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const CHART_COLORS = [
  'hsl(16, 100%, 50%)',
  'hsl(152, 70%, 42%)',
  'hsl(40, 95%, 50%)',
  'hsl(220, 70%, 55%)',
  'hsl(280, 70%, 55%)',
  'hsl(340, 80%, 55%)',
  'hsl(190, 70%, 45%)',
  'hsl(60, 80%, 45%)',
];

const statusColors: Record<string, string> = {
  danger: 'text-destructive',
  empate: 'text-orange-400',
  warning: 'text-yellow-400',
  medium: 'text-primary',
  success: 'text-success',
};

// ─── Tooltip icon helper ───
function TipIcon({ text }: { text: string }) {
  return (
    <ShadTooltipProvider delayDuration={200}>
      <ShadTooltip>
        <ShadTooltipTrigger asChild>
          <button type="button" className="text-text-3 hover:text-primary transition-colors focus:outline-none">
            <Info className="w-3 h-3" />
          </button>
        </ShadTooltipTrigger>
        <ShadTooltipContent side="top" className="max-w-[220px] text-xs leading-relaxed">
          {text}
        </ShadTooltipContent>
      </ShadTooltip>
    </ShadTooltipProvider>
  );
}

// ─── Donut de composição de custos ───
function CostBreakdownChart({ product, roasData }: { product: Product; roasData: RoasResult }) {
  const data = useMemo(() => {
    const costs = roasData.costs;
    const items: Array<{ name: string; value: number; color: string }> = [];
    let i = 0;
    const add = (name: string, value: number) => {
      if (value > 0) items.push({ name, value, color: CHART_COLORS[i++ % CHART_COLORS.length] });
    };
    add('Custo Produto', costs.costPrice);
    add('Taxa Shopee', costs.shopeeFee);
    add('Embalagem', costs.packagingCost);
    add('Impostos', costs.taxes);
    add('Afiliados', costs.affiliateCommission);
    add('Campanhas', costs.campaigns);
    add('Acelera', costs.acelera);
    items.push({ name: 'Lucro', value: Math.max(0, roasData.lucroBruto), color: 'hsl(152, 70%, 42%)' });
    return items;
  }, [roasData]);

  return (
    <div className="flex items-center gap-3 md:gap-5">
      <div className="w-[100px] h-[100px] md:w-[120px] md:h-[120px] flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPie>
            <Pie data={data} cx="50%" cy="50%" innerRadius={28} outerRadius={45} paddingAngle={3} dataKey="value" strokeWidth={0}>
              {data.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
            </Pie>
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
          </RechartsPie>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 space-y-1">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xs">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-text-2 flex-1 text-[11px]">{item.name}</span>
            <span className="font-bold tabular-nums text-[11px] font-mono">{formatCurrency(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Seletor de produto como dropdown ───
function ProductPicker({
  products,
  selectedId,
  onSelect,
  config,
}: {
  products: Product[];
  selectedId: string;
  onSelect: (id: string) => void;
  config: any;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = products.find(p => p.id === selectedId);
  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    return products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  }, [products, search]);

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/30 active:scale-[0.99]"
      >
        <div className="w-10 h-10 rounded-lg bg-surface-2 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {selected?.imageUrl ? (
            <img src={selected.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
          ) : (
            <Package className="w-4 h-4 text-text-3" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          {selected ? (
            <>
              <p className="text-sm font-bold text-foreground truncate">{selected.name}</p>
              <p className="text-xs text-text-3 tabular-nums font-mono">
                {formatCurrency(selected.salePrice)} · Custo {formatCurrency(selected.costPrice)}
              </p>
            </>
          ) : (
            <p className="text-sm text-text-3">Selecione um produto...</p>
          )}
        </div>
        <div className="flex items-center gap-1 text-text-3 flex-shrink-0">
          <span className="text-xs font-medium">Trocar</span>
          <ChevronDown className="w-4 h-4" />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-border bg-card shadow-xl overflow-hidden animate-fade-in">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <Search className="w-4 h-4 text-text-3 flex-shrink-0" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar produto..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-text-3 outline-none"
            />
            <button onClick={() => setOpen(false)} className="text-text-3 hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="max-h-[260px] overflow-y-auto scrollbar-none">
            {filtered.map(p => {
              const roasData = calcProductRoas(p, config);
              const isActive = p.id === selectedId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { onSelect(p.id); setOpen(false); setSearch(''); }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
                    isActive ? 'bg-primary/10' : 'hover:bg-surface-2'
                  )}
                >
                  <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
                    ) : (
                      <Package className="w-3.5 h-3.5 text-text-3" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{p.name}</p>
                    <p className="text-xs text-text-3 tabular-nums font-mono">{formatCurrency(p.salePrice)}</p>
                  </div>
                  {roasData.roasAtual !== null && !roasData.margemInsuficiente && (
                    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums font-mono',
                      roasData.roasAtual >= (roasData.roasIdeal || 0) ? 'bg-success/15 text-success' :
                      roasData.roasAtual >= (roasData.roasEmpate || 0) ? 'bg-warning/15 text-warning' :
                      'bg-destructive/15 text-destructive'
                    )}>
                      {roasData.roasAtual.toFixed(1)}x
                    </span>
                  )}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-center text-xs text-text-3 py-4">Nenhum produto encontrado</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Análise principal ───
function ProductAnalysis() {
  const { currentStore, updateProduct } = useStore();
  const config = currentStore?.config;
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
    if (!selectedProduct || !config) return null;
    return calcFullRoas(
      selectedProduct.salePrice,
      selectedProduct.costPrice,
      config,
      selectedProduct.packagingCost,
      parseFloat(gastoAds) || 0,
      parseFloat(receitaAds) || 0,
    );
  }, [selectedProduct, config, gastoAds, receitaAds]);

  const marginPercent = useMemo(() => {
    if (!roasData || !selectedProduct) return 0;
    return selectedProduct.salePrice > 0 ? (roasData.lucroBruto / selectedProduct.salePrice) * 100 : 0;
  }, [roasData, selectedProduct]);

  const marginStatus = getMarginStatus(marginPercent);

  const roasStatus = roasData && !roasData.margemInsuficiente && roasData.roasAtual !== null && roasData.roasEmpate && roasData.roasSaudavel && roasData.roasIdeal
    ? getRoasStatus(roasData.roasAtual, roasData.roasEmpate, roasData.roasSaudavel, roasData.roasIdeal)
    : null;

  const roasAtualLabel = useMemo(() => {
    if (!roasData || roasData.roasAtual === null || !roasData.roasEmpate) return null;
    if (roasData.roasAtual < roasData.roasEmpate) return { text: 'Prejuízo', color: 'text-destructive' };
    if (roasData.roasAtual < (roasData.roasSaudavel ?? 0)) return { text: 'No limite', color: 'text-warning' };
    if (roasData.roasAtual < (roasData.roasIdeal ?? 0)) return { text: 'Saudável', color: 'text-primary' };
    return { text: 'Ideal ✓', color: 'text-success' };
  }, [roasData]);

  if (!currentStore || currentStore.products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-surface-2 flex items-center justify-center mb-3">
          <Target className="w-7 h-7 text-text-2" />
        </div>
        <p className="text-sm font-bold text-foreground mb-1">Nenhum produto cadastrado</p>
        <p className="text-xs text-text-2 max-w-xs">Adicione seus produtos na página Produtos para analisar o ROAS.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Seletor ── */}
      <ProductPicker
        products={currentStore.products}
        selectedId={selectedProductId}
        onSelect={setSelectedProductId}
        config={config}
      />

      {selectedProduct && roasData && !roasData.margemInsuficiente && (
        <>
          {/* ── Status pill + ROAS bars ── */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1', marginStatus.bg, marginStatus.color)}>
                <Zap className="w-3 h-3" />
                {marginStatus.label} · {marginPercent.toFixed(1)}% margem
              </span>
              <span className="text-xs text-text-3 font-medium">Shopee</span>
            </div>

            <div className="space-y-2.5">
              {[
                { label: 'Empate', value: roasData.roasEmpate!, max: (roasData.roasIdeal ?? 1) * 1.1, barClass: 'bg-destructive', tip: 'ROAS mínimo para não ter prejuízo. Abaixo disso cada venda com anúncio gera perda.' },
                { label: 'Saudável', value: roasData.roasSaudavel!, max: (roasData.roasIdeal ?? 1) * 1.1, barClass: 'bg-warning', tip: 'A partir daqui o lucro é consistente e seguro para escalar.' },
                { label: 'Ideal', value: roasData.roasIdeal!, max: (roasData.roasIdeal ?? 1) * 1.1, barClass: 'bg-success', tip: 'Margem excelente. Nesse nível vale aumentar o investimento em Ads com confiança.' },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-3">
                  <div className="w-[70px] flex items-center gap-1 flex-shrink-0">
                    <span className="text-xs text-text-2 font-medium">{row.label}</span>
                    <TipIcon text={row.tip} />
                  </div>
                  <div className="flex-1 h-2.5 rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-500', row.barClass)}
                      style={{ width: `${Math.min((row.value / row.max) * 100, 100)}%` }}
                    />
                  </div>
                  <span className={cn('text-sm font-bold tabular-nums font-mono w-[60px] text-right',
                    row.barClass === 'bg-destructive' ? 'text-destructive' :
                    row.barClass === 'bg-warning' ? 'text-warning' : 'text-success'
                  )}>
                    {row.value.toFixed(2)}x
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Inputs de Ads + resultado inline ── */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-text-2">Dados de Ads</p>
                <span className="text-[10px] text-text-3 bg-surface-2 px-1.5 py-0.5 rounded">opcional</span>
              </div>
              <span className="text-[10px] text-text-3">Salvo automaticamente</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <TooltipLabel label="Gasto em Ads" tooltip={getTooltipText('gasto_ads')} />
                <Input type="number" min="0" step="0.01" value={gastoAds} onChange={e => setGastoAds(e.target.value)} placeholder="R$ 0,00" className="input-modern h-10 text-sm font-semibold" />
              </div>
              <div className="space-y-1">
                <TooltipLabel label="Receita de Ads" tooltip={getTooltipText('receita_ads')} />
                <Input type="number" min="0" step="0.01" value={receitaAds} onChange={e => setReceitaAds(e.target.value)} placeholder="R$ 0,00" className="input-modern h-10 text-sm font-semibold" />
              </div>
            </div>

            {roasData.roasAtual !== null && roasAtualLabel ? (
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-text-2 font-medium">ROAS atual</span>
                  <TipIcon text="Retorno sobre o investimento em anúncio. Ex: ROAS 3 significa que para cada R$1 investido, você vendeu R$3." />
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn('text-xl font-extrabold tabular-nums font-mono', statusColors[roasStatus || ''] || 'text-foreground')}>
                    {roasData.roasAtual.toFixed(2)}x
                  </span>
                  <span className={cn('text-xs font-bold', roasAtualLabel.color)}>
                    {roasAtualLabel.text}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 pt-2 border-t border-border text-text-3">
                <Info className="w-3.5 h-3.5 flex-shrink-0" />
                <p className="text-xs">Preencha gasto e receita para ver o ROAS atual</p>
              </div>
            )}
          </div>

          {/* ── Breakdown + Resumo ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-text-2">Composição</p>
              <CostBreakdownChart product={selectedProduct} roasData={roasData} />
            </div>
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-text-2">Resumo</p>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-[10px] text-text-3 font-medium">Lucro bruto</p>
                    <TipIcon text={getTooltipText('lucro_bruto')} />
                  </div>
                  <p className={cn('text-lg font-extrabold tabular-nums font-mono', roasData.lucroBruto > 0 ? 'text-success' : 'text-destructive')}>
                    {formatCurrency(roasData.lucroBruto)}
                  </p>
                  <p className="text-[10px] text-text-3">Antes de Ads</p>
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-[10px] text-text-3 font-medium">Taxa Shopee</p>
                    <TipIcon text={getTooltipText('taxa_shopee')} />
                  </div>
                  <p className="text-lg font-extrabold tabular-nums font-mono text-foreground">
                    {formatCurrency(roasData.taxaShopee)}
                  </p>
                  <p className="text-[10px] text-text-3">
                    {((roasData.taxaShopee / selectedProduct.salePrice) * 100).toFixed(1)}% do preço
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {selectedProduct && roasData?.margemInsuficiente && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 flex items-start gap-3 animate-fade-in">
          <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-destructive text-sm">Margem insuficiente para anunciar</p>
            <p className="text-xs text-text-2 mt-1">Lucro antes de Ads: {formatCurrency(roasData.lucroBruto)}</p>
            <p className="text-xs text-text-2 mt-1">Aumente o preço de venda ou reduza o custo do produto.</p>
          </div>
        </div>
      )}

      {!selectedProduct && (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-border bg-card">
          <Target className="w-10 h-10 text-text-3/30 mb-3" />
          <p className="text-sm font-semibold text-text-2">Selecione um produto acima</p>
          <p className="text-xs text-text-2 mt-1">Escolha o produto para ver a análise de ROAS</p>
        </div>
      )}
    </div>
  );
}

// ─── Ranking redesenhado ───
function RoasRanking() {
  const { currentStore } = useStore();
  const config = currentStore?.config;

  const ranking = useMemo(() => {
    if (!currentStore || !config || currentStore.products.length === 0) return [];
    return currentStore.products
      .map(p => {
        const data = calcProductRoas(p, config);
        const status = data.roasAtual !== null && data.roasEmpate && data.roasSaudavel && data.roasIdeal && !data.margemInsuficiente
          ? getRoasStatus(data.roasAtual, data.roasEmpate, data.roasSaudavel, data.roasIdeal)
          : null;
        return { product: p, ...data, status };
      })
      .sort((a, b) => {
        if (a.roasAtual !== null && b.roasAtual !== null) return b.roasAtual - a.roasAtual;
        if (a.roasAtual !== null) return -1;
        if (b.roasAtual !== null) return 1;
        return (a.roasEmpate ?? 999) - (b.roasEmpate ?? 999);
      });
  }, [currentStore, config]);

  const withAds = ranking.filter(r => r.roasAtual !== null);
  const withoutAds = ranking.filter(r => r.roasAtual === null);

  if (!currentStore || ranking.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-primary" />
        <p className="text-xs font-bold uppercase tracking-wider text-text-2">Ranking de Produtos</p>
      </div>

      {withAds.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-text-3 font-medium uppercase tracking-wider px-1">
            Com dados de Ads · {withAds.length}
          </p>
          {withAds.map((r, i) => (
            <div key={r.product.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <span className={cn('text-xs font-bold w-6 text-center',
                statusColors[r.status || ''] || 'text-text-3'
              )}>
                #{i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{r.product.name}</p>
                <p className="text-[10px] text-text-3 tabular-nums font-mono">
                  {formatCurrency(r.product.adsCost)} gasto →{' '}
                  {formatCurrency(r.product.adsRevenue)}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={cn('text-sm font-extrabold tabular-nums font-mono',
                  statusColors[r.status || ''] || 'text-foreground'
                )}>
                  {r.roasAtual!.toFixed(2)}x
                </p>
                <p className="text-[10px] text-text-3 tabular-nums">
                  Emp: {r.roasEmpate?.toFixed(1)}
                  {' · '}
                  Ideal: {r.roasIdeal?.toFixed(1)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {withoutAds.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-text-3 font-medium uppercase tracking-wider px-1">
            Sem Ads importados · {withoutAds.length} produto{withoutAds.length > 1 ? 's' : ''}
          </p>
          {withoutAds.map((r, i) => (
            <div key={r.product.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <span className="text-xs font-bold text-text-3 w-6 text-center">
                #{withAds.length + i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{r.product.name}</p>
                <p className="text-[10px] text-text-3 tabular-nums font-mono">{formatCurrency(r.product.salePrice)}</p>
              </div>
              <div className="text-right flex-shrink-0">
                {r.margemInsuficiente ? (
                  <span className="text-[10px] text-destructive font-medium">Margem insuficiente</span>
                ) : (
                  <>
                    <p className="text-[10px] text-text-3 tabular-nums font-mono">
                      Emp: {r.roasEmpate?.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-text-3 tabular-nums font-mono">
                      Ideal: {r.roasIdeal?.toFixed(2)}
                    </p>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Meta tags formatadas para ranking ───
function MetaTag({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-[10px] bg-surface-2 text-text-2 px-1.5 py-0.5 rounded font-mono tabular-nums">
      {label}: {value}
    </span>
  );
}

// ─── Export principal ───
export function RoasAnalysis() {
  return (
    <div className="pb-6 md:pb-4">
      <Tabs defaultValue="roas" className="w-full">
        <TabsList className="w-full grid grid-cols-2 h-11 mb-5 bg-surface-2 rounded-xl p-1">
          <TabsTrigger value="roas" className="rounded-lg text-xs font-bold gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Target className="w-3.5 h-3.5" />
            ROAS
          </TabsTrigger>
          <TabsTrigger value="ads" className="rounded-lg text-xs font-bold gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Megaphone className="w-3.5 h-3.5" />
            Análise de Ads
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roas">
          <div className="space-y-6">
            <ProductAnalysis />
            <RoasRanking />
          </div>
        </TabsContent>

        <TabsContent value="ads">
          <AdsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

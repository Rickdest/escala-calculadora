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
  empate: 'text-warning',
  warning: 'text-warning',
  medium: 'text-success',
  success: 'text-success',
};

// ─── Tooltip icon helper ───
function TipIcon({ text }: { text: string }) {
  return (
    <ShadTooltipProvider delayDuration={200}>
      <ShadTooltip>
        <ShadTooltipTrigger asChild>
          <button type="button" className="text-text-3 hover:text-success transition-colors focus:outline-none">
            <Info className="w-3 h-3" />
          </button>
        </ShadTooltipTrigger>
        <ShadTooltipContent side="top" className="max-w-[220px] text-xs leading-relaxed bg-card border-border text-text-2">
          {text}
        </ShadTooltipContent>
      </ShadTooltip>
    </ShadTooltipProvider>
  );
}

// ─── Donut de composição de custos (coluna direita) ───
function CostBreakdownCard({ product, roasData }: { product: Product; roasData: RoasResult }) {
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
    items.push({ name: 'Lucro Bruto', value: Math.max(0, roasData.lucroBruto), color: 'hsl(152, 70%, 42%)' });
    return items;
  }, [roasData]);

  const lucroItem = data.find(d => d.name === 'Lucro Bruto');

  return (
    <div className="rounded-2xl border border-border bg-card p-4 md:p-5 space-y-4 h-full shadow-lg">
      <div className="flex items-center gap-2">
        <PieChart className="w-4 h-4 text-success" />
        <p className="text-[9px] font-bold uppercase tracking-wider text-text-2">Composição do Preço</p>
      </div>

      {/* Donut com preço no centro */}
      <div className="flex justify-center">
        <div className="relative w-[160px] h-[160px] md:w-[180px] md:h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPie>
              <Pie data={data} cx="50%" cy="50%" innerRadius="55%" outerRadius="85%" paddingAngle={2} dataKey="value" strokeWidth={0}>
                {data.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
            </RechartsPie>
          </ResponsiveContainer>
          {/* Label central */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] text-text-3 font-medium">Venda</span>
            <span className="text-base md:text-lg font-black font-mono text-foreground">{formatCurrency(product.salePrice)}</span>
          </div>
        </div>
      </div>

      {/* Lista de custos */}
      <div className="space-y-2 pt-1">
        {data.filter(d => d.name !== 'Lucro Bruto').map((item, idx) => (
          <div key={idx} className="flex items-center gap-2.5 text-xs">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-text-2 flex-1">{item.name}</span>
            <span className="font-bold tabular-nums font-mono text-foreground">{formatCurrency(item.value)}</span>
          </div>
        ))}

        {/* Lucro bruto destacado */}
        {lucroItem && (
          <div className={cn(
            'flex items-center gap-2.5 text-xs rounded-lg p-2 mt-1 border',
            roasData.lucroBruto > 0 ? 'bg-success/10 dark:bg-success/20 border-success/20' : 'bg-destructive/10 dark:bg-destructive/20 border-destructive/20'
          )}>
            <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", roasData.lucroBruto > 0 ? 'bg-success' : 'bg-destructive')} />
            <span className={cn('flex-1 font-semibold', roasData.lucroBruto > 0 ? 'text-success' : 'text-destructive')}>Lucro Bruto</span>
            <span className={cn('font-black tabular-nums font-mono', roasData.lucroBruto > 0 ? 'text-success' : 'text-destructive')}>
              {formatCurrency(roasData.lucroBruto)}
            </span>
          </div>
        )}

        {/* Percentual Shopee */}
        <p className="text-[10px] text-text-3 text-right tabular-nums font-mono">
          Taxa Shopee: {((roasData.taxaShopee / product.salePrice) * 100).toFixed(1)}% do preço
        </p>
      </div>
    </div>
  );
}

// ─── Seletor de produto — dropdown compacto ───
function ProductDropdown({
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

  const sorted = useMemo(() => {
    return [...products].sort((a, b) =>
      new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    );
  }, [products]);

  const filtered = useMemo(() => {
    if (!search.trim()) return sorted;
    return sorted.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  }, [sorted, search]);

  const selected = products.find(p => p.id === selectedId);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-success/30 transition-colors"
      >
        <div className="w-10 h-10 rounded-lg bg-surface-2 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {selected?.imageUrl ? (
            <img src={selected.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
          ) : (
            <span className="text-xs font-bold text-text-3">IMG</span>
          )}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold truncate text-foreground">{selected?.name || 'Selecione um produto'}</p>
          {selected && <p className="text-xs text-text-3 tabular-nums font-mono">Preço de Venda: {formatCurrency(selected.salePrice)}</p>}
        </div>
        <ChevronDown className={cn('w-4 h-4 text-text-3 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setSearch(''); }} />
          <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-border bg-card shadow-2xl overflow-hidden animate-fade-in">
            {sorted.length > 4 && (
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-surface-2">
                <Search className="w-4 h-4 text-text-3 flex-shrink-0" />
                <input
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar produto..."
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-text-3 outline-none"
                />
              </div>
            )}
            <div className="max-h-[260px] overflow-y-auto scrollbar-none divide-y divide-border">
              {filtered.map(p => {
                const isActive = p.id === selectedId;
                const roasData = calcProductRoas(p, config);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { onSelect(p.id); setOpen(false); setSearch(''); }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
                      isActive ? 'bg-success/10' : 'hover:bg-surface-2'
                    )}
                  >
                    <div className="w-9 h-9 rounded-lg bg-surface-2 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover" />
                      ) : (
                        <Package className="w-3.5 h-3.5 text-text-3" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate text-foreground">{p.name}</p>
                      <p className="text-xs text-text-3 tabular-nums font-mono">{formatCurrency(p.salePrice)}</p>
                    </div>
                    {roasData.roasAtual !== null && !roasData.margemInsuficiente && (
                      <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full tabular-nums font-mono flex-shrink-0',
                        roasData.roasAtual >= (roasData.roasIdeal || 0) ? 'bg-success/10 dark:bg-success/20 text-success' :
                        roasData.roasAtual >= (roasData.roasEmpate || 0) ? 'bg-warning/10 dark:bg-warning/20 text-warning' :
                        'bg-destructive/10 dark:bg-destructive/20 text-destructive'
                      )}>
                        {roasData.roasAtual.toFixed(1)}x
                      </span>
                    )}
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <p className="text-center text-xs text-text-3 py-6">Nenhum produto encontrado</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Análise principal ───
function ProductAnalysis() {
  const { currentStore, updateProduct } = useStore();
  const config = currentStore?.config;
  const initialProductId = useMemo(() => {
    if (!currentStore || currentStore.products.length === 0) return '';
    const sorted = [...currentStore.products].sort((a, b) => 
      new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    );
    return sorted[0].id;
  }, [currentStore?.products]);

  const [selectedProductId, setSelectedProductId] = useState<string>('');

  useEffect(() => {
    if (!selectedProductId && initialProductId) {
      setSelectedProductId(initialProductId);
    }
  }, [initialProductId]);
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
    if (roasData.roasAtual < (roasData.roasIdeal ?? 0)) return { text: 'Saudável', color: 'text-success' };
    return { text: 'Ideal ✓', color: 'text-success' };
  }, [roasData]);

  if (!currentStore || currentStore.products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl border border-dashed border-border bg-card">
        <div className="w-12 h-12 rounded-2xl bg-success/10 dark:bg-success/20 flex items-center justify-center mb-3">
          <Target className="w-6 h-6 text-success" />
        </div>
        <p className="text-sm font-bold text-foreground mb-1">Nenhum produto cadastrado</p>
        <p className="text-xs text-text-3 max-w-[260px]">Adicione seus produtos na aba Produtos para começar a analisar o ROAS.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Layout 2 colunas: Calculadora (esq) + Composição (dir) ── */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-4 items-start">
        {/* ── Coluna esquerda ── */}
        <div className="space-y-4">
          {/* Seletor dropdown */}
          <ProductDropdown
            products={currentStore.products}
            selectedId={selectedProductId}
            onSelect={setSelectedProductId}
            config={config}
          />

          {selectedProduct && roasData && !roasData.margemInsuficiente && (
            <>
              {/* Inputs lado a lado */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-text-3">Gasto em Ads (R$)</p>
                  <Input type="number" min="0" step="0.01" value={gastoAds} onChange={e => setGastoAds(e.target.value)} placeholder="R$ 0,00" className="bg-surface-2 border-border text-foreground h-11 text-base font-bold font-mono focus:border-success/50 focus:ring-success/20" />
                </div>
                <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-text-3">Receita de Ads (R$)</p>
                  <Input type="number" min="0" step="0.01" value={receitaAds} onChange={e => setReceitaAds(e.target.value)} placeholder="R$ 0,00" className="bg-surface-2 border-border text-foreground h-11 text-base font-bold font-mono focus:border-success/50 focus:ring-success/20" />
                </div>
              </div>

              {/* Card resultado ROAS */}
              <div className="rounded-2xl border border-border bg-card p-4 md:p-5 space-y-4 animate-fade-in shadow-lg">
                {/* ROAS value + label */}
                <div>
                  <p className="text-[9px] text-text-3 font-bold uppercase tracking-wider mb-1">ROAS ATUAL SIMULADO</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    {roasData.roasAtual !== null ? (
                      <>
                        <span className={cn('text-4xl md:text-5xl font-black tabular-nums font-mono', statusColors[roasStatus || ''] || 'text-foreground')}>
                          {roasData.roasAtual.toFixed(2)}x
                        </span>
                        {roasAtualLabel && (
                          <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1',
                            roasAtualLabel.color,
                            roasAtualLabel.color === 'text-success' ? 'bg-success/10 dark:bg-success/20' :
                            roasAtualLabel.color === 'text-warning' ? 'bg-warning/10 dark:bg-warning/20' :
                            'bg-destructive/10 dark:bg-destructive/20'
                          )}>
                            {roasAtualLabel.color === 'text-success' && '✓ '}{roasAtualLabel.text}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-2xl font-bold text-text-3">—</span>
                    )}
                  </div>
                </div>

                {/* Lucro estimado (Ads) */}
                {roasData.roasAtual !== null && (parseFloat(receitaAds) || 0) > 0 && (
                  <div>
                    <p className="text-[9px] text-text-3 font-bold uppercase tracking-wider mb-0.5">Lucro Estimado (Ads)</p>
                    <p className={cn('text-2xl md:text-3xl font-black tabular-nums font-mono',
                      (parseFloat(receitaAds) || 0) - (parseFloat(gastoAds) || 0) > 0 ? 'text-success' : 'text-destructive'
                    )}>
                      {(parseFloat(receitaAds) || 0) - (parseFloat(gastoAds) || 0) > 0 ? '+ ' : ''}{formatCurrency((parseFloat(receitaAds) || 0) - (parseFloat(gastoAds) || 0))}
                    </p>
                  </div>
                )}

                {/* Gauge bar */}
                {roasData.roasEmpate && roasData.roasSaudavel && roasData.roasIdeal && (
                  <div className="pt-1">
                    {/* Barra de gradiente */}
                    <div className="relative h-3.5 rounded-full overflow-hidden bg-surface-2"
                      style={{ background: 'linear-gradient(to right, hsl(0 70% 45%), hsl(35 90% 50%) 35%, hsl(80 60% 45%) 60%, hsl(152 70% 42%) 85%)' }}
                    >
                      {/* Ponteiro triangular */}
                      {roasData.roasAtual !== null && roasData.roasAtual > 0 && (
                        <div
                          className="absolute -top-1 transition-all duration-700"
                          style={{ left: `${Math.min(Math.max((roasData.roasAtual / (roasData.roasIdeal * 1.3)) * 100, 2), 98)}%`, transform: 'translateX(-50%)' }}
                        >
                          <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-foreground" />
                          <div className="w-0.5 h-[18px] bg-foreground mx-auto rounded-full" />
                        </div>
                      )}
                    </div>

                    {/* Labels abaixo — grid fixo para não sobrepor */}
                    <div className="grid grid-cols-4 mt-1.5 text-[8px] md:text-[9px] font-mono font-bold leading-tight">
                      <span className="text-destructive text-left">PREJUÍZO</span>
                      <span className="text-warning text-center">EMPATE<br/><span className="font-normal text-text-3">{roasData.roasEmpate.toFixed(1)}</span></span>
                      <span className="text-warning text-center">SAUDÁVEL<br/><span className="font-normal text-text-3">{roasData.roasSaudavel.toFixed(1)}</span></span>
                      <span className="text-success text-right">IDEAL<br/><span className="font-normal text-text-3">{roasData.roasIdeal.toFixed(1)}+</span></span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Alertas */}
          {selectedProduct && roasData?.precoIncompleto && (
            <div className="rounded-2xl border border-warning/20 bg-warning/10 p-5 flex items-start gap-3 animate-fade-in">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-warning text-sm">Preços não configurados</p>
                <p className="text-xs text-text-2 mt-1">Vá até a aba Produtos e defina o Custo e Preço de Venda deste item para ver a análise de ROAS.</p>
              </div>
            </div>
          )}

          {selectedProduct && roasData?.margemInsuficiente && !roasData.precoIncompleto && (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-5 flex items-start gap-3 animate-fade-in">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-destructive text-sm">Margem insuficiente para anunciar</p>
                <p className="text-xs text-text-2 mt-1">Lucro antes de Ads: {formatCurrency(roasData.lucroBruto)}</p>
                <p className="text-xs text-text-2 mt-1 flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-success" />
                  Use a <span className="font-semibold text-success">Calculadora Rápida</span> na Home para encontrar o preço ideal de empate.
                </p>
              </div>
            </div>
          )}

          {!selectedProduct && (
            <div className="flex flex-col items-center justify-center py-14 text-center rounded-2xl border border-dashed border-border bg-card">
              <div className="w-12 h-12 rounded-2xl bg-success/10 dark:bg-success/20 flex items-center justify-center mb-3">
                <Target className="w-6 h-6 text-success/60" />
              </div>
              <p className="text-sm font-semibold text-text-2">Selecione um produto acima</p>
              <p className="text-xs text-text-3 mt-1">Escolha o produto para ver a análise de ROAS</p>
            </div>
          )}
        </div>

        {/* ── Coluna direita — Composição do Preço ── */}
        {selectedProduct && roasData && !roasData.margemInsuficiente && (
          <CostBreakdownCard product={selectedProduct} roasData={roasData} />
        )}
      </div>
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
        const aPenalty = a.precoIncompleto ? 2 : a.margemInsuficiente ? 1 : 0;
        const bPenalty = b.precoIncompleto ? 2 : b.margemInsuficiente ? 1 : 0;
        if (aPenalty !== bPenalty) return aPenalty - bPenalty;
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
        <BarChart3 className="w-4 h-4 text-success" />
        <p className="text-[9px] font-bold uppercase tracking-wider text-text-2">Ranking de Produtos</p>
      </div>

      {withAds.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] text-text-3 font-medium uppercase tracking-wider px-1">
            Com dados de Ads · {withAds.length}
          </p>
          {withAds.map((r, i) => (
            <div key={r.product.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-success/20 transition-colors">
              <span className={cn('text-xs font-black w-7 h-7 rounded-lg flex items-center justify-center',
                i === 0 ? 'bg-success/10 dark:bg-success/20 text-success' :
                i === 1 ? 'bg-primary/10 dark:bg-primary/20 text-primary' :
                'bg-surface-2 text-text-2'
              )}>
                #{i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-foreground">{r.product.name}</p>
                <p className="text-[10px] text-text-3 tabular-nums font-mono">
                  {formatCurrency(r.product.adsCost)} gasto → {formatCurrency(r.product.adsRevenue)}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={cn('text-base font-black tabular-nums font-mono',
                  statusColors[r.status || ''] || 'text-foreground'
                )}>
                  {r.roasAtual!.toFixed(2)}x
                </p>
                <p className="text-[10px] text-text-3 tabular-nums font-mono">
                  Emp {r.roasEmpate?.toFixed(1)} · Ideal {r.roasIdeal?.toFixed(1)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {withoutAds.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] text-text-3 font-medium uppercase tracking-wider px-1">
            Sem Ads importados · {withoutAds.length} produto{withoutAds.length > 1 ? 's' : ''}
          </p>
          {withoutAds.map((r, i) => (
            <div key={r.product.id} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 p-3">
              <span className="text-xs font-bold text-text-3 w-7 h-7 rounded-lg bg-surface-2 flex items-center justify-center">
                #{withAds.length + i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-text-2">{r.product.name}</p>
                <p className="text-[10px] text-text-3 tabular-nums font-mono">{formatCurrency(r.product.salePrice)}</p>
              </div>
              <div className="text-right flex-shrink-0">
               {r.precoIncompleto ? (
                  <span className="text-[10px] text-warning font-medium">Sem preço</span>
                ) : r.margemInsuficiente ? (
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

// ─── Export principal ───
export function RoasAnalysis() {
  const [adsDetailOpen, setAdsDetailOpen] = useState(false);

  return (
    <div className="pb-6 md:pb-4 bg-background rounded-2xl px-0 py-2 md:p-6">
      <Tabs defaultValue="roas" className="w-full">
        {!adsDetailOpen && (
           <TabsList className="w-full grid grid-cols-2 h-11 mb-5 bg-secondary/80 border border-border rounded-xl p-1">
            <TabsTrigger
              value="roas"
              className="flex-1 h-9 rounded-lg text-xs font-bold gap-1.5 transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:text-foreground/70"
            >
              <Target className="w-3.5 h-3.5" />
              ROAS
            </TabsTrigger>
            <TabsTrigger
              value="ads"
              className="flex-1 h-9 rounded-lg text-xs font-bold gap-1.5 transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:text-foreground/70"
            >
              <Megaphone className="w-3.5 h-3.5" />
              Análise de Ads
            </TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="roas">
          <div className="space-y-6">
            <ProductAnalysis />
            <RoasRanking />
          </div>
        </TabsContent>

        <TabsContent value="ads">
          <AdsTab onDetailOpen={setAdsDetailOpen} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

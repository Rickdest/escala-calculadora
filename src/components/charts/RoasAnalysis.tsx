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
    <div className="rounded-xl border border-border bg-card p-4 md:p-5 space-y-4 h-full">
      <div className="flex items-center gap-2">
        <PieChart className="w-4 h-4 text-primary" />
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Composição do Preço</p>
      </div>

      {/* Donut com preço no centro */}
      <div className="flex justify-center">
        <div className="relative w-[160px] h-[160px] md:w-[180px] md:h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPie>
              <Pie data={data} cx="50%" cy="50%" innerRadius="55%" outerRadius="85%" paddingAngle={2} dataKey="value" strokeWidth={0}>
                {data.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
            </RechartsPie>
          </ResponsiveContainer>
          {/* Label central */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] text-muted-foreground font-medium">Venda</span>
            <span className="text-base md:text-lg font-black font-mono text-foreground">{formatCurrency(product.salePrice)}</span>
          </div>
        </div>
      </div>

      {/* Lista de custos */}
      <div className="space-y-2 pt-1">
        {data.filter(d => d.name !== 'Lucro Bruto').map((item, idx) => (
          <div key={idx} className="flex items-center gap-2.5 text-xs">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-muted-foreground flex-1">{item.name}</span>
            <span className="font-bold tabular-nums font-mono text-foreground">{formatCurrency(item.value)}</span>
          </div>
        ))}

        {/* Lucro bruto destacado */}
        {lucroItem && (
          <div className={cn(
            'flex items-center gap-2.5 text-xs rounded-lg p-2 mt-1',
            roasData.lucroBruto > 0 ? 'bg-success/8 border border-success/20' : 'bg-destructive/8 border border-destructive/20'
          )}>
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-success" />
            <span className={cn('flex-1 font-semibold', roasData.lucroBruto > 0 ? 'text-success' : 'text-destructive')}>Lucro Bruto</span>
            <span className={cn('font-black tabular-nums font-mono', roasData.lucroBruto > 0 ? 'text-success' : 'text-destructive')}>
              {formatCurrency(roasData.lucroBruto)}
            </span>
          </div>
        )}

        {/* Percentual Shopee */}
        <p className="text-[10px] text-muted-foreground text-right tabular-nums font-mono">
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
        className="w-full flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-primary/30 transition-colors"
      >
        <div className="w-10 h-10 rounded-lg bg-surface-2 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {selected?.imageUrl ? (
            <img src={selected.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
          ) : (
            <span className="text-xs font-bold text-muted-foreground">IMG</span>
          )}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold truncate text-foreground">{selected?.name || 'Selecione um produto'}</p>
          {selected && <p className="text-xs text-muted-foreground tabular-nums font-mono">Preço de Venda: {formatCurrency(selected.salePrice)}</p>}
        </div>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setSearch(''); }} />
          <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-border bg-card shadow-2xl overflow-hidden animate-fade-in">
            {sorted.length > 4 && (
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-surface-2/50">
                <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar produto..."
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
              </div>
            )}
            <div className="max-h-[260px] overflow-y-auto scrollbar-none divide-y divide-border/50">
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
                      isActive ? 'bg-primary/10' : 'hover:bg-surface-2/50'
                    )}
                  >
                    <div className="w-9 h-9 rounded-lg bg-surface-2 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover" />
                      ) : (
                        <Package className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground tabular-nums font-mono">{formatCurrency(p.salePrice)}</p>
                    </div>
                    {roasData.roasAtual !== null && !roasData.margemInsuficiente && (
                      <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full tabular-nums font-mono flex-shrink-0',
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
                <p className="text-center text-xs text-muted-foreground py-6">Nenhum produto encontrado</p>
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
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
          <Target className="w-6 h-6 text-primary" />
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
                <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <TooltipLabel label="GASTO EM ADS (R$)" tooltip={getTooltipText('gasto_ads')} />
                  <Input type="number" min="0" step="0.01" value={gastoAds} onChange={e => setGastoAds(e.target.value)} placeholder="R$ 0,00" className="input-modern h-11 text-base font-bold font-mono" />
                </div>
                <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <TooltipLabel label="RECEITA DE ADS (R$)" tooltip={getTooltipText('receita_ads')} />
                  <Input type="number" min="0" step="0.01" value={receitaAds} onChange={e => setReceitaAds(e.target.value)} placeholder="R$ 0,00" className="input-modern h-11 text-base font-bold font-mono" />
                </div>
              </div>

              {/* Card resultado ROAS */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-5 animate-fade-in">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">ROAS ATUAL SIMULADO</p>
                    <div className="flex items-center gap-3">
                      {roasData.roasAtual !== null ? (
                        <>
                          <span className={cn('text-4xl md:text-5xl font-black tabular-nums font-mono', statusColors[roasStatus || ''] || 'text-foreground')}>
                            {roasData.roasAtual.toFixed(2)}x
                          </span>
                          {roasAtualLabel && (
                            <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1',
                              roasAtualLabel.color,
                              roasAtualLabel.color === 'text-success' ? 'bg-success/10' :
                              roasAtualLabel.color === 'text-primary' ? 'bg-primary/10' :
                              roasAtualLabel.color === 'text-warning' ? 'bg-warning/10' :
                              'bg-destructive/10'
                            )}>
                              {roasAtualLabel.color === 'text-success' && '✓ '}{roasAtualLabel.text}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-2xl font-bold text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>

                  {/* Lucro estimado (Ads) */}
                  {roasData.roasAtual !== null && (parseFloat(receitaAds) || 0) > 0 && (
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground font-medium">Lucro Estimado (Ads)</p>
                      <p className={cn('text-2xl md:text-3xl font-black tabular-nums font-mono',
                        (parseFloat(receitaAds) || 0) - (parseFloat(gastoAds) || 0) > 0 ? 'text-success' : 'text-destructive'
                      )}>
                        {(parseFloat(receitaAds) || 0) - (parseFloat(gastoAds) || 0) > 0 ? '+ ' : ''}{formatCurrency((parseFloat(receitaAds) || 0) - (parseFloat(gastoAds) || 0))}
                      </p>
                    </div>
                  )}
                </div>

                {/* Gauge bar */}
                {roasData.roasEmpate && roasData.roasSaudavel && roasData.roasIdeal && (
                  <div className="space-y-1.5">
                    {/* Labels acima da barra */}
                    <div className="relative flex text-[10px] font-mono tabular-nums font-bold">
                      <span className="text-destructive" style={{ position: 'absolute', left: 0 }}>PREJUÍZO</span>
                      <span className="text-destructive" style={{ position: 'absolute', left: `${(roasData.roasEmpate / (roasData.roasIdeal * 1.3)) * 100}%`, transform: 'translateX(-50%)' }}>
                        EMPATE ({roasData.roasEmpate.toFixed(1)})
                      </span>
                      <span className="text-warning" style={{ position: 'absolute', left: `${(roasData.roasSaudavel / (roasData.roasIdeal * 1.3)) * 100}%`, transform: 'translateX(-50%)' }}>
                        SAUDÁVEL ({roasData.roasSaudavel.toFixed(1)})
                      </span>
                      <span className="text-success" style={{ position: 'absolute', right: 0 }}>
                        IDEAL ({roasData.roasIdeal.toFixed(1)}+)
                      </span>
                    </div>

                    {/* Barra de gradiente */}
                    <div className="relative h-4 rounded-full overflow-hidden mt-5"
                      style={{ background: 'linear-gradient(to right, hsl(0 70% 50%), hsl(40 95% 50%) 40%, hsl(100 60% 45%) 70%, hsl(152 70% 42%))' }}
                    >
                      {/* Indicador (ponteiro) */}
                      {roasData.roasAtual !== null && roasData.roasAtual > 0 && (
                        <div
                          className="absolute top-0 bottom-0 w-1 bg-foreground rounded-full shadow-lg transition-all duration-700"
                          style={{ left: `${Math.min(Math.max((roasData.roasAtual / (roasData.roasIdeal * 1.3)) * 100, 1), 99)}%` }}
                        />
                      )}
                    </div>

                    {/* Tick marks */}
                    <div className="relative h-3">
                      {[roasData.roasEmpate, roasData.roasSaudavel, roasData.roasIdeal].map((v, i) => (
                        <div
                          key={i}
                          className="absolute top-0 w-px h-2.5 bg-muted-foreground/50"
                          style={{ left: `${(v / (roasData.roasIdeal! * 1.3)) * 100}%` }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Alertas */}
          {selectedProduct && roasData?.precoIncompleto && (
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-5 flex items-start gap-3 animate-fade-in">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-warning text-sm">Preços não configurados</p>
                <p className="text-xs text-muted-foreground mt-1">Vá até a aba Produtos e defina o Custo e Preço de Venda deste item para ver a análise de ROAS.</p>
              </div>
            </div>
          )}

          {selectedProduct && roasData?.margemInsuficiente && !roasData.precoIncompleto && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 flex items-start gap-3 animate-fade-in">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-destructive text-sm">Margem insuficiente para anunciar</p>
                <p className="text-xs text-muted-foreground mt-1">Lucro antes de Ads: {formatCurrency(roasData.lucroBruto)}</p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-primary" />
                  Use a <span className="font-semibold text-primary">Calculadora Rápida</span> na Home para encontrar o preço ideal de empate.
                </p>
              </div>
            </div>
          )}

          {!selectedProduct && (
            <div className="flex flex-col items-center justify-center py-14 text-center rounded-xl border border-dashed border-border/60 bg-card/50">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                <Target className="w-6 h-6 text-primary/60" />
              </div>
              <p className="text-sm font-semibold text-muted-foreground">Selecione um produto acima</p>
              <p className="text-xs text-muted-foreground mt-1">Escolha o produto para ver a análise de ROAS</p>
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
        // Push precoIncompleto and margemInsuficiente to the end
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
        <BarChart3 className="w-4 h-4 text-primary" />
        <p className="section-label !mb-0">Ranking de Produtos</p>
      </div>

      {withAds.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] text-text-3 font-medium uppercase tracking-wider px-1">
            Com dados de Ads · {withAds.length}
          </p>
          {withAds.map((r, i) => (
            <div key={r.product.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-primary/20 transition-colors">
              <span className={cn('text-xs font-black w-7 h-7 rounded-lg flex items-center justify-center',
                i === 0 ? 'bg-primary/15 text-primary' :
                i === 1 ? 'bg-success/10 text-success' :
                'bg-surface-2 text-text-3'
              )}>
                #{i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{r.product.name}</p>
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
  return (
    <div className="pb-6 md:pb-4">
      <Tabs defaultValue="roas" className="w-full">
        <TabsList className="w-full grid grid-cols-2 h-11 mb-5 bg-surface-2 rounded-xl p-1">
          <TabsTrigger
            value="roas"
            className="rounded-lg text-xs font-bold gap-1.5 transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-text-3"
          >
            <Target className="w-3.5 h-3.5" />
            ROAS
          </TabsTrigger>
          <TabsTrigger
            value="ads"
            className="rounded-lg text-xs font-bold gap-1.5 transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-text-3"
          >
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

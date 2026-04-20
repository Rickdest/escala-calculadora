import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, SlidersHorizontal, Package, TrendingUp, TrendingDown, Percent, DollarSign, Download, FileSpreadsheet, FileText, ArrowUpDown, ChevronRight, ShoppingBag, Loader2, AlertCircle, Target, Trophy, AlertTriangle, Sparkles, ChevronDown, BarChart3 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useProductAdsMetrics } from '@/hooks/useProductAdsMetrics';
import { useStore } from '@/contexts/StoreContext';
import { Product, SortOption } from '@/types/store';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import ProductCard from '@/components/cards/ProductCard';
import { ProductForm } from '@/components/forms/ProductForm';
import { MarginDistributionChart, TopProductsChart, ProfitSummaryChart } from '@/components/charts/AnalyticsCharts';
import { ProductThumbnail } from '@/components/ProductThumbnail';
import { TrendSearchCard } from '@/components/products/TrendSearchCard';

import { useShopeeProducts } from '@/hooks/useShopeeProducts';
import { ShopeeImportModal, type ShopeeProduct } from '@/components/produtos/ShopeeImportModal';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn, getMarginStatus } from '@/lib/utils';
import { exportToCSV, exportToPDF } from '@/lib/exportUtils';


const productSortOptions: { value: SortOption; label: string }[] = [
  { value: 'recent', label: 'Mais Recentes' },
  { value: 'margin-high', label: 'Maior Margem' },
  { value: 'margin-low', label: 'Menor Margem' },
  { value: 'profit-high', label: 'Maior Lucro' },
  { value: 'profit-low', label: 'Menor Lucro' },
  { value: 'name', label: 'Nome A-Z' },
];

const analysisSortOptions: { value: SortOption; label: string }[] = [
  { value: 'margin-high', label: 'Maior Margem' },
  { value: 'margin-low', label: 'Menor Margem' },
  { value: 'profit-high', label: 'Maior Lucro' },
  { value: 'profit-low', label: 'Menor Lucro' },
];

export default function Products() {
  const { currentStore, addProduct, updateProduct, deleteProduct, duplicateProduct, calculateProduct, getStoreStats, isLoading, loadError, retryLoad } = useStore();
  const { metricsMap, reload: reloadAds } = useProductAdsMetrics();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { importProducts, importing, progress: importProgress, isConnected: shopeeConnected } = useShopeeProducts();
  
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [analysisSortBy, setAnalysisSortBy] = useState<SortOption>('margin-high');
  const [analysisSearch, setAnalysisSearch] = useState('');
  const [analysisFilter, setAnalysisFilter] = useState<'all' | 'profitable' | 'healthy' | 'attention' | 'loss'>('all');
  
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [trendOpen, setTrendOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = window.localStorage.getItem('products-trend-open');
    // Default to OPEN — only stay closed if user explicitly closed it before
    return saved === null ? true : saved === '1';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('products-trend-open', trendOpen ? '1' : '0');
  }, [trendOpen]);

  const draftFilter = searchParams.get('filter');

  const products = useMemo(() => {
    if (!currentStore) return [];
    let filtered = currentStore.products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (draftFilter === 'draft') {
      filtered = filtered.filter(p => p.draft === true);
    } else if (draftFilter === 'sem-custo') {
      filtered = filtered.filter(p => !p.costPrice || p.costPrice === 0);
    }
    const withCalc = filtered.map(p => ({ product: p, calc: calculateProduct(p, currentStore.config) }));
    switch (sortBy) {
      case 'margin-high': return withCalc.sort((a, b) => b.calc.realMargin - a.calc.realMargin);
      case 'margin-low': return withCalc.sort((a, b) => a.calc.realMargin - b.calc.realMargin);
      case 'profit-high': return withCalc.sort((a, b) => b.calc.netProfit - a.calc.netProfit);
      case 'profit-low': return withCalc.sort((a, b) => a.calc.netProfit - b.calc.netProfit);
      case 'name': return withCalc.sort((a, b) => a.product.name.localeCompare(b.product.name));
      case 'recent':
      default: return withCalc.sort((a, b) => new Date(b.product.createdAt).getTime() - new Date(a.product.createdAt).getTime());
    }
  }, [currentStore, searchQuery, sortBy, calculateProduct, draftFilter]);

  const { stats, analysisProducts, summary, filterCounts, missingCost } = useMemo(() => {
    if (!currentStore) return { stats: null, analysisProducts: [], summary: null, filterCounts: { all: 0, profitable: 0, healthy: 0, attention: 0, loss: 0 }, missingCost: 0 };
    const storeStats = getStoreStats(currentStore);
    const withCalc = currentStore.products.map(p => ({ product: p, calc: calculateProduct(p, currentStore.config) }));

    // Filter counts (independent of active filter)
    const counts = {
      all: withCalc.length,
      profitable: withCalc.filter(x => x.calc.realMargin >= 17).length,
      healthy: withCalc.filter(x => x.calc.realMargin >= 10 && x.calc.realMargin < 17).length,
      attention: withCalc.filter(x => x.calc.realMargin >= 0 && x.calc.realMargin < 10).length,
      loss: withCalc.filter(x => x.calc.realMargin < 0).length,
    };
    const noCost = currentStore.products.filter(p => !p.costPrice || p.costPrice === 0).length;

    // Apply search + filter
    let filtered = withCalc.filter(({ product }) =>
      product.name.toLowerCase().includes(analysisSearch.toLowerCase())
    );
    if (analysisFilter === 'profitable') filtered = filtered.filter(x => x.calc.realMargin >= 17);
    else if (analysisFilter === 'healthy') filtered = filtered.filter(x => x.calc.realMargin >= 10 && x.calc.realMargin < 17);
    else if (analysisFilter === 'attention') filtered = filtered.filter(x => x.calc.realMargin >= 0 && x.calc.realMargin < 10);
    else if (analysisFilter === 'loss') filtered = filtered.filter(x => x.calc.realMargin < 0);

    let sorted = [...filtered];
    switch (analysisSortBy) {
      case 'margin-high': sorted.sort((a, b) => b.calc.realMargin - a.calc.realMargin); break;
      case 'margin-low': sorted.sort((a, b) => a.calc.realMargin - b.calc.realMargin); break;
      case 'profit-high': sorted.sort((a, b) => b.calc.netProfit - a.calc.netProfit); break;
      case 'profit-low': sorted.sort((a, b) => a.calc.netProfit - b.calc.netProfit); break;
    }

    const best = withCalc.length > 0 ? withCalc.reduce((a, b) => a.calc.realMargin >= b.calc.realMargin ? a : b) : null;
    const worst = withCalc.length > 0 ? withCalc.reduce((a, b) => a.calc.realMargin <= b.calc.realMargin ? a : b) : null;

    return {
      stats: storeStats,
      analysisProducts: sorted,
      summary: { best, worst },
      filterCounts: counts,
      missingCost: noCost,
    };
  }, [currentStore, analysisSortBy, analysisSearch, analysisFilter, calculateProduct, getStoreStats]);

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const handleSaveProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingProduct) {
      await updateProduct(editingProduct.id, productData);
    } else {
      await addProduct(productData);
    }
    setShowProductForm(false);
    setEditingProduct(null);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowProductForm(true);
  };

  const handleCloseForm = () => {
    setShowProductForm(false);
    setEditingProduct(null);
  };

  const handleExportCSV = () => {
    if (!currentStore || analysisProducts.length === 0) return;
    exportToCSV(analysisProducts, currentStore.name);
  };

  const handleExportPDF = () => {
    if (!currentStore || analysisProducts.length === 0) return;
    exportToPDF(analysisProducts, currentStore);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mb-4" />
          <p className="text-text-2 text-sm">Carregando...</p>
        </div>
      </AppLayout>
    );
  }

  if (loadError) {
    return (
      <AppLayout>
        <PageHeader title="Produtos" showStoreSelector={false} />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
          <p className="text-text-2 text-sm">Erro ao carregar seus dados.</p>
          <button onClick={retryLoad} className="text-primary underline text-sm">Tentar novamente</button>
        </div>
      </AppLayout>
    );
  }

  if (!currentStore) {
    return (
      <AppLayout>
        <PageHeader title="Produtos" showStoreSelector={false} />
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
          <p className="text-text-2">Selecione uma loja primeiro</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Produtos"
      />

      <div className="page-container pt-2 pb-24 md:pb-6 space-y-2.5 md:pt-6">
        {/* Draft filter banner */}
        {draftFilter === 'draft' && (
          <div className="flex items-center gap-2 text-sm text-warning bg-warning/10 border border-warning/20 rounded-lg px-4 py-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">
              Estes produtos foram criados automaticamente ao importar o CSV de Ads. 
              Preencha o custo para calcular margem e ROAS.
            </span>
            <button 
              onClick={() => setSearchParams({})}
              className="text-xs underline whitespace-nowrap text-muted-foreground hover:text-foreground"
            >
              Ver todos →
            </button>
          </div>
        )}
        {/* Shopee import + cost chip */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {shopeeConnected && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImportModalOpen(true)}
                className="border-[#EE4D2D]/30 text-[#EE4D2D] hover:bg-[#EE4D2D]/5 text-xs"
              >
                <ShoppingBag className="w-3.5 h-3.5 mr-1.5" />
                Importar da Shopee
              </Button>
            )}
            {(() => {
              const noCost = currentStore?.products?.filter(p => !p.costPrice || p.costPrice === 0).length || 0;
              if (noCost === 0) return null;
              return (
                <span className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-full px-3 py-1">
                  <AlertCircle className="w-3 h-3" />
                  {noCost} sem custo
                </span>
              );
            })()}
          </div>
        </div>
        <Tabs defaultValue="products" className="w-full">
          <div className="flex items-center gap-2">
            <TabsList className="flex-1 grid grid-cols-2 h-11 rounded-xl bg-secondary/80 border border-border p-1">
              <TabsTrigger value="products" className="flex-1 h-9 rounded-lg text-xs font-bold gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:text-foreground/70">
                Produtos <span className="ml-1 opacity-70">({stats?.totalProducts || 0})</span>
              </TabsTrigger>
              <TabsTrigger value="analysis" className="flex-1 h-9 rounded-lg text-xs font-bold gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:text-foreground/70">
                Análise
              </TabsTrigger>
            </TabsList>
            {analysisProducts.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="h-9 w-9 p-0 border-border bg-surface-2 flex-shrink-0"><Download className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportCSV}><FileSpreadsheet className="w-4 h-4 mr-2" />Exportar CSV</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPDF}><FileText className="w-4 h-4 mr-2" />Exportar PDF</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <TabsContent value="products" className="space-y-3 mt-3">
            {/* Margin bar */}
            {stats && stats.totalProducts > 0 && (
              <div className="flex items-center gap-3 animate-fade-up">
                <span className="text-xs text-text-2">Margem média:</span>
                <span className={cn('text-sm font-bold font-mono font-mono-num', getMarginStatus(stats.avgMargin).color)}>
                  {stats.avgMargin.toFixed(1)}%
                </span>
                <div className="flex-1 h-1 bg-surface-2 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', getMarginStatus(stats.avgMargin).color.replace('text-', 'bg-'))}
                    style={{ width: `${Math.min(100, (stats.avgMargin / Math.max(currentStore.config.desiredMargin, 1)) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Search */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-3" />
                <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar produto..." className="pl-10 h-10 bg-surface-2 border-border rounded-lg focus:border-primary" />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-10 px-3 border-border bg-surface-2"><SlidersHorizontal className="w-4 h-4 text-text-2" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {productSortOptions.map((option) => (
                    <DropdownMenuItem key={option.value} onClick={() => setSortBy(option.value)} className={cn('cursor-pointer', sortBy === option.value && 'text-primary')}>
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Product List */}
            {products.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {products.map(({ product, calc }) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    calculation={calc}
                    config={currentStore.config}
                    onCardClick={(p) => navigate(`/products/${p.id}`)}
                    onEdit={handleEdit}
                    onDuplicate={async (id) => { await duplicateProduct(id); }}
                    onDelete={async (id) => { await deleteProduct(id); }}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-14 h-14 rounded-xl bg-surface-2 mx-auto flex items-center justify-center mb-3">
                  <Package className="w-7 h-7 text-text-3" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">{searchQuery ? 'Nenhum produto encontrado' : 'Nenhum produto ainda'}</h3>
                <p className="text-sm text-text-2 mb-5">{searchQuery ? 'Tente buscar com outros termos' : 'Adicione seu primeiro produto'}</p>
                {!searchQuery && (
                  <Button onClick={() => setShowProductForm(true)} className="bg-primary hover:bg-primary/90 rounded-[10px]">
                    <Plus className="w-4 h-4 mr-2" />Adicionar Produto
                  </Button>
                )}
              </div>
            )}

            {/* Readonly note for Shopee products */}
            {shopeeConnected && products.length > 0 && (
              <div className="rounded-lg bg-muted/30 border border-border p-3 text-xs text-muted-foreground mt-2">
                🔒 Preço de venda e estoque são sincronizados da Shopee (somente leitura).
                Para editar, acesse o Shopee Seller Center. Apenas o custo do produto é gerenciado aqui.
              </div>
            )}
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4 mt-3">
            {stats && currentStore.products.length > 0 ? (
              <>
                {/* Hero KPI tiles */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  {/* MARGEM — com mini-rodapé Best/Worst clicável */}
                  <div className="surface-card p-2.5 animate-fade-up flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Percent className="w-3.5 h-3.5 text-text-3" />
                      <p className="section-label">Margem</p>
                    </div>
                    <p className={cn('font-mono text-lg md:text-xl font-bold font-mono-num leading-tight', getMarginStatus(stats.avgMargin).color)}>
                      {stats.avgMargin.toFixed(1)}%
                    </p>
                    <div className="mt-1 h-1 bg-surface-2 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', getMarginStatus(stats.avgMargin).color.replace('text-', 'bg-'))}
                        style={{ width: `${Math.min(100, (stats.avgMargin / Math.max(currentStore.config.desiredMargin, 1)) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-text-3 mt-1">meta {currentStore.config.desiredMargin}%</p>

                    {/* Best/Worst mini-rows */}
                    {summary?.best && summary?.worst && summary.best.product.id !== summary.worst.product.id && (
                      <div className="mt-2 pt-2 border-t border-border/60 space-y-1">
                        <button
                          onClick={() => navigate(`/products/${summary.best!.product.id}`)}
                          className="w-full flex items-center gap-1.5 text-[10px] text-left hover:text-success transition-colors group"
                        >
                          <Trophy className="w-3 h-3 text-success flex-shrink-0" />
                          <span className="flex-1 truncate text-text-2 group-hover:text-success">{summary.best.product.name}</span>
                          <span className="font-mono font-bold text-success font-mono-num">{summary.best.calc.realMargin.toFixed(1)}%</span>
                        </button>
                        <button
                          onClick={() => navigate(`/products/${summary.worst!.product.id}`)}
                          className="w-full flex items-center gap-1.5 text-[10px] text-left hover:text-destructive transition-colors group"
                        >
                          <AlertTriangle className="w-3 h-3 text-destructive flex-shrink-0" />
                          <span className="flex-1 truncate text-text-2 group-hover:text-destructive">{summary.worst.product.name}</span>
                          <span className="font-mono font-bold text-destructive font-mono-num">{summary.worst.calc.realMargin.toFixed(1)}%</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="surface-card p-2.5 animate-fade-up stagger-1 flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1">
                      <DollarSign className="w-3.5 h-3.5 text-text-3" />
                      <p className="section-label">Lucro</p>
                    </div>
                    <p className={cn('font-mono text-lg md:text-xl font-bold font-mono-num leading-tight', stats.totalProfit >= 0 ? 'text-success' : 'text-destructive')}>
                      {formatCurrency(stats.totalProfit)}
                    </p>
                    <div className="mt-1 h-1 bg-surface-2 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full', stats.totalProfit >= 0 ? 'bg-success' : 'bg-destructive')}
                        style={{ width: stats.totalProfit >= 0 ? '100%' : '40%' }}
                      />
                    </div>
                    <p className="text-[10px] text-text-3 mt-1">{stats.totalProducts} produtos</p>
                  </div>

                  <div className="surface-card p-2.5 animate-fade-up stagger-2 flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Target className="w-3.5 h-3.5 text-text-3" />
                      <p className="section-label">Na Meta</p>
                    </div>
                    <p className="font-mono text-lg md:text-xl font-bold font-mono-num text-foreground leading-tight">
                      {stats.productsAboveTarget}
                      <span className="text-sm text-text-3 font-normal"> / {stats.totalProducts}</span>
                    </p>
                    <div className="mt-1 h-1 bg-surface-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${stats.totalProducts > 0 ? (stats.productsAboveTarget / stats.totalProducts) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-text-3 mt-1">
                      {stats.totalProducts > 0 ? ((stats.productsAboveTarget / stats.totalProducts) * 100).toFixed(0) : 0}% no alvo
                    </p>
                  </div>

                  <div className="surface-card p-2.5 animate-fade-up stagger-3 flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1">
                      <AlertCircle className="w-3.5 h-3.5 text-text-3" />
                      <p className="section-label">Sem Custo</p>
                    </div>
                    <p className={cn('font-mono text-lg md:text-xl font-bold font-mono-num leading-tight', missingCost > 0 ? 'text-warning' : 'text-success')}>
                      {missingCost}
                    </p>
                    <div className="mt-1 h-1 bg-surface-2 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full', missingCost > 0 ? 'bg-warning' : 'bg-success')}
                        style={{ width: missingCost > 0 ? `${Math.min(100, (missingCost / Math.max(stats.totalProducts, 1)) * 100)}%` : '100%' }}
                      />
                    </div>
                    <p className="text-[10px] text-text-3 mt-1">
                      {missingCost > 0 ? 'preencher custo' : 'tudo certo'}
                    </p>
                  </div>
                </div>

                {/* Saúde da carteira (charts) */}
                <div className="space-y-4">
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-primary" />
                        Saúde da carteira
                      </h2>
                      <p className="text-[11px] text-text-3 mt-1">Distribuição de margens, ranking e saúde financeira</p>
                    </div>
                    <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-2 text-text-3 border border-border/50">
                      3 visões
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <MarginDistributionChart />
                    <TopProductsChart />
                    <ProfitSummaryChart />
                  </div>
                </div>

                {/* Pesquisar tendência (colapsável com CTA destacado) */}
                <Collapsible open={trendOpen} onOpenChange={setTrendOpen}>
                  <div className={cn(
                    "rounded-xl overflow-hidden transition-all",
                    trendOpen
                      ? "border border-primary/40 bg-card"
                      : "border border-primary/30 bg-gradient-to-br from-primary/[0.08] via-card to-card hover:border-primary/50 hover:from-primary/[0.12] shadow-sm",
                  )}>
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="w-full flex items-center gap-3 p-4 text-left group"
                      >
                        <div className={cn(
                          "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform",
                          trendOpen
                            ? "bg-primary/15 border border-primary/30"
                            : "bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30 group-hover:scale-105",
                        )}>
                          <Sparkles className={cn("w-5 h-5", trendOpen ? "text-primary" : "text-primary")} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-foreground">
                              Descobrir produtos vencedores
                            </p>
                            {!trendOpen && (
                              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/20">
                                Ferramenta
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-text-2 mt-0.5 leading-snug">
                            Pesquise demanda, sazonalidade e concorrência antes de cadastrar
                          </p>
                        </div>
                        <ChevronDown
                          className={cn(
                            "w-5 h-5 text-text-3 transition-transform flex-shrink-0",
                            trendOpen && "rotate-180 text-primary",
                          )}
                        />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t border-border p-3.5">
                        <TrendSearchCard hideOuterBorder hideHeader />
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>

                {/* Ranking section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">Ranking de Produtos</p>
                    <span className="text-[11px] text-text-3 font-mono font-mono-num">
                      {analysisProducts.length} de {filterCounts.all}
                    </span>
                  </div>

                  {/* Search + sort */}
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-3" />
                      <Input
                        value={analysisSearch}
                        onChange={(e) => setAnalysisSearch(e.target.value)}
                        placeholder="Buscar no ranking..."
                        className="pl-10 h-10 bg-surface-2 border-border rounded-lg focus:border-primary"
                      />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="h-10 px-3 border-border bg-surface-2 gap-1.5">
                          <ArrowUpDown className="w-4 h-4 text-text-2" />
                          <span className="hidden sm:inline text-xs">Ordenar</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {analysisSortOptions.map((option) => (
                          <DropdownMenuItem
                            key={option.value}
                            onClick={() => setAnalysisSortBy(option.value)}
                            className={cn('cursor-pointer text-xs', analysisSortBy === option.value && 'text-primary')}
                          >
                            {option.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Filter chips */}
                  <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 pb-1">
                    {([
                      { key: 'all', label: 'Todos', dot: null, count: filterCounts.all },
                      { key: 'profitable', label: 'Lucrativos', dot: 'bg-success', count: filterCounts.profitable },
                      { key: 'healthy', label: 'Saudáveis', dot: 'bg-success/60', count: filterCounts.healthy },
                      { key: 'attention', label: 'Atenção', dot: 'bg-warning', count: filterCounts.attention },
                      { key: 'loss', label: 'Prejuízo', dot: 'bg-destructive', count: filterCounts.loss },
                    ] as const).filter(f => f.key === 'all' || f.count > 0).map(f => {
                      const isActive = analysisFilter === f.key;
                      return (
                        <button
                          key={f.key}
                          onClick={() => setAnalysisFilter(f.key)}
                          className={cn(
                            'shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border flex items-center gap-1.5',
                            isActive
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-surface-2 border-border text-text-2 hover:text-foreground'
                          )}
                        >
                          {f.dot && <span className={cn('w-1.5 h-1.5 rounded-full', f.dot)} />}
                          {f.label}
                          <span className="opacity-60 font-mono-num">({f.count})</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Ranking list */}
                  {analysisProducts.length > 0 ? (
                    <div className="surface-card divide-y divide-border overflow-hidden">
                      {analysisProducts.map(({ product, calc }, index) => {
                        const status = getMarginStatus(calc.realMargin);
                        const target = currentStore.config.desiredMargin || 1;
                        const barPct = Math.max(0, Math.min(100, (calc.realMargin / target) * 100));
                        const noCost = !product.costPrice || product.costPrice === 0;
                        return (
                          <button
                            key={product.id}
                            onClick={() => navigate(`/products/${product.id}`)}
                            className={cn(
                              'w-full px-3 py-3 flex items-center gap-3 text-left transition-colors hover:bg-surface-2/50 animate-fade-up',
                              index < 3 && 'bg-primary/5'
                            )}
                            style={{ animationDelay: `${Math.min(index * 25, 400)}ms` }}
                          >
                            <div className={cn(
                              'w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold font-mono-num flex-shrink-0',
                              index === 0 ? 'bg-success text-white' :
                              index < 3 ? 'bg-primary/20 text-primary' :
                              'bg-surface-2 text-text-3'
                            )}>
                              {index + 1}
                            </div>

                            <ProductThumbnail
                              productId={product.id}
                              productName={product.name}
                              imageUrl={product.imageUrl}
                            />

                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground truncate text-sm leading-tight">
                                {product.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-text-3 font-mono font-mono-num">
                                <span>{formatCurrency(product.salePrice)}</span>
                                {!noCost && (
                                  <>
                                    <span className="text-text-3/50">·</span>
                                    <span>custo {formatCurrency(product.costPrice)}</span>
                                  </>
                                )}
                                {noCost && (
                                  <span className="text-warning">⚠ sem custo</span>
                                )}
                              </div>
                              {/* Margin bar */}
                              <div className="mt-1.5 h-1 bg-surface-2 rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    'h-full rounded-full transition-all',
                                    calc.realMargin < 0 ? 'bg-destructive' :
                                    calc.realMargin < 10 ? 'bg-warning' :
                                    'bg-success'
                                  )}
                                  style={{ width: `${barPct}%` }}
                                />
                              </div>
                            </div>

                            <div className="text-right flex-shrink-0">
                              <div className="flex items-center gap-1 justify-end">
                                {calc.realMargin >= 0 ? (
                                  <TrendingUp className={cn('w-3 h-3', status.color)} />
                                ) : (
                                  <TrendingDown className={cn('w-3 h-3', status.color)} />
                                )}
                                <span className={cn('font-mono font-bold text-sm font-mono-num', status.color)}>
                                  {calc.realMargin.toFixed(1)}%
                                </span>
                              </div>
                              <p className={cn(
                                'text-[11px] font-mono font-mono-num mt-0.5',
                                calc.netProfit >= 0 ? 'text-text-2' : 'text-destructive'
                              )}>
                                {formatCurrency(calc.netProfit)}
                              </p>
                            </div>

                            <ChevronRight className="w-4 h-4 text-text-3 flex-shrink-0 hidden md:block" />
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="surface-card py-10 text-center">
                      <Search className="w-8 h-8 text-text-3 mx-auto mb-2" />
                      <p className="text-sm text-text-2">Nenhum produto encontrado</p>
                      <button
                        onClick={() => { setAnalysisSearch(''); setAnalysisFilter('all'); }}
                        className="text-xs text-primary underline mt-2"
                      >
                        Limpar filtros
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <div className="w-14 h-14 rounded-xl bg-surface-2 mx-auto flex items-center justify-center mb-3">
                  <Package className="w-7 h-7 text-text-3" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Sem dados para análise</h3>
                <p className="text-sm text-text-2">Adicione produtos para ver análises e gráficos</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowProductForm(true)}
        className="fixed z-50 bg-[hsl(var(--accent))] hover:brightness-110 active:scale-95 transition-all duration-150 shadow-lg
          bottom-[calc(96px+env(safe-area-inset-bottom))] right-5 w-14 h-14 rounded-full flex items-center justify-center
          md:right-8 md:rounded-xl md:w-auto md:h-auto md:px-5 md:py-3"
        style={{ backgroundColor: '#F97316' }}
      >
        <Plus className="w-6 h-6 text-white md:w-5 md:h-5" />
        <span className="hidden md:inline ml-2 text-white text-sm font-bold">Novo Produto</span>
      </button>

      {showProductForm && (
        <ProductForm product={editingProduct} onClose={handleCloseForm} onSave={handleSaveProduct} />
      )}

      {importModalOpen && (
        <ShopeeImportModal
          isOpen={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          progress={importProgress}
          onImport={async (selectedIds, shopeeProducts) => {
            const result = await importProducts(selectedIds, shopeeProducts);
            if (result) retryLoad();
            setImportModalOpen(false);
          }}
        />
      )}
    </AppLayout>
  );
}

import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, SlidersHorizontal, Package, TrendingUp, TrendingDown, Percent, DollarSign, Download, FileSpreadsheet, FileText, ArrowUpDown, ChevronRight, ShoppingBag, Loader2, AlertCircle } from 'lucide-react';
import { useProductAdsMetrics } from '@/hooks/useProductAdsMetrics';
import { useStore } from '@/contexts/StoreContext';
import { Product, ProductCalculation, SortOption } from '@/types/store';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import ProductCard from '@/components/cards/ProductCard';
import { ProductForm } from '@/components/forms/ProductForm';
import { MarginDistributionChart, TopProductsChart, ProfitSummaryChart } from '@/components/charts/AnalyticsCharts';
import { ProductThumbnail } from '@/components/ProductThumbnail';

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
import { toast } from 'sonner';

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
  
  const [importModalOpen, setImportModalOpen] = useState(false);

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

  const { stats, analysisProducts, summary } = useMemo(() => {
    if (!currentStore) return { stats: null, analysisProducts: [], summary: null };
    const storeStats = getStoreStats(currentStore);
    const withCalc = currentStore.products.map(p => ({ product: p, calc: calculateProduct(p, currentStore.config) }));
    let sorted = [...withCalc];
    switch (analysisSortBy) {
      case 'margin-high': sorted.sort((a, b) => b.calc.realMargin - a.calc.realMargin); break;
      case 'margin-low': sorted.sort((a, b) => a.calc.realMargin - b.calc.realMargin); break;
      case 'profit-high': sorted.sort((a, b) => b.calc.netProfit - a.calc.netProfit); break;
      case 'profit-low': sorted.sort((a, b) => a.calc.netProfit - b.calc.netProfit); break;
    }
    const bestMargin = withCalc.length > 0 ? Math.max(...withCalc.map(p => p.calc.realMargin)) : 0;
    const worstMargin = withCalc.length > 0 ? Math.min(...withCalc.map(p => p.calc.realMargin)) : 0;
    return { stats: storeStats, analysisProducts: sorted, summary: { bestMargin, worstMargin } };
  }, [currentStore, analysisSortBy, calculateProduct, getStoreStats]);

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
            {stats && analysisProducts.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="surface-card p-4 animate-fade-up">
                    <p className="section-label mb-1">Margem Média</p>
                    <p className={cn('font-mono text-2xl font-bold font-mono-num', getMarginStatus(stats.avgMargin).color)}>
                      {stats.avgMargin.toFixed(1)}%
                    </p>
                  </div>
                  <div className="surface-card p-4 animate-fade-up stagger-1">
                    <p className="section-label mb-1">Lucro Total</p>
                    <p className={cn('font-mono text-xl font-bold font-mono-num', stats.totalProfit >= 0 ? 'text-success' : 'text-destructive')}>
                      {formatCurrency(stats.totalProfit)}
                    </p>
                  </div>
                </div>

                {summary && (
                  <div className="surface-card p-4 animate-fade-up stagger-2">
                    <p className="text-sm font-semibold text-foreground mb-3">Resumo de Performance</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div>
                          <p className="section-label">Melhor Margem</p>
                          <p className="font-mono text-lg font-bold text-success font-mono-num">{summary.bestMargin.toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="section-label">Pior Margem</p>
                          <p className="font-mono text-lg font-bold text-destructive font-mono-num">{summary.worstMargin.toFixed(1)}%</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="section-label">Na Meta</p>
                          <p className="font-mono text-lg font-bold text-success font-mono-num">{stats.productsAboveTarget}</p>
                        </div>
                        <div>
                          <p className="section-label">Fora da Meta</p>
                          <p className="font-mono text-lg font-bold text-destructive font-mono-num">{stats.productsBelowTarget}</p>
                        </div>
                      </div>
                    </div>
                    <div className="pt-3 mt-3 border-t border-border flex items-center justify-between text-sm">
                      <span className="text-text-2">Meta de Margem</span>
                      <span className="font-bold font-mono font-mono-num text-primary">{currentStore.config.desiredMargin}%</span>
                    </div>
                  </div>
                )}

                <div className="space-y-4 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 md:space-y-0">
                  <MarginDistributionChart />
                  <TopProductsChart />
                  <ProfitSummaryChart />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                  {analysisSortOptions.map((option) => (
                    <Button key={option.value} variant={analysisSortBy === option.value ? 'default' : 'outline'} size="sm" onClick={() => setAnalysisSortBy(option.value)}
                      className={cn('flex-shrink-0 rounded-[6px] text-xs', analysisSortBy === option.value ? 'bg-primary' : 'bg-surface-2 border-border text-text-2')}>
                      <ArrowUpDown className="w-3 h-3 mr-1" />{option.label}
                    </Button>
                  ))}
                </div>

                <div className="space-y-0 md:max-w-[800px]">
                  <p className="text-sm font-semibold text-foreground mb-2">Ranking de Produtos</p>
                  <div className="surface-card divide-y divide-border">
                    {analysisProducts.map(({ product, calc }, index) => (
                      <div key={product.id} className="px-4 py-3 flex items-center gap-3 animate-fade-up" style={{ animationDelay: `${index * 30}ms` }}>
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold font-mono-num flex-shrink-0',
                          index < 3 ? 'bg-primary text-primary-foreground' : 'bg-surface-2 text-text-2'
                        )}>
                          #{index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate text-sm">{product.name}</p>
                          <p className="text-xs text-text-2 font-mono font-mono-num">{formatCurrency(product.salePrice)}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="flex items-center gap-1.5 justify-end">
                            {calc.realMargin >= 0 ? <TrendingUp className={cn('w-3.5 h-3.5', getMarginStatus(calc.realMargin).color)} /> : <TrendingDown className={cn('w-3.5 h-3.5', getMarginStatus(calc.realMargin).color)} />}
                            <span className={cn('font-mono font-bold text-base font-mono-num', getMarginStatus(calc.realMargin).color)}>
                              {calc.realMargin.toFixed(1)}%
                            </span>
                          </div>
                          <p className={cn('text-sm font-mono font-mono-num', calc.netProfit >= 0 ? 'text-foreground' : 'text-destructive')}>
                            {formatCurrency(calc.netProfit)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
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

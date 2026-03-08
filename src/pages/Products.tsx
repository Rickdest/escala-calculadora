import { useState, useMemo } from 'react';
import { Plus, Search, SlidersHorizontal, Package, TrendingUp, TrendingDown, Percent, DollarSign, Download, FileSpreadsheet, FileText, ArrowUpDown } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
import { Product, SortOption } from '@/types/store';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { ProductCard } from '@/components/cards/ProductCard';
import { ProductForm } from '@/components/forms/ProductForm';
import { MarginDistributionChart, TopProductsChart, ProfitSummaryChart } from '@/components/charts/AnalyticsCharts';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
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
  const { currentStore, addProduct, updateProduct, deleteProduct, duplicateProduct, calculateProduct, getStoreStats } = useStore();
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [analysisSortBy, setAnalysisSortBy] = useState<SortOption>('margin-high');

  const products = useMemo(() => {
    if (!currentStore) return [];
    
    let filtered = currentStore.products.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const withCalc = filtered.map(p => ({
      product: p,
      calc: calculateProduct(p, currentStore.config),
    }));

    switch (sortBy) {
      case 'margin-high':
        return withCalc.sort((a, b) => b.calc.realMargin - a.calc.realMargin);
      case 'margin-low':
        return withCalc.sort((a, b) => a.calc.realMargin - b.calc.realMargin);
      case 'profit-high':
        return withCalc.sort((a, b) => b.calc.netProfit - a.calc.netProfit);
      case 'profit-low':
        return withCalc.sort((a, b) => a.calc.netProfit - b.calc.netProfit);
      case 'name':
        return withCalc.sort((a, b) => a.product.name.localeCompare(b.product.name));
      case 'recent':
      default:
        return withCalc.sort((a, b) => 
          new Date(b.product.createdAt).getTime() - new Date(a.product.createdAt).getTime()
        );
    }
  }, [currentStore, searchQuery, sortBy, calculateProduct]);

  const { stats, analysisProducts, summary } = useMemo(() => {
    if (!currentStore) return { stats: null, analysisProducts: [], summary: null };

    const storeStats = getStoreStats(currentStore);
    const withCalc = currentStore.products.map(p => ({
      product: p,
      calc: calculateProduct(p, currentStore.config),
    }));

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleSaveProduct = (productData: any) => {
    if (editingProduct) {
      updateProduct(editingProduct.id, productData);
    } else {
      addProduct(productData);
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

  if (!currentStore) {
    return (
      <AppLayout>
        <PageHeader title="Produtos" showStoreSelector={false} />
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
          <p className="text-muted-foreground">Selecione uma loja primeiro</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader 
        title="Produtos"
        subtitle={currentStore.name}
        action={
          <div className="flex gap-2">
            {analysisProducts.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Download className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportCSV}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Exportar CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPDF}>
                    <FileText className="w-4 h-4 mr-2" />
                    Exportar PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button size="sm" onClick={() => setShowProductForm(true)} className="gradient-primary">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        }
      />

      <div className="px-4 py-5 space-y-4">
        <Tabs defaultValue="products" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="products">Produtos</TabsTrigger>
            <TabsTrigger value="analysis">Análise</TabsTrigger>
            <TabsTrigger value="roas">ROAS</TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4 mt-4">
            {/* Search and Filter */}
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar produto..."
                  className="pl-11 input-modern h-12"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" className="h-12 px-4">
                    <SlidersHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {productSortOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => setSortBy(option.value)}
                      className={cn(
                        'cursor-pointer',
                        sortBy === option.value && 'bg-primary/10 text-primary'
                      )}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Products List */}
            {products.length > 0 ? (
              <div className="space-y-3">
                {products.map(({ product, calc }, index) => (
                  <div 
                    key={product.id} 
                    className="animate-fade-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <ProductCard
                      product={product}
                      calculation={calc}
                      onEdit={handleEdit}
                      onDuplicate={duplicateProduct}
                      onDelete={deleteProduct}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="w-20 h-20 rounded-2xl bg-secondary mx-auto flex items-center justify-center mb-4">
                  <Package className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="font-bold text-foreground mb-2 text-lg">
                  {searchQuery ? 'Nenhum produto encontrado' : 'Nenhum produto ainda'}
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {searchQuery 
                    ? 'Tente buscar com outros termos' 
                    : 'Adicione seu primeiro produto'
                  }
                </p>
                {!searchQuery && (
                  <Button onClick={() => setShowProductForm(true)} className="gradient-primary">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Produto
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis" className="space-y-6 mt-4">
            {stats && analysisProducts.length > 0 ? (
              <>
                {/* Main Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="glass-card p-5 animate-fade-up">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={cn(
                        'p-2 rounded-xl',
                        stats.avgMargin >= currentStore.config.desiredMargin ? 'bg-success-muted' : 'bg-warning-muted'
                      )}>
                        <Percent className={cn(
                          'w-5 h-5',
                          stats.avgMargin >= currentStore.config.desiredMargin ? 'text-success' : 'text-warning'
                        )} />
                      </div>
                    </div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1">Margem Média</p>
                    <p className={cn(
                      'number-xl',
                      stats.avgMargin >= currentStore.config.desiredMargin ? 'text-success' : 'text-warning'
                    )}>
                      {stats.avgMargin.toFixed(1)}%
                    </p>
                  </div>
                  
                  <div className="glass-card p-5 animate-fade-up stagger-1">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 rounded-xl bg-primary/10">
                        <DollarSign className="w-5 h-5 text-primary" />
                      </div>
                    </div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1">Lucro Total</p>
                    <p className={cn(
                      'number-lg',
                      stats.totalProfit >= 0 ? 'text-success' : 'text-destructive'
                    )}>
                      {formatCurrency(stats.totalProfit)}
                    </p>
                  </div>
                </div>

                {/* Performance Summary */}
                {summary && (
                  <div className="glass-card p-5 animate-fade-up stagger-2">
                    <h3 className="font-bold text-sm mb-4">Resumo de Performance</h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs text-muted-foreground font-semibold">Melhor Margem</p>
                          <p className="number-md text-success">{summary.bestMargin.toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground font-semibold">Pior Margem</p>
                          <p className="number-md text-danger">{summary.worstMargin.toFixed(1)}%</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs text-muted-foreground font-semibold">Na Meta</p>
                          <p className="number-md text-success">{stats.productsAboveTarget}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground font-semibold">Fora da Meta</p>
                          <p className="number-md text-danger">{stats.productsBelowTarget}</p>
                        </div>
                      </div>
                    </div>
                    <div className="pt-4 mt-4 border-t border-border/50 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground font-medium">Meta de Margem</span>
                      <span className="font-bold text-primary">{currentStore.config.desiredMargin}%</span>
                    </div>
                  </div>
                )}

                {/* Charts */}
                <div className="space-y-4">
                  <MarginDistributionChart />
                  <TopProductsChart />
                  <ProfitSummaryChart />
                </div>

                {/* Sort Options */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                  {analysisSortOptions.map((option) => (
                    <Button
                      key={option.value}
                      variant={analysisSortBy === option.value ? 'default' : 'secondary'}
                      size="sm"
                      onClick={() => setAnalysisSortBy(option.value)}
                      className={cn(
                        'flex-shrink-0',
                        analysisSortBy === option.value && 'gradient-primary'
                      )}
                    >
                      <ArrowUpDown className="w-3 h-3 mr-1.5" />
                      {option.label}
                    </Button>
                  ))}
                </div>

                {/* Products Ranking */}
                <div className="space-y-3">
                  <h3 className="font-bold text-foreground">Ranking de Produtos</h3>
                  {analysisProducts.map(({ product, calc }, index) => (
                    <div 
                      key={product.id}
                      className="glass-card p-4 animate-fade-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          'w-12 h-12 rounded-xl flex items-center justify-center text-sm font-extrabold flex-shrink-0',
                          index < 3 ? 'gradient-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                        )}>
                          #{index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-foreground truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground">Venda: {formatCurrency(product.salePrice)}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="flex items-center gap-1.5 justify-end">
                            {calc.isAboveTarget ? (
                              <TrendingUp className="w-4 h-4 text-success" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-danger" />
                            )}
                            <span className={cn(
                              'font-extrabold text-lg',
                              calc.isAboveTarget ? 'text-success' : 'text-danger'
                            )}>
                              {calc.realMargin.toFixed(1)}%
                            </span>
                          </div>
                          <p className={cn(
                            'text-sm font-bold',
                            calc.netProfit >= 0 ? 'text-foreground' : 'text-destructive'
                          )}>
                            {formatCurrency(calc.netProfit)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-20">
                <div className="w-20 h-20 rounded-2xl bg-secondary mx-auto flex items-center justify-center mb-4">
                  <Package className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="font-bold text-foreground mb-2 text-lg">Sem dados para análise</h3>
                <p className="text-sm text-muted-foreground">Adicione produtos para ver análises e gráficos</p>
              </div>
            )}
          </TabsContent>

          {/* ROAS Tab */}
          <TabsContent value="roas" className="space-y-4 mt-4">
            <RoasAnalysis />
          </TabsContent>
        </Tabs>
      </div>

      {showProductForm && (
        <ProductForm 
          product={editingProduct}
          onClose={handleCloseForm}
          onSave={handleSaveProduct}
        />
      )}
    </AppLayout>
  );
}
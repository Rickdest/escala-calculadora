import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Percent, Package, ArrowUpDown, DollarSign, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
import { SortOption } from '@/types/store';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { MarginDistributionChart, TopProductsChart, ProfitSummaryChart } from '@/components/charts/AnalyticsCharts';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn, getMarginStatus } from '@/lib/utils';
import { exportToCSV, exportToPDF } from '@/lib/exportUtils';

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'margin-high', label: 'Maior Margem' },
  { value: 'margin-low', label: 'Menor Margem' },
  { value: 'profit-high', label: 'Maior Lucro' },
  { value: 'profit-low', label: 'Menor Lucro' },
];

export default function Analysis() {
  const { currentStore, calculateProduct, getStoreStats } = useStore();
  const [sortBy, setSortBy] = useState<SortOption>('margin-high');

  const { stats, products, summary } = useMemo(() => {
    if (!currentStore) {
      return { stats: null, products: [], summary: null };
    }

    const storeStats = getStoreStats(currentStore);
    
    const withCalc = currentStore.products.map(p => ({
      product: p,
      calc: calculateProduct(p, currentStore.config),
    }));

    // Sort products
    let sorted = [...withCalc];
    switch (sortBy) {
      case 'margin-high':
        sorted.sort((a, b) => b.calc.realMargin - a.calc.realMargin);
        break;
      case 'margin-low':
        sorted.sort((a, b) => a.calc.realMargin - b.calc.realMargin);
        break;
      case 'profit-high':
        sorted.sort((a, b) => b.calc.netProfit - a.calc.netProfit);
        break;
      case 'profit-low':
        sorted.sort((a, b) => a.calc.netProfit - b.calc.netProfit);
        break;
    }

    // Calculate summary
    const bestMargin = withCalc.length > 0 ? Math.max(...withCalc.map(p => p.calc.realMargin)) : 0;
    const worstMargin = withCalc.length > 0 ? Math.min(...withCalc.map(p => p.calc.realMargin)) : 0;

    return {
      stats: storeStats,
      products: sorted,
      summary: { bestMargin, worstMargin },
    };
  }, [currentStore, sortBy, calculateProduct, getStoreStats]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleExportCSV = () => {
    if (!currentStore || products.length === 0) return;
    exportToCSV(products, currentStore.name);
  };

  const handleExportPDF = () => {
    if (!currentStore || products.length === 0) return;
    exportToPDF(products, currentStore);
  };

  if (!currentStore || !stats) {
    return (
      <AppLayout>
        <PageHeader title="Análise" showStoreSelector={false} />
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
          <p className="text-muted-foreground">Selecione uma loja primeiro</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader 
        title="Análise"
        subtitle={currentStore.name}
        action={
          products.length > 0 && (
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
          )
        }
      />

      <div className="px-4 py-6 space-y-6">
        {/* Main Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-card p-5 animate-fade-up">
            <div className="flex items-center gap-2 mb-3">
              <div className={cn('p-2 rounded-xl', getMarginStatus(stats.avgMargin).bg)}>
                <Percent className={cn('w-5 h-5', getMarginStatus(stats.avgMargin).color)} />
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
        {summary && products.length > 0 && (
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
        {products.length > 0 && (
          <div className="space-y-4">
            <div className="animate-fade-up stagger-3">
              <MarginDistributionChart />
            </div>
            <div className="animate-fade-up stagger-4">
              <TopProductsChart />
            </div>
            <div className="animate-fade-up stagger-5">
              <ProfitSummaryChart />
            </div>
          </div>
        )}

        {/* Sort Options */}
        {products.length > 0 && (
          <div className="space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
              {sortOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={sortBy === option.value ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setSortBy(option.value)}
                  className={cn(
                    'flex-shrink-0',
                    sortBy === option.value && 'gradient-primary'
                  )}
                >
                  <ArrowUpDown className="w-3 h-3 mr-1.5" />
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Products Ranking */}
        {products.length > 0 ? (
          <div className="space-y-3">
            <h3 className="font-bold text-foreground">Ranking de Produtos</h3>
            
            {products.map(({ product, calc }, index) => {
              const position = index + 1;
              
              return (
                <div 
                  key={product.id}
                  className="glass-card p-4 animate-fade-up"
                  style={{ animationDelay: `${(index + 6) * 50}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center text-sm font-extrabold flex-shrink-0',
                      position <= 3 ? 'gradient-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                    )}>
                      #{position}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Venda: {formatCurrency(product.salePrice)}
                      </p>
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
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-secondary mx-auto flex items-center justify-center mb-4">
              <Package className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="font-bold text-foreground mb-2 text-lg">Sem dados para análise</h3>
            <p className="text-sm text-muted-foreground">
              Adicione produtos para ver análises e gráficos
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Percent, Package, ArrowUpDown } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
import { SortOption } from '@/types/store';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/cards/StatCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
    const totalRevenue = withCalc.reduce((sum, p) => sum + p.calc.grossRevenue, 0);
    const totalProfit = withCalc.reduce((sum, p) => sum + p.calc.netProfit, 0);
    const bestMargin = withCalc.length > 0 ? Math.max(...withCalc.map(p => p.calc.realMargin)) : 0;
    const worstMargin = withCalc.length > 0 ? Math.min(...withCalc.map(p => p.calc.realMargin)) : 0;

    return {
      stats: storeStats,
      products: sorted,
      summary: { totalRevenue, totalProfit, bestMargin, worstMargin },
    };
  }, [currentStore, sortBy, calculateProduct, getStoreStats]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
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
      />

      <div className="px-4 py-6 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            icon={Percent}
            label="Margem Média"
            value={stats.avgMargin.toFixed(1)}
            suffix="%"
            variant={stats.avgMargin >= currentStore.config.desiredMargin ? 'success' : 'warning'}
          />
          <StatCard
            icon={Package}
            label="Total Produtos"
            value={stats.totalProducts}
            variant="primary"
          />
        </div>

        {/* Performance Summary */}
        {summary && products.length > 0 && (
          <div className="bg-card rounded-2xl p-4 space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <h3 className="font-semibold text-foreground">Resumo Geral</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Melhor Margem</p>
                <p className="text-lg font-bold text-success">{summary.bestMargin.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pior Margem</p>
                <p className="text-lg font-bold text-danger">{summary.worstMargin.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Acima da Meta</p>
                <p className="text-lg font-bold text-success">{stats.productsAboveTarget}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Abaixo da Meta</p>
                <p className="text-lg font-bold text-danger">{stats.productsBelowTarget}</p>
              </div>
            </div>

            {/* Target indicator */}
            <div className="pt-3 border-t border-border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Meta de Margem</span>
                <span className="font-semibold text-primary">{currentStore.config.desiredMargin}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Sort Options */}
        {products.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
            {sortOptions.map((option) => (
              <Button
                key={option.value}
                variant={sortBy === option.value ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setSortBy(option.value)}
                className="flex-shrink-0"
              >
                <ArrowUpDown className="w-3 h-3 mr-1.5" />
                {option.label}
              </Button>
            ))}
          </div>
        )}

        {/* Products Ranking */}
        {products.length > 0 ? (
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Ranking de Produtos</h3>
            
            {products.map(({ product, calc }, index) => {
              const isTop = sortBy.includes('high') ? index < 3 : index >= products.length - 3;
              const position = index + 1;
              
              return (
                <div 
                  key={product.id}
                  className="bg-card rounded-xl p-4 card-interactive"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold',
                      position <= 3 && sortBy === 'margin-high' && 'bg-success text-success-foreground',
                      position <= 3 && sortBy === 'profit-high' && 'bg-primary text-primary-foreground',
                      position <= 3 && sortBy === 'margin-low' && 'bg-danger text-danger-foreground',
                      position <= 3 && sortBy === 'profit-low' && 'bg-warning text-warning-foreground',
                      position > 3 && 'bg-secondary text-muted-foreground'
                    )}>
                      #{position}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Venda: {formatCurrency(product.salePrice)}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        {calc.isAboveTarget ? (
                          <TrendingUp className="w-4 h-4 text-success" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-danger" />
                        )}
                        <span className={cn(
                          'font-bold',
                          calc.isAboveTarget ? 'text-success' : 'text-danger'
                        )}>
                          {calc.realMargin.toFixed(1)}%
                        </span>
                      </div>
                      <p className={cn(
                        'text-sm font-semibold',
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
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-secondary mx-auto flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Sem dados para análise</h3>
            <p className="text-sm text-muted-foreground">
              Adicione produtos para ver análises detalhadas
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

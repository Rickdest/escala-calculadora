import { useState, useMemo } from 'react';
import { Package, Search, AlertTriangle, TrendingDown, Filter } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type StockFilter = 'all' | 'low' | 'out';

export default function Stock() {
  const { currentStore, updateProduct } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<StockFilter>('all');

  const products = useMemo(() => {
    if (!currentStore) return [];

    let filtered = currentStore.products.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    switch (filter) {
      case 'low':
        filtered = filtered.filter(p => p.stockQuantity > 0 && p.stockQuantity <= 5);
        break;
      case 'out':
        filtered = filtered.filter(p => p.stockQuantity === 0);
        break;
    }

    // Sort by stock quantity (lowest first)
    return filtered.sort((a, b) => a.stockQuantity - b.stockQuantity);
  }, [currentStore, searchQuery, filter]);

  const stats = useMemo(() => {
    if (!currentStore) return { total: 0, low: 0, out: 0 };

    const low = currentStore.products.filter(p => p.stockQuantity > 0 && p.stockQuantity <= 5).length;
    const out = currentStore.products.filter(p => p.stockQuantity === 0).length;

    return {
      total: currentStore.products.length,
      low,
      out,
    };
  }, [currentStore]);

  const handleStockChange = (productId: string, newStock: number) => {
    updateProduct(productId, { stockQuantity: Math.max(0, newStock) });
  };

  if (!currentStore) {
    return (
      <AppLayout>
        <PageHeader title="Estoque" showStoreSelector={false} />
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
          <p className="text-muted-foreground">Selecione uma loja primeiro</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Estoque"
        subtitle={`${stats.total} produtos`}
      />

      <div className="px-4 py-5 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 animate-fade-up">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'glass-card p-4 text-center transition-all',
              filter === 'all' && 'ring-2 ring-primary'
            )}
          >
            <p className="number-lg text-primary">{stats.total}</p>
            <p className="text-xs text-muted-foreground font-medium">Total</p>
          </button>
          <button
            onClick={() => setFilter('low')}
            className={cn(
              'glass-card p-4 text-center transition-all',
              filter === 'low' && 'ring-2 ring-warning'
            )}
          >
            <p className="number-lg text-warning">{stats.low}</p>
            <p className="text-xs text-muted-foreground font-medium">Baixo</p>
          </button>
          <button
            onClick={() => setFilter('out')}
            className={cn(
              'glass-card p-4 text-center transition-all',
              filter === 'out' && 'ring-2 ring-destructive'
            )}
          >
            <p className="number-lg text-destructive">{stats.out}</p>
            <p className="text-xs text-muted-foreground font-medium">Zerado</p>
          </button>
        </div>

        {/* Search */}
        <div className="relative animate-fade-up stagger-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar produto..."
            className="pl-11 input-modern h-12"
          />
        </div>

        {/* Products List */}
        {products.length > 0 ? (
          <div className="space-y-3">
            {products.map((product, index) => {
              const isLow = product.stockQuantity > 0 && product.stockQuantity <= 5;
              const isOut = product.stockQuantity === 0;

              return (
                <div
                  key={product.id}
                  className={cn(
                    'glass-card p-4 animate-fade-up',
                    isOut && 'border-destructive/30 bg-destructive/5',
                    isLow && !isOut && 'border-warning/30 bg-warning/5'
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-4">
                    {/* Product Image/Icon */}
                    <div className={cn(
                      'w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0',
                      isOut ? 'bg-destructive/10' : isLow ? 'bg-warning/10' : 'bg-secondary'
                    )}>
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        <Package className={cn(
                          'w-6 h-6',
                          isOut ? 'text-destructive' : isLow ? 'text-warning' : 'text-muted-foreground'
                        )} />
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-foreground truncate">{product.name}</p>
                        {isOut && <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />}
                        {isLow && !isOut && <TrendingDown className="w-4 h-4 text-warning flex-shrink-0" />}
                      </div>
                      {product.hasVariations && product.variations.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {product.variations.length} variações
                        </p>
                      )}
                    </div>

                    {/* Stock Control */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStockChange(product.id, product.stockQuantity - 1)}
                        className="w-9 h-9 p-0"
                      >
                        -
                      </Button>
                      <span className={cn(
                        'w-12 text-center font-bold text-lg',
                        isOut ? 'text-destructive' : isLow ? 'text-warning' : 'text-foreground'
                      )}>
                        {product.stockQuantity}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStockChange(product.id, product.stockQuantity + 1)}
                        className="w-9 h-9 p-0"
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  {/* Variations Stock */}
                  {product.hasVariations && product.variations.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                      {product.variations.map((variation) => (
                        <div key={variation.id} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{variation.name}</span>
                          <span className={cn(
                            'font-medium',
                            variation.stockQuantity === 0 ? 'text-destructive' :
                            variation.stockQuantity <= 5 ? 'text-warning' : 'text-foreground'
                          )}>
                            {variation.stockQuantity} un
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-secondary mx-auto flex items-center justify-center mb-4">
              <Package className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="font-bold text-foreground mb-2 text-lg">
              {searchQuery || filter !== 'all' ? 'Nenhum produto encontrado' : 'Sem produtos cadastrados'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery || filter !== 'all'
                ? 'Tente buscar com outros termos ou filtros'
                : 'Adicione produtos para controlar o estoque'}
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

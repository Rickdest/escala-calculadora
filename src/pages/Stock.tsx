import { useState, useMemo } from 'react';
import { Package, Search, AlertTriangle, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
import { getVariationLabel } from '@/types/store';
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
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedProducts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const products = useMemo(() => {
    if (!currentStore) return [];
    let filtered = currentStore.products.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.hasVariations && p.variations.some(v =>
        getVariationLabel(v.attributes).toLowerCase().includes(searchQuery.toLowerCase())
      ))
    );

    switch (filter) {
      case 'low':
        filtered = filtered.filter(p => {
          if (p.hasVariations && p.variations.length > 0) {
            return p.variations.some(v => v.stockQuantity > 0 && v.stockQuantity <= 5);
          }
          return p.stockQuantity > 0 && p.stockQuantity <= 5;
        });
        break;
      case 'out':
        filtered = filtered.filter(p => {
          if (p.hasVariations && p.variations.length > 0) {
            return p.variations.some(v => v.stockQuantity === 0);
          }
          return p.stockQuantity === 0;
        });
        break;
    }

    return filtered.sort((a, b) => a.stockQuantity - b.stockQuantity);
  }, [currentStore, searchQuery, filter]);

  const stats = useMemo(() => {
    if (!currentStore) return { total: 0, low: 0, out: 0, totalValue: 0 };

    let low = 0, out = 0, totalValue = 0;

    for (const p of currentStore.products) {
      if (p.hasVariations && p.variations.length > 0) {
        for (const v of p.variations) {
          if (v.stockQuantity === 0) out++;
          else if (v.stockQuantity <= 5) low++;
          totalValue += v.costPrice * v.stockQuantity;
        }
      } else {
        if (p.stockQuantity === 0) out++;
        else if (p.stockQuantity <= 5) low++;
        totalValue += p.costPrice * p.stockQuantity;
      }
    }

    return { total: currentStore.products.length, low, out, totalValue };
  }, [currentStore]);

  const handleStockChange = (productId: string, newStock: number) => {
    updateProduct(productId, { stockQuantity: Math.max(0, newStock) });
  };

  const handleVariationStockChange = (productId: string, variationId: string, newStock: number) => {
    const product = currentStore?.products.find(p => p.id === productId);
    if (!product) return;
    const updatedVariations = product.variations.map(v =>
      v.id === variationId ? { ...v, stockQuantity: Math.max(0, newStock) } : v
    );
    const totalStock = updatedVariations.reduce((sum, v) => sum + v.stockQuantity, 0);
    updateProduct(productId, { variations: updatedVariations, stockQuantity: totalStock });
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
      <PageHeader title="Estoque" subtitle={`${stats.total} produtos`} />

      <div className="px-4 py-5 space-y-4">
        {/* Total Stock Value */}
        <div className="glass-card p-5 animate-fade-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1">Valor Total em Estoque</p>
              <p className="text-2xl font-extrabold text-primary">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalValue)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-primary/10">
              <Package className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 animate-fade-up stagger-1">
          <button onClick={() => setFilter('all')} className={cn('glass-card p-4 text-center transition-all', filter === 'all' && 'ring-2 ring-primary')}>
            <p className="number-lg text-primary">{stats.total}</p>
            <p className="text-xs text-muted-foreground font-medium">Total</p>
          </button>
          <button onClick={() => setFilter('low')} className={cn('glass-card p-4 text-center transition-all', filter === 'low' && 'ring-2 ring-warning')}>
            <p className="number-lg text-warning">{stats.low}</p>
            <p className="text-xs text-muted-foreground font-medium">Baixo</p>
          </button>
          <button onClick={() => setFilter('out')} className={cn('glass-card p-4 text-center transition-all', filter === 'out' && 'ring-2 ring-destructive')}>
            <p className="number-lg text-destructive">{stats.out}</p>
            <p className="text-xs text-muted-foreground font-medium">Zerado</p>
          </button>
        </div>

        {/* Search */}
        <div className="relative animate-fade-up stagger-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar produto ou variação..." className="pl-11 input-modern h-12" />
        </div>

        {/* Products List */}
        {products.length > 0 ? (
          <div className="space-y-3">
            {products.map((product, index) => {
              const hasVars = product.hasVariations && product.variations.length > 0;
              const isLow = !hasVars && product.stockQuantity > 0 && product.stockQuantity <= 5;
              const isOut = !hasVars && product.stockQuantity === 0;
              const isExpanded = expandedProducts.has(product.id);

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
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <Package className={cn('w-6 h-6', isOut ? 'text-destructive' : isLow ? 'text-warning' : 'text-muted-foreground')} />
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-foreground truncate">{product.name}</p>
                        {isOut && <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />}
                        {isLow && !isOut && <TrendingDown className="w-4 h-4 text-warning flex-shrink-0" />}
                      </div>
                      {hasVars && (
                        <p className="text-xs text-muted-foreground">
                          {product.variations.length} variações · {product.attributes.map(a => a.name).join(', ')}
                        </p>
                      )}
                    </div>

                    {/* Stock Control / Expand */}
                    {hasVars ? (
                      <button onClick={() => toggleExpand(product.id)} className="flex items-center gap-2">
                        <span className="text-lg font-bold text-foreground">{product.stockQuantity}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleStockChange(product.id, product.stockQuantity - 1)} className="w-9 h-9 p-0">-</Button>
                        <span className={cn('w-12 text-center font-bold text-lg', isOut ? 'text-destructive' : isLow ? 'text-warning' : 'text-foreground')}>{product.stockQuantity}</span>
                        <Button variant="outline" size="sm" onClick={() => handleStockChange(product.id, product.stockQuantity + 1)} className="w-9 h-9 p-0">+</Button>
                      </div>
                    )}
                  </div>

                  {/* Expanded Variations */}
                  {hasVars && isExpanded && (
                    <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                      {product.variations.map((variation) => {
                        const label = getVariationLabel(variation.attributes);
                        const vIsOut = variation.stockQuantity === 0;
                        const vIsLow = variation.stockQuantity > 0 && variation.stockQuantity <= 5;

                        return (
                          <div key={variation.id} className={cn(
                            'flex items-center justify-between py-2 px-3 rounded-lg',
                            vIsOut && 'bg-destructive/5',
                            vIsLow && !vIsOut && 'bg-warning/5'
                          )}>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-foreground">{label}</span>
                              {variation.sku && <span className="text-xs text-muted-foreground ml-2">SKU: {variation.sku}</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleVariationStockChange(product.id, variation.id, variation.stockQuantity - 1)} className="w-8 h-8 p-0 text-xs">-</Button>
                              <span className={cn('w-10 text-center font-bold text-sm', vIsOut ? 'text-destructive' : vIsLow ? 'text-warning' : 'text-foreground')}>{variation.stockQuantity}</span>
                              <Button variant="outline" size="sm" onClick={() => handleVariationStockChange(product.id, variation.id, variation.stockQuantity + 1)} className="w-8 h-8 p-0 text-xs">+</Button>
                            </div>
                          </div>
                        );
                      })}
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
              {searchQuery || filter !== 'all' ? 'Tente buscar com outros termos ou filtros' : 'Adicione produtos para controlar o estoque'}
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

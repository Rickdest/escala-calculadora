import { useState, useMemo } from 'react';
import { Package, Search, Plus, ChevronRight, AlertTriangle, TrendingDown } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
import { Product, getVariationLabel } from '@/types/store';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { StockProductWizard, STOCK_CATEGORIES } from '@/components/stock/StockProductWizard';
import { StockProductDetail } from '@/components/stock/StockProductDetail';
import { cn } from '@/lib/utils';

type StockFilter = 'all' | 'low' | 'out' | 'category';

export default function Stock() {
  const { currentStore } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<StockFilter>('all');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showWizard, setShowWizard] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const getStockStatus = (qty: number, min: number) => {
    if (qty === 0) return { color: 'text-destructive', bg: 'bg-destructive/5 border-destructive/20', icon: '🔴' };
    if (qty <= min) return { color: 'text-warning', bg: 'bg-warning/5 border-warning/20', icon: '🟡' };
    return { color: 'text-success', bg: '', icon: '🟢' };
  };

  const stats = useMemo(() => {
    if (!currentStore) return { total: 0, low: 0, out: 0, totalValue: 0 };
    let low = 0, out = 0, totalValue = 0;

    for (const p of currentStore.products) {
      const min = (p as any).minStockQuantity ?? 5;
      if (p.hasVariations && p.variations.length > 0) {
        for (const v of p.variations) {
          const vMin = (v as any).minStockQuantity ?? 5;
          if (v.stockQuantity === 0) out++;
          else if (v.stockQuantity <= vMin) low++;
          totalValue += v.costPrice * v.stockQuantity;
        }
      } else {
        if (p.stockQuantity === 0) out++;
        else if (p.stockQuantity <= min) low++;
        totalValue += p.costPrice * p.stockQuantity;
      }
    }
    return { total: currentStore.products.length, low, out, totalValue };
  }, [currentStore]);

  const products = useMemo(() => {
    if (!currentStore) return [];
    let filtered = currentStore.products;

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.variations.some(v => (v.sku || '').toLowerCase().includes(q) || getVariationLabel(v.attributes).toLowerCase().includes(q))
      );
    }

    // Filter
    switch (filter) {
      case 'low':
        filtered = filtered.filter(p => {
          const min = (p as any).minStockQuantity ?? 5;
          if (p.hasVariations && p.variations.length > 0) {
            return p.variations.some(v => v.stockQuantity > 0 && v.stockQuantity <= ((v as any).minStockQuantity ?? 5));
          }
          return p.stockQuantity > 0 && p.stockQuantity <= min;
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
      case 'category':
        if (selectedCategory) {
          filtered = filtered.filter(p => (p as any).category === selectedCategory);
        }
        break;
    }

    return filtered.sort((a, b) => a.stockQuantity - b.stockQuantity);
  }, [currentStore, searchQuery, filter, selectedCategory]);

  // Sync detail product with store data
  const activeDetailProduct = useMemo(() => {
    if (!detailProduct || !currentStore) return null;
    return currentStore.products.find(p => p.id === detailProduct.id) || null;
  }, [detailProduct, currentStore]);

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
      <div className="flex items-center justify-between px-4 pt-5 pb-2">
        <PageHeader title="Estoque" subtitle={`${stats.total} produtos`} />
        <Button onClick={() => { setEditingProduct(null); setShowWizard(true); }} className="gradient-primary font-bold h-11 px-5">
          <Plus className="w-5 h-5 mr-1.5" />
          Adicionar
        </Button>
      </div>

      <div className="px-4 py-3 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-2 animate-fade-up">
          <button onClick={() => setFilter('all')} className={cn('glass-card p-3 text-center transition-all', filter === 'all' && 'ring-2 ring-primary')}>
            <p className="text-xl font-extrabold text-primary">{stats.total}</p>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase">Total</p>
          </button>
          <button onClick={() => setFilter('low')} className={cn('glass-card p-3 text-center transition-all', filter === 'low' && 'ring-2 ring-warning')}>
            <p className="text-xl font-extrabold text-warning">{stats.low}</p>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase">Baixo 🟡</p>
          </button>
          <button onClick={() => setFilter('out')} className={cn('glass-card p-3 text-center transition-all', filter === 'out' && 'ring-2 ring-destructive')}>
            <p className="text-xl font-extrabold text-destructive">{stats.out}</p>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase">Zerado 🔴</p>
          </button>
          <div className="glass-card p-3 text-center">
            <p className="text-lg font-extrabold text-primary truncate">{formatCurrency(stats.totalValue)}</p>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase">Valor</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative animate-fade-up">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar por nome ou SKU..." className="pl-11 input-modern h-12" />
        </div>

        {/* Category filter chips */}
        {filter === 'category' && (
          <div className="flex flex-wrap gap-2 animate-fade-up">
            {STOCK_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
                  selectedCategory === cat
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Filter chips */}
        <div className="flex gap-2 animate-fade-up">
          {(['all', 'low', 'out', 'category'] as StockFilter[]).map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f); if (f !== 'category') setSelectedCategory(''); }}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
                filter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
              )}
            >
              {f === 'all' ? 'Todos' : f === 'low' ? 'Estoque baixo' : f === 'out' ? 'Sem estoque' : 'Categoria'}
            </button>
          ))}
        </div>

        {/* Product list */}
        {products.length > 0 ? (
          <div className="space-y-3">
            {products.map((product, index) => {
              const hasVars = product.hasVariations && product.variations.length > 0;
              const min = (product as any).minStockQuantity ?? 5;
              const status = getStockStatus(product.stockQuantity, min);
              const category = (product as any).category;

              return (
                <button
                  key={product.id}
                  onClick={() => setDetailProduct(product)}
                  className={cn(
                    'glass-card p-4 w-full text-left animate-fade-up transition-all hover:shadow-md',
                    status.bg
                  )}
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-secondary')}>
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <Package className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{status.icon}</span>
                        <p className="font-bold text-sm text-foreground truncate">{product.name}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {category && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{category}</span>
                        )}
                        {hasVars ? (
                          <span className="text-xs text-muted-foreground">
                            {product.variations.length} variações · {product.attributes.map(a => a.name).join(', ')}
                          </span>
                        ) : (
                          <span className={cn('text-xs font-bold', status.color)}>
                            {product.stockQuantity} un
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {hasVars && (
                        <span className={cn('text-lg font-extrabold', status.color)}>{product.stockQuantity}</span>
                      )}
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-secondary mx-auto flex items-center justify-center mb-4">
              <Package className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="font-bold text-foreground mb-2 text-lg">
              {searchQuery || filter !== 'all' ? 'Nenhum produto encontrado' : 'Sem produtos no estoque'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery || filter !== 'all' ? 'Tente outros termos ou filtros' : 'Adicione produtos para controlar seu estoque'}
            </p>
            {!searchQuery && filter === 'all' && (
              <Button onClick={() => setShowWizard(true)} className="gradient-primary font-bold">
                <Plus className="w-5 h-5 mr-1.5" />
                Adicionar Produto
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showWizard && (
        <StockProductWizard
          onClose={() => { setShowWizard(false); setEditingProduct(null); }}
          editProduct={editingProduct}
        />
      )}

      {activeDetailProduct && (
        <StockProductDetail
          product={activeDetailProduct}
          onClose={() => setDetailProduct(null)}
          onEdit={() => {
            setEditingProduct(activeDetailProduct);
            setDetailProduct(null);
            setShowWizard(true);
          }}
        />
      )}
    </AppLayout>
  );
}

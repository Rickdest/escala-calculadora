import { useState, useMemo } from 'react';
import { Plus, Search, SlidersHorizontal, Package } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
import { Product, SortOption } from '@/types/store';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { ProductCard } from '@/components/cards/ProductCard';
import { ProductForm } from '@/components/forms/ProductForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'recent', label: 'Mais Recentes' },
  { value: 'margin-high', label: 'Maior Margem' },
  { value: 'margin-low', label: 'Menor Margem' },
  { value: 'profit-high', label: 'Maior Lucro' },
  { value: 'profit-low', label: 'Menor Lucro' },
  { value: 'name', label: 'Nome A-Z' },
];

export default function Products() {
  const { currentStore, addProduct, updateProduct, deleteProduct, duplicateProduct, calculateProduct } = useStore();
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');

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
        subtitle={`${products.length} produto${products.length !== 1 ? 's' : ''}`}
        action={
          <Button size="sm" onClick={() => setShowProductForm(true)}>
            <Plus className="w-4 h-4" />
          </Button>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* Search and Filter */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar produto..."
              className="pl-9 input-focus"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon">
                <SlidersHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {sortOptions.map((option) => (
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
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-secondary mx-auto flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">
              {searchQuery ? 'Nenhum produto encontrado' : 'Nenhum produto ainda'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery 
                ? 'Tente buscar com outros termos' 
                : 'Adicione seu primeiro produto para começar'
              }
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowProductForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Produto
              </Button>
            )}
          </div>
        )}
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

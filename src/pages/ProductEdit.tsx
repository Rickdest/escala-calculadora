import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
import { Product } from '@/types/store';
import { ProductForm } from '@/components/forms/ProductForm';
import { AppLayout } from '@/components/layout/AppLayout';
import { toast } from 'sonner';

export default function ProductEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentStore, updateProduct } = useStore();

  const product = currentStore?.products.find(p => p.id === id);

  useEffect(() => {
    if (!currentStore) return;
    if (currentStore.products.length > 0 && !product) {
      toast.error('Produto não encontrado');
      navigate('/products', { replace: true });
    }
  }, [product, currentStore, navigate]);

  if (!product || !currentStore) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  const handleSave = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> | Partial<Product>) => {
    await updateProduct(product.id, productData);
    toast.success('Produto atualizado!');
    navigate('/products', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Simple header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/products')}
          className="flex items-center gap-1.5 text-small text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
        <h1 className="text-subtitle font-semibold text-foreground truncate">
          Editar: {product.name}
        </h1>
      </div>

      {/* Full-page form (ProductForm handles everything) */}
      <div className="pb-8">
        <ProductForm
          product={product}
          onClose={() => navigate('/products')}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}

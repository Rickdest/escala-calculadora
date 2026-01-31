import { useState } from 'react';
import { Plus, Settings2, Package, TrendingUp, AlertTriangle, ArrowRight, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/contexts/StoreContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/cards/StatCard';
import { ProductForm } from '@/components/forms/ProductForm';
import { StoreConfigForm } from '@/components/forms/StoreConfigForm';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function Home() {
  const navigate = useNavigate();
  const { currentStore, stores, addStore, addProduct, getStoreStats, calculateProduct } = useStore();
  const [showProductForm, setShowProductForm] = useState(false);
  const [showConfigForm, setShowConfigForm] = useState(false);

  // Create first store if none exists
  const handleCreateFirstStore = () => {
    const store = addStore('Minha Loja');
    navigate('/settings');
  };

  if (!currentStore) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6 animate-bounce-subtle">
            <Store className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Bem-vindo ao Escala!
          </h1>
          <p className="text-muted-foreground mb-8 max-w-sm">
            Crie sua primeira loja para começar a precificar seus produtos na Shopee.
          </p>
          <Button 
            onClick={handleCreateFirstStore}
            size="lg"
            className="h-14 px-8 text-base font-semibold"
          >
            <Plus className="w-5 h-5 mr-2" />
            Criar Minha Loja
          </Button>
        </div>
      </AppLayout>
    );
  }

  const stats = getStoreStats(currentStore);

  const handleSaveProduct = (productData: any) => {
    addProduct(productData);
    setShowProductForm(false);
  };

  // Get top performing products
  const topProducts = currentStore.products
    .map(p => ({ product: p, calc: calculateProduct(p, currentStore.config) }))
    .sort((a, b) => b.calc.realMargin - a.calc.realMargin)
    .slice(0, 3);

  return (
    <AppLayout>
      <PageHeader 
        title="Escala Calculadora"
        subtitle="Precificação Inteligente"
      />

      <div className="px-4 py-6 space-y-6">
        {/* Quick Actions */}
        <div className="flex gap-3">
          <Button 
            onClick={() => setShowProductForm(true)}
            className="flex-1 h-14 text-base font-semibold"
          >
            <Plus className="w-5 h-5 mr-2" />
            Novo Produto
          </Button>
          <Button 
            onClick={() => setShowConfigForm(true)}
            variant="secondary"
            className="h-14 px-4"
          >
            <Settings2 className="w-5 h-5" />
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            icon={TrendingUp}
            label="Margem Média"
            value={stats.avgMargin.toFixed(1)}
            suffix="%"
            variant={stats.avgMargin >= currentStore.config.desiredMargin ? 'success' : 'warning'}
          />
          <StatCard
            icon={Package}
            label="Produtos"
            value={stats.totalProducts}
            variant="primary"
          />
        </div>

        {/* Performance Overview */}
        {stats.totalProducts > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Desempenho</h2>
              <button 
                onClick={() => navigate('/analysis')}
                className="text-sm text-primary font-medium flex items-center gap-1"
              >
                Ver Análise
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-success-muted rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-success" />
                  <span className="text-xs font-medium text-success">Acima da Meta</span>
                </div>
                <p className="text-2xl font-bold text-success">{stats.productsAboveTarget}</p>
              </div>
              <div className="bg-danger-muted rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-danger" />
                  <span className="text-xs font-medium text-danger">Abaixo da Meta</span>
                </div>
                <p className="text-2xl font-bold text-danger">{stats.productsBelowTarget}</p>
              </div>
            </div>
          </div>
        )}

        {/* Top Products */}
        {topProducts.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Melhores Margens</h2>
              <button 
                onClick={() => navigate('/products')}
                className="text-sm text-primary font-medium flex items-center gap-1"
              >
                Ver Todos
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-2">
              {topProducts.map(({ product, calc }, index) => (
                <div 
                  key={product.id}
                  className="flex items-center justify-between bg-card rounded-xl p-3 card-interactive"
                  onClick={() => navigate('/products')}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold',
                      index === 0 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                    )}>
                      {index + 1}
                    </div>
                    <span className="font-medium text-foreground truncate max-w-[150px]">
                      {product.name}
                    </span>
                  </div>
                  <span className={cn(
                    'font-bold',
                    calc.isAboveTarget ? 'text-success' : 'text-danger'
                  )}>
                    {calc.realMargin.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {stats.totalProducts === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-secondary mx-auto flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Nenhum produto ainda</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Adicione seu primeiro produto para começar
            </p>
            <Button onClick={() => setShowProductForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Produto
            </Button>
          </div>
        )}

        {/* Store Config Reminder */}
        <div 
          onClick={() => setShowConfigForm(true)}
          className="bg-accent rounded-2xl p-4 card-interactive"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Settings2 className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">Taxas da Loja</p>
              <p className="text-xs text-muted-foreground">
                Shopee: {currentStore.config.shopeeFee}% · Impostos: {currentStore.config.taxes}% · Meta: {currentStore.config.desiredMargin}%
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </div>

      {showProductForm && (
        <ProductForm 
          onClose={() => setShowProductForm(false)}
          onSave={handleSaveProduct}
        />
      )}

      {showConfigForm && (
        <StoreConfigForm onClose={() => setShowConfigForm(false)} />
      )}
    </AppLayout>
  );
}

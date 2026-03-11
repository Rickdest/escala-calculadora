import { useState } from 'react';
import { Plus, Settings2, Package, TrendingUp, TrendingDown, ArrowRight, Store, Zap, Target, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/contexts/StoreContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { ProductForm } from '@/components/forms/ProductForm';
import { StoreConfigForm } from '@/components/forms/StoreConfigForm';
import { EducationBanner } from '@/components/home/EducationBanner';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import { Button } from '@/components/ui/button';
import { useSubscriptionGate } from '@/hooks/useSubscriptionGate';
import { cn } from '@/lib/utils';

export default function Home() {
  const navigate = useNavigate();
  const { currentStore, stores, addStore, addProduct, getStoreStats, calculateProduct } = useStore();
  const { gate, showPaywall, setShowPaywall, isActive } = useSubscriptionGate();
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
        <div className="flex flex-col items-center justify-center min-h-[85vh] px-6 text-center">
          <h1 className="text-5xl font-bold text-primary tracking-tight mb-2">Escala</h1>
          <p className="text-muted-foreground mb-8 max-w-xs leading-relaxed">
            Precifique seus produtos da Shopee com inteligência e maximize seus lucros.
          </p>
          <Button 
            onClick={handleCreateFirstStore}
            size="lg"
            className="h-14 px-10 text-base font-bold gradient-primary hover:opacity-90"
          >
            <Plus className="w-5 h-5 mr-2" />
            Começar Agora
          </Button>
        </div>
      </AppLayout>
    );
  }

  const stats = getStoreStats(currentStore);
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

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
      <PageHeader title="Escala" />

      <div className="px-4 py-6 space-y-6">
        {/* Education Banner - Prominent at top */}
        <EducationBanner />

        {/* Subscription CTA */}
        {!isActive && (
          <div 
            onClick={() => setShowPaywall(true)}
            className="glass-card p-5 cursor-pointer hover:shadow-lg transition-all active:scale-[0.98] animate-fade-up"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl gradient-primary shadow-md">
                <Crown className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-foreground">Assine o Escala Pro</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  A partir de R$ 8,08/mês · Acesse todas as ferramentas
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-primary" />
            </div>
          </div>
        )}

        {/* Main CTA */}
        <Button 
          onClick={() => gate(() => setShowProductForm(true))}
          className="w-full md:w-auto h-16 text-lg font-bold gradient-primary hover:opacity-90 shadow-lg md:h-12 md:px-8"
        >
          <Plus className="w-6 h-6 mr-3 md:w-5 md:h-5" />
          Adicionar Produto
        </Button>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-5 animate-fade-up">
            <div className="flex items-center gap-2 mb-3">
              <div className={cn(
                'p-2 rounded-xl',
                stats.avgMargin >= currentStore.config.desiredMargin ? 'bg-success-muted' : 'bg-warning-muted'
              )}>
                <Target className={cn(
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
                <Package className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1">Produtos</p>
            <p className="number-xl text-primary">{stats.totalProducts}</p>
          </div>
        </div>

        {/* Profit Summary */}
        {stats.totalProducts > 0 && (
          <div className="glass-card p-5 animate-fade-up stagger-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1">Lucro Total (todos produtos)</p>
                <p className={cn(
                  'number-lg',
                  stats.totalProfit >= 0 ? 'text-success' : 'text-destructive'
                )}>
                  {formatCurrency(stats.totalProfit)}
                </p>
              </div>
              <div className="text-right">
                <div className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold',
                  stats.productsAboveTarget > stats.productsBelowTarget ? 'bg-success-muted text-success' : 'bg-danger-muted text-danger'
                )}>
                  {stats.productsAboveTarget > stats.productsBelowTarget ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  {stats.productsAboveTarget}/{stats.totalProducts} na meta
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Performance */}
        {stats.totalProducts > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-up stagger-3">
            <div className="bg-success-muted rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-success" />
                <span className="text-xs font-bold text-success">Acima da Meta</span>
              </div>
              <p className="number-md text-success">{stats.productsAboveTarget}</p>
            </div>
            <div className="bg-danger-muted rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-danger" />
                <span className="text-xs font-bold text-danger">Abaixo da Meta</span>
              </div>
              <p className="number-md text-danger">{stats.productsBelowTarget}</p>
            </div>
          </div>
        )}

        {/* Top Products */}
        {topProducts.length > 0 && (
          <div className="space-y-3 animate-fade-up stagger-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-foreground">Melhores Margens</h2>
              <button 
                onClick={() => navigate('/products')}
                className="text-sm text-primary font-semibold flex items-center gap-1"
              >
                Ver Todos
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-2">
              {topProducts.map(({ product, calc }, index) => (
                <div 
                  key={product.id}
                  className="glass-card-hover p-4 flex items-center justify-between"
                  onClick={() => navigate('/products')}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold',
                      index === 0 ? 'gradient-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                    )}>
                      {index + 1}
                    </div>
                    <span className="font-semibold text-foreground truncate max-w-[140px]">
                      {product.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'font-extrabold text-lg',
                      calc.isAboveTarget ? 'text-success' : 'text-danger'
                    )}>
                      {calc.realMargin.toFixed(1)}%
                    </span>
                    {calc.isAboveTarget ? (
                      <TrendingUp className="w-4 h-4 text-success" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-danger" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {stats.totalProducts === 0 && (
          <div className="text-center py-12 animate-fade-up">
            <div className="w-20 h-20 rounded-2xl bg-secondary mx-auto flex items-center justify-center mb-4">
              <Package className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="font-bold text-foreground mb-2 text-lg">Nenhum produto ainda</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
              Adicione seu primeiro produto para começar a precificar com inteligência
            </p>
          </div>
        )}

        {/* Store Config Card */}
        <div 
          onClick={() => setShowConfigForm(true)}
          className="glass-card-hover p-4 animate-fade-up stagger-5"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl gradient-primary">
              <Settings2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-foreground">Taxas da Loja</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Taxas automáticas por faixa · Meta: {currentStore.config.desiredMargin}%
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

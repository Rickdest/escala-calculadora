import { useState } from 'react';
import { Plus, Settings2, Package, TrendingUp, TrendingDown, ArrowRight, Crown, Target, BarChart3, GraduationCap, Store, Warehouse, UserCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/contexts/StoreContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { ProductForm } from '@/components/forms/ProductForm';
import { StoreConfigForm } from '@/components/forms/StoreConfigForm';
import { EducationBanner } from '@/components/home/EducationBanner';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import { TrialBanner } from '@/components/TrialBanner';
import { DailyOfferModal } from '@/components/DailyOfferModal';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { cn } from '@/lib/utils';

const toolItems = [
  { icon: Plus, label: 'Novo Produto', color: 'bg-primary text-primary-foreground', action: 'addProduct' as const },
  { icon: Package, label: 'Produtos', color: 'bg-[hsl(220,70%,55%)]/15 text-[hsl(220,70%,55%)]', route: '/products' },
  { icon: BarChart3, label: 'ROAS', color: 'bg-[hsl(var(--success))]/15 text-success', route: '/roas' },
  { icon: GraduationCap, label: 'Educação', color: 'bg-[hsl(280,70%,55%)]/15 text-[hsl(280,70%,55%)]', route: '/education' },
  { icon: Warehouse, label: 'Estoque', color: 'bg-[hsl(var(--warning))]/15 text-warning', route: '/stock' },
  { icon: Settings2, label: 'Taxas da Loja', color: 'bg-accent text-accent-foreground', action: 'config' as const },
  { icon: Store, label: 'Lojas', color: 'bg-[hsl(220,70%,55%)]/15 text-[hsl(220,70%,55%)]', route: '/stores' },
  { icon: UserCircle, label: 'Perfil', color: 'bg-muted text-muted-foreground', route: '/profile' },
];

export default function Home() {
  const navigate = useNavigate();
  const { currentStore, stores, addStore, addProduct, getStoreStats, calculateProduct, isLoading } = useStore();
  const { isActive } = useSubscription();
  const [showProductForm, setShowProductForm] = useState(false);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const handleCreateFirstStore = async () => {
    await addStore('Minha Loja');
    navigate('/settings');
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[85vh]">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mb-4" />
          <p className="text-muted-foreground font-medium">Carregando seus dados...</p>
        </div>
      </AppLayout>
    );
  }

  if (!currentStore) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[85vh] px-6 text-center">
          <h1 className="text-5xl font-bold text-primary tracking-tight mb-2">Precify</h1>
          <p className="text-muted-foreground mb-8 max-w-xs leading-relaxed">
            Precifique seus produtos da Shopee com inteligência e maximize seus lucros.
          </p>
          <Button onClick={handleCreateFirstStore} size="lg" className="h-14 px-10 text-base font-bold gradient-primary hover:opacity-90">
            <Plus className="w-5 h-5 mr-2" />
            Começar Agora
          </Button>
        </div>
      </AppLayout>
    );
  }

  const stats = getStoreStats(currentStore);

  const handleSaveProduct = async (productData: any) => {
    await addProduct(productData);
    setShowProductForm(false);
  };

  const handleToolClick = (item: typeof toolItems[0]) => {
    if (item.action === 'addProduct') {
      setShowProductForm(true);
    } else if (item.action === 'config') {
      setShowConfigForm(true);
    } else if ('route' in item && item.route) {
      navigate(item.route);
    }
  };

  const topProducts = currentStore.products
    .map(p => ({ product: p, calc: calculateProduct(p, currentStore.config) }))
    .sort((a, b) => b.calc.realMargin - a.calc.realMargin)
    .slice(0, 3);

  return (
    <AppLayout>
      <PageHeader title="Precify" />
      <div className="px-4 py-6 space-y-6">
        <TrialBanner />

        {/* Subscription CTA - only for non-active */}
        {!isActive && (
          <div onClick={() => setShowPaywall(true)} className="glass-card p-5 cursor-pointer hover:shadow-lg transition-all active:scale-[0.98] animate-fade-up">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl gradient-primary shadow-md"><Crown className="w-6 h-6 text-primary-foreground" /></div>
              <div className="flex-1">
                <p className="font-bold text-foreground">Assine o Precify Pro</p>
                <p className="text-xs text-muted-foreground mt-0.5">A partir de R$ 8,08/mês · Acesse todas as ferramentas</p>
              </div>
              <ArrowRight className="w-5 h-5 text-primary" />
            </div>
          </div>
        )}

        {/* Tools Grid - App style */}
        <div className="animate-fade-up">
          <h2 className="font-bold text-foreground mb-4">Ferramentas</h2>
          <div className="grid grid-cols-4 gap-y-4 gap-x-2">
            {toolItems.map((item) => (
              <button
                key={item.label}
                onClick={() => handleToolClick(item)}
                className="flex flex-col items-center gap-2 py-2 rounded-2xl hover:bg-secondary/60 transition-all active:scale-95"
              >
                <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm', item.color)}>
                  <item.icon className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-semibold text-foreground leading-tight text-center px-1 line-clamp-2">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <EducationBanner />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-5 animate-fade-up">
            <div className="flex items-center gap-2 mb-3">
              <div className={cn('p-2 rounded-xl', stats.avgMargin >= currentStore.config.desiredMargin ? 'bg-success-muted' : 'bg-warning-muted')}>
                <Target className={cn('w-5 h-5', stats.avgMargin >= currentStore.config.desiredMargin ? 'text-success' : 'text-warning')} />
              </div>
            </div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1">Margem Média</p>
            <p className={cn('number-xl', stats.avgMargin >= currentStore.config.desiredMargin ? 'text-success' : 'text-warning')}>
              {stats.avgMargin.toFixed(1)}%
            </p>
          </div>
          <div className="glass-card p-5 animate-fade-up stagger-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-xl bg-primary/10"><Package className="w-5 h-5 text-primary" /></div>
            </div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1">Produtos</p>
            <p className="number-xl text-primary">{stats.totalProducts}</p>
          </div>
        </div>

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
              <button onClick={() => navigate('/products')} className="text-sm text-primary font-semibold flex items-center gap-1">
                Ver Todos<ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {topProducts.map(({ product, calc }, index) => (
                <div key={product.id} className="glass-card-hover p-4 flex items-center justify-between" onClick={() => navigate('/products')}>
                  <div className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold', index === 0 ? 'gradient-primary text-primary-foreground' : 'bg-secondary text-muted-foreground')}>
                      {index + 1}
                    </div>
                    <span className="font-semibold text-foreground truncate max-w-[140px]">{product.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('font-extrabold text-lg', calc.isAboveTarget ? 'text-success' : 'text-danger')}>{calc.realMargin.toFixed(1)}%</span>
                    {calc.isAboveTarget ? <TrendingUp className="w-4 h-4 text-success" /> : <TrendingDown className="w-4 h-4 text-danger" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {stats.totalProducts === 0 && (
          <div className="text-center py-12 animate-fade-up">
            <div className="w-20 h-20 rounded-2xl bg-secondary mx-auto flex items-center justify-center mb-4">
              <Package className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="font-bold text-foreground mb-2 text-lg">Nenhum produto ainda</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">Adicione seu primeiro produto para começar a precificar com inteligência</p>
          </div>
        )}
      </div>

      {showProductForm && <ProductForm onClose={() => setShowProductForm(false)} onSave={handleSaveProduct} />}
      {showConfigForm && <StoreConfigForm onClose={() => setShowConfigForm(false)} />}
      <SubscriptionModal open={showPaywall} onClose={() => setShowPaywall(false)} />
      <DailyOfferModal />
    </AppLayout>
  );
}

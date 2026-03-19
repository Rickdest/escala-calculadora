import { useState, useMemo } from 'react';
import { Plus, Package, TrendingUp, TrendingDown, ArrowRight, Target, BarChart3, GraduationCap, Store, Warehouse, UserCircle, Settings2, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/contexts/StoreContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { ProductForm } from '@/components/forms/ProductForm';
import { EducationBanner } from '@/components/home/EducationBanner';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import { TrialBanner } from '@/components/TrialBanner';
import { DailyOfferModal } from '@/components/DailyOfferModal';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { cn } from '@/lib/utils';

const toolItems = [
  { icon: Plus, label: 'Precificar', color: 'bg-primary text-primary-foreground', action: 'addProduct' as const },
  { icon: Package, label: 'Produtos', color: 'bg-[hsl(220,70%,55%)]/15 text-[hsl(220,70%,55%)]', route: '/products' },
  { icon: BarChart3, label: 'ROAS', color: 'bg-[hsl(var(--success))]/15 text-success', route: '/roas' },
  { icon: GraduationCap, label: 'Educação', color: 'bg-[hsl(280,70%,55%)]/15 text-[hsl(280,70%,55%)]', route: '/education' },
  { icon: Warehouse, label: 'Estoque', color: 'bg-[hsl(var(--warning))]/15 text-warning', route: '/stock' },
  { icon: Settings2, label: 'Taxas da Loja', color: 'bg-accent text-accent-foreground', route: '/settings' },
  { icon: Store, label: 'Lojas', color: 'bg-[hsl(220,70%,55%)]/15 text-[hsl(220,70%,55%)]', route: '/stores' },
  { icon: UserCircle, label: 'Perfil', color: 'bg-muted text-muted-foreground', route: '/profile' },
];

export default function Home() {
  const navigate = useNavigate();
  const { currentStore, stores, addStore, addProduct, getStoreStats, calculateProduct, isLoading } = useStore();
  const { isActive, status, trialEnd } = useSubscription();
  const [showProductForm, setShowProductForm] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const activeGlobalConfigs = useMemo(() => {
    if (!currentStore) return [];
    const config = currentStore.config;
    const items: string[] = [];
    if (config.isCpfSeller && config.hasOver450Orders) items.push('Adicional CPF R$3,00');
    if ((config.taxes || 0) > 0) items.push(`Impostos ${config.taxes}%`);
    if (config.enableAffiliateCommission && (config.affiliateCommission || 0) > 0) items.push(`Afiliados ${config.affiliateCommission}%`);
    if (config.enableShopeeCampaigns && (config.shopeeCampaigns || 0) > 0) items.push(`Campanhas ${config.shopeeCampaigns}%`);
    if (config.shopeeAcelera === 'indicado') items.push('Shopee Acelera 2,5%');
    if (config.shopeeAcelera === 'nao_indicado') items.push('Shopee Acelera 3,5%');
    return items;
  }, [currentStore]);

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

  const handleToolClick = (item: (typeof toolItems)[number]) => {
    if ('action' in item && item.action === 'addProduct') {
      setShowProductForm(true);
    } else if ('route' in item && item.route) {
      navigate(item.route as string);
    }
  };

  const topProducts = currentStore.products
    .map(p => ({ product: p, calc: calculateProduct(p, currentStore.config) }))
    .sort((a, b) => b.calc.realMargin - a.calc.realMargin)
    .slice(0, 3);

  return (
    <AppLayout>
      <PageHeader title="Precify" />
      <div className="px-4 py-5 space-y-5">
        <TrialBanner />

        {/* Subscription CTA - trial users */}
        {status === 'trialing' && trialEnd && (() => {
          const dLeft = Math.max(0, Math.ceil((new Date(trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
          return dLeft > 0 ? (
            <div onClick={() => setShowPaywall(true)} className="rounded-xl border border-[#1e3a5f]/40 bg-[#1e3a5f]/60 p-3.5 cursor-pointer hover:bg-[#1e3a5f]/70 transition-all active:scale-[0.98] animate-fade-up">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm">⏳</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{dLeft} {dLeft === 1 ? 'dia' : 'dias'} de teste restantes</p>
                    <p className="text-xs font-semibold text-primary">Garanta seu acesso por R$49,90/ano</p>
                  </div>
                </div>
                <ChevronRight className="w-4.5 h-4.5 text-white/70 flex-shrink-0" />
              </div>
            </div>
          ) : null;
        })()}
        {!isActive && status !== 'trialing' && (
          <div onClick={() => setShowPaywall(true)} className="rounded-xl border border-[#F97316]/20 bg-[#F97316]/8 p-3.5 cursor-pointer hover:bg-[#F97316]/12 transition-all active:scale-[0.98] animate-fade-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-base">⚡</span>
                <div>
                  <p className="text-sm font-bold text-foreground">Seu acesso expirou</p>
                  <p className="text-xs text-muted-foreground">R$49,90/ano — menos de R$4,16/mês</p>
                </div>
              </div>
              <span className="text-xs font-bold text-[#F97316] flex-shrink-0">Assinar →</span>
            </div>
          </div>
        )}

        {/* Tools Grid */}
        <div className="animate-fade-up">
          <h2 className="font-bold text-foreground mb-3">Ferramentas</h2>
          <div className="grid grid-cols-4 gap-y-3 gap-x-2">
            {toolItems.map((item) => (
              <button
                key={item.label}
                onClick={() => handleToolClick(item)}
                className="flex flex-col items-center gap-1.5 py-2 rounded-2xl hover:bg-secondary/60 transition-all active:scale-95"
              >
                <div className={cn('w-13 h-13 rounded-2xl flex items-center justify-center shadow-sm', item.color)}>
                  <item.icon className="w-5.5 h-5.5" />
                </div>
                <span className="text-[11px] font-semibold text-foreground leading-tight text-center px-1 line-clamp-2">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Global Config Summary */}
        <button
          onClick={() => navigate('/settings')}
          className="w-full rounded-xl border border-border/30 bg-card/40 p-3.5 flex items-center gap-3 text-left hover:bg-card/60 transition-colors animate-fade-up"
        >
          <div className="w-9 h-9 rounded-lg bg-accent/80 flex items-center justify-center flex-shrink-0">
            <Settings2 className="w-4.5 h-4.5 text-accent-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            {activeGlobalConfigs.length > 0 ? (
              <>
                <p className="text-xs font-semibold text-foreground leading-snug">Taxas ativas</p>
                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 truncate">
                  {activeGlobalConfigs.join(' · ')}
                </p>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold text-foreground leading-snug">Configurar taxas da loja</p>
                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                  Impostos, afiliados, campanhas e mais
                </p>
              </>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </button>

        <EducationBanner />

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border/30 bg-card/40 p-4 animate-fade-up">
            <div className="flex items-center gap-2 mb-2">
              <div className={cn('p-1.5 rounded-lg', stats.avgMargin >= currentStore.config.desiredMargin ? 'bg-[hsl(var(--success))]/15' : 'bg-[hsl(var(--warning))]/15')}>
                <Target className={cn('w-4 h-4', stats.avgMargin >= currentStore.config.desiredMargin ? 'text-success' : 'text-warning')} />
              </div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Margem Média</p>
            </div>
            <p className={cn('text-2xl font-extrabold', stats.avgMargin >= currentStore.config.desiredMargin ? 'text-success' : 'text-warning')}>
              {stats.avgMargin.toFixed(1)}%
            </p>
          </div>
          <div className="rounded-xl border border-border/30 bg-card/40 p-4 animate-fade-up stagger-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Package className="w-4 h-4 text-primary" />
              </div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Produtos</p>
            </div>
            <p className="text-2xl font-extrabold text-primary">{stats.totalProducts}</p>
          </div>
        </div>

        {/* Performance */}
        {stats.totalProducts > 0 && (
          <div className="grid grid-cols-2 gap-3 animate-fade-up stagger-3">
            <div className="rounded-xl bg-[hsl(var(--success))]/8 border border-[hsl(var(--success))]/15 p-3.5">
              <div className="flex items-center gap-2 mb-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-success" />
                <span className="text-[11px] font-bold text-success">Acima da Meta</span>
              </div>
              <p className="text-xl font-extrabold text-success">{stats.productsAboveTarget}</p>
            </div>
            <div className="rounded-xl bg-[hsl(var(--danger))]/8 border border-[hsl(var(--danger))]/15 p-3.5">
              <div className="flex items-center gap-2 mb-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-danger" />
                <span className="text-[11px] font-bold text-danger">Abaixo da Meta</span>
              </div>
              <p className="text-xl font-extrabold text-danger">{stats.productsBelowTarget}</p>
            </div>
          </div>
        )}

        {/* Top Products */}
        {topProducts.length > 0 && (
          <div className="space-y-2.5 animate-fade-up stagger-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-foreground">Melhores Margens</h2>
              <button onClick={() => navigate('/products')} className="text-xs text-primary font-semibold flex items-center gap-0.5">
                Ver Todos <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1.5">
              {topProducts.map(({ product, calc }, index) => (
                <button key={product.id} className="w-full rounded-xl border border-border/30 bg-card/40 p-3.5 flex items-center justify-between hover:bg-card/60 transition-colors" onClick={() => navigate('/products')}>
                  <div className="flex items-center gap-3">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-xs font-extrabold', index === 0 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground')}>
                      {index + 1}
                    </div>
                    <span className="font-semibold text-foreground truncate max-w-[140px] text-sm">{product.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={cn('font-extrabold text-base', calc.isAboveTarget ? 'text-success' : 'text-danger')}>{calc.realMargin.toFixed(1)}%</span>
                    {calc.isAboveTarget ? <TrendingUp className="w-3.5 h-3.5 text-success" /> : <TrendingDown className="w-3.5 h-3.5 text-danger" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {stats.totalProducts === 0 && (
          <div className="text-center py-10 animate-fade-up">
            <div className="w-16 h-16 rounded-2xl bg-secondary mx-auto flex items-center justify-center mb-3">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-bold text-foreground mb-1.5">Nenhum produto ainda</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">Adicione seu primeiro produto para começar a precificar</p>
          </div>
        )}
      </div>

      {showProductForm && <ProductForm onClose={() => setShowProductForm(false)} onSave={handleSaveProduct} />}
      <SubscriptionModal open={showPaywall} onClose={() => setShowPaywall(false)} />
      <DailyOfferModal />
    </AppLayout>
  );
}
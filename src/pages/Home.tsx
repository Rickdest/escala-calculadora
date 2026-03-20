import { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Package, Target, BarChart3, GraduationCap, Store, Warehouse, UserCircle, Settings2, ChevronRight, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/contexts/StoreContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { ProductForm } from '@/components/forms/ProductForm';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import { TrialBanner } from '@/components/TrialBanner';
import { DailyOfferModal } from '@/components/DailyOfferModal';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { cn, getMarginStatus } from '@/lib/utils';
import { QuickCalculator } from '@/components/home/QuickCalculator';
import { HomeEducationCard } from '@/components/home/HomeEducationCard';
import { ProductThumbnail } from '@/components/ProductThumbnail';

const toolItems = [
  { icon: Plus, label: 'Precificar', isAccent: true, action: 'addProduct' as const },
  { icon: Package, label: 'Produtos', route: '/products' },
  { icon: BarChart3, label: 'ROAS', route: '/roas' },
  { icon: GraduationCap, label: 'Educação', route: '/education' },
  { icon: Warehouse, label: 'Estoque', route: '/stock' },
  { icon: Settings2, label: 'Taxas da Loja', route: '/settings' },
  { icon: Store, label: 'Lojas', route: '/stores' },
  { icon: UserCircle, label: 'Perfil', route: '/profile' },
];

export default function Home() {
  const navigate = useNavigate();
  const { currentStore, stores, addStore, addProduct, getStoreStats, calculateProduct, isLoading } = useStore();
  const { isActive, status, trialEnd } = useSubscription();
  const [showProductForm, setShowProductForm] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [prefillProduct, setPrefillProduct] = useState<Partial<import('@/types/store').Product> | null>(null);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[85vh]">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mb-4" />
          <p className="text-text-2 text-sm">Carregando...</p>
        </div>
      </AppLayout>
    );
  }

  if (!currentStore) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[85vh]">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mb-4" />
          <p className="text-text-2 text-sm">Preparando sua loja...</p>
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
      <div className="px-4 py-4 space-y-4 md:px-0 md:py-6 md:grid md:grid-cols-[3fr_2fr] md:gap-6 md:space-y-0">
        <div className="md:col-span-full">
          <TrialBanner />
        </div>

        {/* Subscription CTA - trial */}
        {status === 'trialing' && trialEnd && (() => {
          const dLeft = Math.max(0, Math.ceil((new Date(trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
          return dLeft > 0 ? (
            <div className="md:col-span-12">
            <button
              onClick={() => setShowPaywall(true)}
              className="w-full h-9 flex items-center gap-2 px-3 rounded-[8px] border-l-[3px] border-l-primary bg-surface-2 transition-colors hover:bg-surface-2/80 active:scale-[0.98] animate-fade-up"
            >
              <span className="text-xs">⏳</span>
              <span className="text-[13px] text-text-2 flex-1 text-left">
                {dLeft} {dLeft === 1 ? 'dia restante' : 'dias restantes'} · <span className="text-primary font-semibold">Garantir acesso →</span>
              </span>
            </button>
            </div>
          ) : null;
        })()}

        {!isActive && status !== 'trialing' && (
          <div className="md:col-span-12">
          <button
            onClick={() => setShowPaywall(true)}
            className="w-full h-9 flex items-center gap-2 px-3 rounded-[8px] border-l-[3px] border-l-primary bg-surface-2 transition-colors hover:bg-surface-2/80 active:scale-[0.98] animate-fade-up"
          >
            <span className="text-xs">⚡</span>
            <span className="text-[13px] text-text-2 flex-1 text-left">
              Acesso expirou · <span className="text-primary font-semibold">Assinar R$49,90/ano →</span>
            </span>
          </button>
          </div>
        )}

        {/* Quick Calculator */}
        <div className="md:col-span-8">
          <QuickCalculator onSaveProduct={(prefill) => {
            setPrefillProduct({
              costPrice: parseFloat(prefill.costPrice) || 0,
              salePrice: parseFloat(prefill.salePrice) || 0,
              packagingCost: parseFloat(prefill.packaging) || 0,
              name: '',
            });
            setShowProductForm(true);
          }} />
        </div>

        {/* Store Metrics - sidebar on desktop */}
        <div className="md:col-span-4 space-y-4">
          <div className="animate-fade-up stagger-2">
            <p className="section-label mb-3">Métricas da Loja</p>
            <div className="grid grid-cols-2 md:grid-cols-1 gap-3">
              <div className="surface-card p-4">
                <p className="section-label mb-2">Margem Média</p>
                <p className={cn(
                  'font-mono text-[28px] font-bold font-mono-num leading-none',
                  getMarginStatus(stats.avgMargin).color
                )}>
                  {stats.avgMargin.toFixed(1)}%
                </p>
                <p className={cn(
                  'text-[12px] mt-1 flex items-center gap-1.5',
                  getMarginStatus(stats.avgMargin).color
                )}>
                  {getMarginStatus(stats.avgMargin).label}
                  <span className={cn('w-1.5 h-1.5 rounded-full', getMarginStatus(stats.avgMargin).color.replace('text-', 'bg-'))} />
                </p>
              </div>
              <div className="surface-card p-4">
                <p className="section-label mb-2">Produtos</p>
                <p className="font-mono text-[28px] font-bold font-mono-num leading-none text-foreground">
                  {stats.totalProducts}
                </p>
                <p className="text-[12px] text-text-3 mt-1">cadastrados</p>
              </div>
            </div>
          </div>

          {/* Performance */}
          {stats.totalProducts > 0 && (
            <div className="animate-fade-up stagger-3">
              <div className="surface-card rounded-[10px] px-4 py-3 flex items-center justify-center gap-2">
                <span className="font-mono text-[14px] font-bold font-mono-num text-success">{stats.productsAboveTarget}</span>
                <span className="text-[13px] text-text-2">na meta</span>
                <span className="text-text-3 text-[13px]">·</span>
                <span className={cn('font-mono text-[14px] font-bold font-mono-num', stats.productsBelowTarget > 0 ? 'text-warning' : 'text-text-3')}>{stats.productsBelowTarget}</span>
                <span className="text-[13px] text-text-2">abaixo da meta</span>
              </div>
            </div>
          )}

          {/* Education Card */}
          <HomeEducationCard />
        </div>

        {/* Tools Grid */}
        <div className="animate-fade-up md:col-span-12">
          <p className="section-label mb-3">Ferramentas</p>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-y-3 gap-x-2">
            {toolItems.map((item) => (
              <button
                key={item.label}
                onClick={() => handleToolClick(item)}
                className="flex flex-col items-center gap-1.5 py-2 transition-colors active:scale-95"
              >
                <div className={cn(
                  'w-11 h-11 rounded-xl flex items-center justify-center',
                  item.isAccent ? 'bg-primary text-primary-foreground' : 'bg-surface-2 text-text-2'
                )}>
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-medium text-text-2 leading-tight text-center px-1 line-clamp-2">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Top Products */}
        {topProducts.length > 0 && (
          <div className="space-y-2 animate-fade-up stagger-4 md:col-span-12">
            <div className="flex items-center justify-between">
              <p className="section-label">Seus Produtos</p>
              <button onClick={() => navigate('/products')} className="text-xs text-primary font-medium flex items-center gap-0.5">
                Ver Todos <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="divide-y divide-border">
              {topProducts.map(({ product, calc }) => (
                <button key={product.id} className="w-full py-3 flex items-center gap-3 text-left" onClick={() => navigate('/products')}>
                  <ProductThumbnail productId={product.id} productName={product.name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-medium text-foreground truncate">{product.name}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={cn('font-mono text-[13px] font-mono-num', calc.netProfit >= 0 ? 'text-success' : 'text-danger')}>
                        Lucro R$ {calc.netProfit.toFixed(2).replace('.', ',')}
                      </span>
                      <span className="text-text-3 text-[13px]">·</span>
                      <span className={cn('font-mono text-[13px] font-bold font-mono-num', getMarginStatus(calc.realMargin).color)}>
                        {calc.realMargin.toFixed(1)}%
                      </span>
                      <span className={cn('w-1.5 h-1.5 rounded-full', getMarginStatus(calc.realMargin).color.replace('text-', 'bg-'))} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {stats.totalProducts === 0 && (
          <div className="text-center py-10 animate-fade-up md:col-span-12">
            <div className="w-14 h-14 rounded-xl bg-surface-2 mx-auto flex items-center justify-center mb-3">
              <Package className="w-7 h-7 text-text-3" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Nenhum produto ainda</h3>
            <p className="text-sm text-text-2 mb-5 max-w-xs mx-auto">Adicione seu primeiro produto para começar a precificar</p>
          </div>
        )}
      </div>

      {showProductForm && <ProductForm product={prefillProduct as any} onClose={() => { setShowProductForm(false); setPrefillProduct(null); }} onSave={handleSaveProduct} />}
      <SubscriptionModal open={showPaywall} onClose={() => setShowPaywall(false)} />
      <DailyOfferModal />
    </AppLayout>
  );
}

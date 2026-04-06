import { useState, useEffect, useCallback } from 'react';
import { Calculator, ShoppingBag, BarChart2, GraduationCap, Store, Archive, UserCircle, Percent, ChevronRight, AlertTriangle, ArrowRight, Image as ImageIcon, Bell, Plus, TrendingUp, Settings2, Boxes } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '@/contexts/StoreContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageLoader, PageError } from '@/components/layout/PageStates';
import { ProductForm } from '@/components/forms/ProductForm';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import { useShopeeToken } from '@/hooks/useShopeeToken';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useSubscription } from '@/contexts/SubscriptionContext';
import { cn } from '@/lib/utils';
import { QuickCalculator } from '@/components/home/QuickCalculator';

import { ProductThumbnail } from '@/components/ProductThumbnail';
import { useEstoque } from '@/hooks/useEstoque';
import { BannerCarousel } from '@/components/home/BannerCarousel';
import { useAdmin } from '@/hooks/useAdmin';
import { MARKETPLACE_SHORTCUTS } from '@/lib/marketplaceShortcuts';
import type { Product } from '@/types/store';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { InstallTutorial } from '@/components/InstallTutorial';

const toolItems = [
  { icon: Calculator, label: 'Precificar', isAccent: true, action: 'addProduct' as const, iconBg: '', iconColor: '' },
  { icon: ShoppingBag, label: 'Produtos', route: '/products', iconBg: '', iconColor: '' },
  { icon: BarChart2, label: 'Ads', route: '/roas', iconBg: '', iconColor: '' },
  { icon: GraduationCap, label: 'Educação', route: '/education', iconBg: '', iconColor: '' },
  { icon: Archive, label: 'Estoque', route: '/stock', iconBg: '', iconColor: '' },
  { icon: Percent, label: 'Taxas', route: '/settings', iconBg: '', iconColor: '' },
  { icon: Store, label: 'Lojas', route: '/stores', iconBg: '', iconColor: '' },
  { icon: UserCircle, label: 'Perfil', route: '/profile', iconBg: '', iconColor: '' },
];


const desktopQuickLinks = [
  { icon: TrendingUp, label: 'Análise de Ads', desc: 'ROAS real dos seus produtos', route: '/roas', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { icon: Boxes, label: 'Estoque', desc: 'Controle e alertas de reposição', route: '/stock', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { icon: GraduationCap, label: 'Educação', desc: 'Tutoriais e dicas exclusivas', route: '/education', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { icon: Settings2, label: 'Configurações', desc: 'Taxas e comissões da loja', route: '/settings', color: 'text-muted-foreground', bg: 'bg-muted/50' },
];

export default function Home() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentStore, stores, addStore, addProduct, getStoreStats, calculateProduct, isLoading, loadError, retryLoad } = useStore();
  const { isActive, status } = useSubscription();
  const { stats: estoqueStats } = useEstoque();
  const { isAdmin } = useAdmin();
  const [showProductForm, setShowProductForm] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [prefillProduct, setPrefillProduct] = useState<Partial<Product> | null>(null);
  const [onboardingDismissed, setOnboardingDismissed] = useState(() => localStorage.getItem('shopee_onboarding_dismissed') === '1');

  const { isConnected: shopeeConnected, token: shopeeToken } = useShopeeToken('seller');

  const dismissOnboarding = useCallback(() => {
    setOnboardingDismissed(true);
    localStorage.setItem('shopee_onboarding_dismissed', '1');
  }, []);

  const lastSyncRelative = shopeeToken
    ? formatDistanceToNow(new Date(shopeeToken.updated_at), { addSuffix: false, locale: ptBR })
    : '';

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowProductForm(true);
      setSearchParams({});
    }
  }, [searchParams]);


  if (isLoading) {
    return <AppLayout><PageLoader message="Carregando..." minHeight="min-h-[85vh]" /></AppLayout>;
  }

  if (loadError) {
    return <AppLayout><PageError onRetry={retryLoad} minHeight="min-h-[85vh]" /></AppLayout>;
  }

  if (!currentStore) {
    return <AppLayout><PageLoader message="Preparando sua loja..." minHeight="min-h-[85vh]" /></AppLayout>;
  }

  const stats = getStoreStats(currentStore);

  const handleSaveProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
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

  const onSaveFromCalc = (prefill: { costPrice: string; salePrice: string; packaging: string }) => {
    setPrefillProduct({
      costPrice: parseFloat(prefill.costPrice) || 0,
      salePrice: parseFloat(prefill.salePrice) || 0,
      packagingCost: parseFloat(prefill.packaging) || 0,
      name: '',
    });
    setShowProductForm(true);
  };

  const topProducts = currentStore.products
    .map(p => ({ product: p, calc: calculateProduct(p, currentStore.config) }))
    .sort((a, b) => b.calc.realMargin - a.calc.realMargin)
    .slice(0, 5);

  

  const expiredCta = !isActive ? (
    <button
      onClick={() => setShowPaywall(true)}
      className="w-full h-9 flex items-center gap-2 px-3 rounded-[8px] border-l-[3px] border-l-primary bg-surface-2 transition-colors hover:bg-surface-2/80 active:scale-[0.98] animate-fade-up"
    >
      <span className="text-xs">⚡</span>
      <span className="text-body text-text-2 flex-1 text-left">
        Acesso expirou · <span className="text-primary font-semibold">Assinar R$39,90/mês →</span>
      </span>
    </button>
  ) : null;

  /* ─── Products list (shared between mobile & desktop) ─── */
  const productsSection = topProducts.length > 0 ? (
    <div className="space-y-2 animate-fade-up stagger-4">
      <div className="flex items-center justify-between">
        <p className="section-label">Seus Produtos</p>
        <button onClick={() => navigate('/products')} className="text-xs text-primary font-medium flex items-center gap-0.5">
          Ver Todos <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="divide-y divide-border/50">
        {topProducts.map(({ product, calc }) => (
          <button key={product.id} className="w-full py-3 flex items-center gap-3 text-left" onClick={() => navigate('/products')}>
            <ProductThumbnail productId={product.id} productName={product.name} imageUrl={product.imageUrl} />
            <div className="flex-1 min-w-0">
              <p className="text-body font-medium text-foreground truncate">{product.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={cn('font-mono text-body font-mono-num', calc.netProfit >= 0 ? 'text-success' : 'text-danger')}>
                  Lucro R$ {calc.netProfit.toFixed(2).replace('.', ',')}
                </span>
                <span className="text-text-3 text-body">·</span>
                <span className={cn('font-mono text-body font-bold font-mono-num',
                  calc.realMargin >= 20 ? 'text-success' : calc.realMargin >= 12 ? 'text-warning' : 'text-danger'
                )}>
                  {calc.realMargin.toFixed(1)}%
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-text-3 flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  ) : null;

  const emptyState = stats.totalProducts === 0 ? (
    <div className="text-center py-10 animate-fade-up">
      <div className="w-14 h-14 rounded-xl bg-surface-2 mx-auto flex items-center justify-center mb-3">
        <ShoppingBag className="w-7 h-7 text-text-3" />
      </div>
      <h3 className="font-semibold text-foreground mb-1">Nenhum produto ainda</h3>
      <p className="text-body text-text-2 mb-5 max-w-xs mx-auto">Adicione seu primeiro produto para começar a precificar</p>
    </div>
  ) : null;

  return (
    <AppLayout>
      <PageHeader title="Skalify" />

      {/* ══════════════════════════════════════════════
          MOBILE LAYOUT — identical to before
          ══════════════════════════════════════════════ */}
      <div className="md:hidden pt-3 pb-6 space-y-3">
        {/* Shopee connection status */}
        {shopeeConnected && (
          <button
            onClick={() => navigate('/configuracoes/integracoes')}
            className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1.5 hover:bg-emerald-500/15 transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Shopee conectada · sync há {lastSyncRelative}
          </button>
        )}
        {!shopeeConnected && !onboardingDismissed && (
          <div className="flex items-center gap-3 rounded-xl p-4 border"
            style={{ background: 'hsla(24, 100%, 45%, 0.08)', borderColor: 'hsla(24, 100%, 45%, 0.2)' }}
          >
            <span className="text-lg">🔗</span>
            <div className="flex-1">
              <p className="text-sm font-medium">Conecte sua loja Shopee para começar</p>
              <p className="text-xs text-muted-foreground">Importe produtos automaticamente</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <button
                className="text-xs font-medium bg-primary text-primary-foreground px-3 py-1.5 rounded-lg"
                onClick={() => navigate('/configuracoes/integracoes')}
              >
                Conectar →
              </button>
              <button className="text-[10px] text-muted-foreground" onClick={dismissOnboarding}>
                Fazer depois
              </button>
            </div>
          </div>
        )}

        {/* CTA banners */}
        {expiredCta && <div className="space-y-2">{expiredCta}</div>}

        {/* Banner Carousel from DB */}
        <BannerCarousel />

        {/* Admin: link to manage banners */}
        {isAdmin && (
          <button
            onClick={() => navigate('/admin/banners')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-2 text-text-2 text-xs hover:bg-surface-2/80 transition-colors"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Gerenciar Banners</span>
            <ChevronRight className="w-3.5 h-3.5 ml-auto" />
          </button>
        )}


        {/* QuickCalculator */}
        <QuickCalculator onSaveProduct={onSaveFromCalc} />

        {/* Outras plataformas */}
        <div className="animate-fade-up">
          <p className="section-label mb-3">Outras plataformas</p>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
            {MARKETPLACE_SHORTCUTS.map((mp) => (
              <button
                key={mp.tab}
                onClick={() => navigate(`/calculadoras?tab=${mp.tab}`)}
                className="flex flex-col items-center gap-1.5 py-2.5 px-3 min-w-[66px] rounded-[14px] transition-colors active:scale-95 hover:border-primary/50 bg-card border border-border"
              >
                <div
                  className={cn('w-9 h-9 rounded-lg flex items-center justify-center text-body font-extrabold', mp.text)}
                  style={{ backgroundColor: mp.bg }}
                >
                  {mp.sigla}
                </div>
                <span className="text-micro normal-case tracking-normal font-semibold text-text-2 text-center leading-tight whitespace-nowrap">{mp.name}</span>
                <span className="text-micro normal-case tracking-normal text-text-3 whitespace-nowrap">{mp.rate}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tools Grid */}
        <div className="animate-fade-up">
          <p className="section-label mb-3">Ferramentas</p>
          <div className="grid grid-cols-4 gap-y-3 gap-x-2">
            {toolItems.map((item) => {
              const isAccent = 'isAccent' in item && item.isAccent;
              return (
                <button
                  key={item.label}
                  onClick={() => handleToolClick(item)}
                  className="flex flex-col items-center gap-1.5 py-2.5 px-1.5 rounded-[14px] transition-colors active:scale-95 bg-card border border-border"
                >
                  <div
                    className={cn(
                      'w-9 h-9 rounded-[10px] flex items-center justify-center border',
                      isAccent ? 'bg-primary/[0.18] border-primary/30' : 'bg-muted border-border'
                    )}
                  >
                    <item.icon className={cn('w-[18px] h-[18px]', isAccent ? 'text-primary' : 'text-muted-foreground')} />
                  </div>
                  <span className="text-[9px] font-medium leading-tight text-center line-clamp-1 text-secondary-foreground">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar content inline on mobile */}
        <div className="space-y-4">
          {estoqueStats.baixo > 0 && (
            <button onClick={() => navigate('/stock')} className="surface-card px-4 py-3 flex items-center justify-between w-full hover:bg-surface-2/50 transition-colors animate-fade-up">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <div className="text-left">
                  <p className="text-body font-semibold text-foreground">Estoque baixo</p>
                  <p className="text-small text-text-2">{estoqueStats.baixo} {estoqueStats.baixo === 1 ? 'variação' : 'variações'} abaixo do mínimo</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-text-3" />
            </button>
          )}
        </div>

        {/* Products */}
        {productsSection}
        {emptyState}
      </div>

      {/* ══════════════════════════════════════════════
          DESKTOP LAYOUT — redesigned
          ══════════════════════════════════════════════ */}
      <div className="hidden md:block py-4">
        {/* Shopee connection status — desktop */}
        {shopeeConnected && (
          <button
            onClick={() => navigate('/configuracoes/integracoes')}
            className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1.5 mb-3 hover:bg-emerald-500/15 transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Shopee conectada · sync há {lastSyncRelative}
          </button>
        )}
        {!shopeeConnected && !onboardingDismissed && (
          <div className="flex items-center gap-3 rounded-xl p-4 mb-3 border"
            style={{ background: 'hsla(24, 100%, 45%, 0.08)', borderColor: 'hsla(24, 100%, 45%, 0.2)' }}
          >
            <span className="text-lg">🔗</span>
            <div className="flex-1">
              <p className="text-sm font-medium">Conecte sua loja Shopee para começar</p>
              <p className="text-xs text-muted-foreground">Importe produtos e pedidos automaticamente</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="text-xs font-medium bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                onClick={() => navigate('/configuracoes/integracoes')}
              >
                Conectar →
              </button>
              <button className="text-[10px] text-muted-foreground" onClick={dismissOnboarding}>
                Fazer depois
              </button>
            </div>
          </div>
        )}

        {/* CTA banners */}
        {expiredCta && <div className="mb-2.5">{expiredCta}</div>}

        {/* Single 2-column grid — hero+calc left, novidades+atalhos right */}
        <div className="grid grid-cols-[1fr_320px] gap-2.5 items-start">
          {/* Left column */}
          <div className="space-y-2.5">
            {/* Hero Banner */}
            <div className="rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 px-8 py-6 relative overflow-hidden animate-fade-up">
              <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle at 70% 30%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
              <div className="relative z-10 max-w-2xl">
                <h1 className="text-2xl font-bold text-primary-foreground mb-1 leading-tight">
                  Pare de vender no prejuízo.
                </h1>
                <p className="text-primary-foreground/80 text-sm mb-3 max-w-lg">
                  Descubra sua margem real em segundos e saiba se seus Ads estão dando lucro de verdade.
                </p>
                <div className="flex flex-wrap gap-3">
                  <div className="flex flex-col items-center">
                    <button
                      onClick={() => setShowProductForm(true)}
                      className="h-10 px-5 bg-white text-primary rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-white/90 transition-colors shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> Precificar produto
                    </button>
                    <span className="text-small text-white/60 mt-1 text-center">Calcule em segundos</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <button
                      onClick={() => navigate('/roas')}
                      className="h-10 px-5 bg-white/15 text-primary-foreground border border-white/20 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-white/25 transition-colors backdrop-blur-sm"
                    >
                      <TrendingUp className="w-4 h-4" /> Análise de Ads
                    </button>
                    <span className="text-small text-white/60 mt-1 text-center">Importe seu relatório</span>
                  </div>
                </div>
              </div>
            </div>

            <QuickCalculator onSaveProduct={onSaveFromCalc} />

            {/* Outras plataformas */}
            <div className="surface-card p-4">
              <p className="section-label mb-3">Outras plataformas</p>
              <div className="grid grid-cols-5 gap-3">
                {MARKETPLACE_SHORTCUTS.map((mp) => (
                  <button
                    key={mp.tab}
                    onClick={() => navigate(`/calculadoras?tab=${mp.tab}`)}
                    className="flex flex-col items-center gap-2 py-3 bg-surface-2 rounded-xl border border-border transition-colors hover:border-primary/50 hover:bg-surface-2/80 active:scale-95"
                  >
                    <div
                      className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-body font-extrabold', mp.text)}
                      style={{ backgroundColor: mp.bg }}
                    >
                      {mp.sigla}
                    </div>
                    <span className="text-small font-semibold text-text-2 text-center leading-tight">{mp.name}</span>
                    <span className="text-micro normal-case tracking-normal text-text-3 text-center">{mp.rateDesktop || mp.rate}</span>
                  </button>
                ))}
              </div>
            </div>

            {productsSection}
            {emptyState}
          </div>

          {/* Right column — sticky sidebar */}
          <div className="space-y-2.5 sticky top-4 self-start">
            {/* Card de Avisos */}
            <div className="rounded-2xl border border-border bg-card p-5 flex flex-col animate-fade-up">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-primary" />
                </div>
                <h2 className="text-body font-semibold text-foreground">Novidades</h2>
              </div>
              <div className="space-y-3 flex-1">
                {[
                  { emoji: '🚀', text: 'Calculadoras TikTok, Shein, Amazon e ML atualizadas' },
                  { emoji: '📊', text: 'Importe CSV de Ads e veja ROAS real por produto' },
                  { emoji: '📦', text: 'Controle de estoque com alertas de reposição' },
                  { emoji: '💡', text: 'Dica: configure taxas da loja para margens precisas' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="text-sm mt-0.5 flex-shrink-0">{item.emoji}</span>
                    <p className="text-body text-muted-foreground leading-snug">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick links */}
            <div className="space-y-2">
              <p className="section-label">Atalhos</p>
              <div className="space-y-2">
                {desktopQuickLinks.map((link) => (
                  <button
                    key={link.route}
                    onClick={() => navigate(link.route)}
                    className="w-full surface-card px-4 py-3 flex items-center gap-3 text-left hover:bg-surface-2/50 transition-colors group"
                  >
                    <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', link.bg)}>
                      <link.icon className={cn('w-4.5 h-4.5', link.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body font-semibold text-foreground">{link.label}</p>
                      <p className="text-small text-text-3">{link.desc}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-text-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>

            {/* Stock alert */}
            {estoqueStats.baixo > 0 && (
              <button onClick={() => navigate('/stock')} className="surface-card px-4 py-3 flex items-center justify-between w-full hover:bg-surface-2/50 transition-colors border-l-[3px] border-l-warning">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  <div className="text-left">
                  <p className="text-body font-semibold text-foreground">Estoque baixo</p>
                  <p className="text-small text-text-2">{estoqueStats.baixo} {estoqueStats.baixo === 1 ? 'variação' : 'variações'} abaixo do mínimo</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-text-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {showProductForm && <ProductForm product={prefillProduct as any} onClose={() => { setShowProductForm(false); setPrefillProduct(null); }} onSave={handleSaveProduct} />}
      <SubscriptionModal open={showPaywall} onClose={() => setShowPaywall(false)} />
    </AppLayout>
  );
}

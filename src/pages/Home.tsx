import { useState, useEffect, useCallback } from 'react';
import { Plus, Package, BarChart3, GraduationCap, Store, Warehouse, UserCircle, Settings2, ChevronRight, AlertTriangle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '@/contexts/StoreContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { ProductForm } from '@/components/forms/ProductForm';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import { TrialBanner } from '@/components/TrialBanner';
import { DailyOfferModal } from '@/components/DailyOfferModal';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { cn } from '@/lib/utils';
import { QuickCalculator } from '@/components/home/QuickCalculator';
import { HomeEducationCard } from '@/components/home/HomeEducationCard';
import { ProductThumbnail } from '@/components/ProductThumbnail';
import { useEstoque } from '@/hooks/useEstoque';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';

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

const bannerSlides = [
  {
    title: 'Precifique com precisão',
    subtitle: 'Calcule custos, taxas e margem real dos seus produtos Shopee',
    cta: 'Precificar produto',
    emoji: '🎯',
    action: 'addProduct' as const,
    bgClass: 'bg-gradient-to-br from-primary to-primary/80',
    textClass: 'text-primary-foreground',
  },
  {
    title: 'Analise seus Ads',
    subtitle: 'Importe o CSV da Shopee e descubra o ROAS real de cada produto',
    cta: 'Ver Análise →',
    emoji: '📊',
    route: '/roas',
    bgClass: 'bg-gradient-to-br from-blue-600 to-blue-500',
    textClass: 'text-white',
  },
  {
    title: 'Controle seu Estoque',
    subtitle: 'Cadastre variações e receba alertas automáticos de reposição',
    cta: 'Ver Estoque →',
    emoji: '📦',
    route: '/stock',
    bgClass: 'bg-gradient-to-br from-emerald-600 to-emerald-500',
    textClass: 'text-white',
  },
];

export default function Home() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentStore, stores, addStore, addProduct, getStoreStats, calculateProduct, isLoading } = useStore();
  const { isActive, status, trialEnd } = useSubscription();
  const { stats: estoqueStats } = useEstoque();
  const [showProductForm, setShowProductForm] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [prefillProduct, setPrefillProduct] = useState<Partial<import('@/types/store').Product> | null>(null);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowProductForm(true);
      setSearchParams({});
    }
  }, [searchParams]);

  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => setCurrentSlide(carouselApi.selectedScrollSnap());
    carouselApi.on('select', onSelect);
    onSelect();
    return () => { carouselApi.off('select', onSelect); };
  }, [carouselApi]);

  const handleBannerClick = useCallback((slide: typeof bannerSlides[number]) => {
    if ('action' in slide && slide.action === 'addProduct') {
      setShowProductForm(true);
    } else if ('route' in slide && slide.route) {
      navigate(slide.route);
    }
  }, [navigate]);

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
    .slice(0, 5);

  const trialBanner = <TrialBanner />;

  const subscriptionCta = status === 'trialing' && trialEnd && (() => {
    const dLeft = Math.max(0, Math.ceil((new Date(trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    return dLeft > 0 ? (
      <button
        onClick={() => setShowPaywall(true)}
        className="w-full h-9 flex items-center gap-2 px-3 rounded-[8px] border-l-[3px] border-l-primary bg-surface-2 transition-colors hover:bg-surface-2/80 active:scale-[0.98] animate-fade-up"
      >
        <span className="text-xs">⏳</span>
        <span className="text-[13px] text-text-2 flex-1 text-left">
          {dLeft} {dLeft === 1 ? 'dia restante' : 'dias restantes'} · <span className="text-primary font-semibold">Garantir acesso →</span>
        </span>
      </button>
    ) : null;
  })();

  const expiredCta = !isActive && status !== 'trialing' ? (
    <button
      onClick={() => setShowPaywall(true)}
      className="w-full h-9 flex items-center gap-2 px-3 rounded-[8px] border-l-[3px] border-l-primary bg-surface-2 transition-colors hover:bg-surface-2/80 active:scale-[0.98] animate-fade-up"
    >
      <span className="text-xs">⚡</span>
      <span className="text-[13px] text-text-2 flex-1 text-left">
        Acesso expirou · <span className="text-primary font-semibold">Assinar R$49,90/ano →</span>
      </span>
    </button>
  ) : null;

  return (
    <AppLayout>
      <PageHeader title="Precify" />
      <div className="py-3 space-y-3 md:py-8">
        {/* Full-width banners */}
        <div className="md:col-span-2 space-y-2">
          {trialBanner}
          {subscriptionCta}
          {expiredCta}
        </div>

        {/* Desktop: two-column grid / Mobile: stacked */}
        <div className="flex flex-col space-y-3 md:grid md:grid-cols-[1fr_280px] md:gap-6 md:space-y-0">

          {/* Left column */}
          <div className="space-y-4 order-1 md:order-none">
            {/* Tools Grid — mobile only (before carousel) */}
            <div className="animate-fade-up md:hidden">
              <p className="section-label mb-3">Ferramentas</p>
              <div className="grid grid-cols-4 gap-y-3 gap-x-2">
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

            {/* Banner Carousel — compact */}
            <div className="animate-fade-up">
              <Carousel
                setApi={setCarouselApi}
                opts={{ loop: true }}
                plugins={[Autoplay({ delay: 5000, stopOnInteraction: true })]}
                className="w-full"
              >
                <CarouselContent className="-ml-0">
                  {bannerSlides.map((slide, i) => (
                    <CarouselItem key={i} className="pl-0">
                      <button
                        onClick={() => handleBannerClick(slide)}
                        className={cn(
                          'w-full rounded-xl p-4 text-left relative overflow-hidden transition-all active:scale-[0.99] h-[100px] flex flex-col justify-between',
                          slide.bgClass
                        )}
                      >
                        <span className="absolute top-3 right-3 text-5xl opacity-20 select-none">{slide.emoji}</span>
                        <div className="relative z-10">
                          <h2 className={cn('text-sm font-bold mb-0.5 leading-tight', slide.textClass)}>
                            {slide.title}
                          </h2>
                          <p className={cn('text-[11px] opacity-90 max-w-[70%]', slide.textClass)}>
                            {slide.subtitle}
                          </p>
                        </div>
                        <div className="relative z-10">
                          <span className={cn(
                            'inline-flex items-center gap-1 h-6 px-3 rounded-md text-[11px] font-semibold bg-white/20 backdrop-blur-sm',
                            slide.textClass
                          )}>
                            {slide.cta}
                          </span>
                        </div>
                      </button>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
              <div className="flex justify-center gap-1.5 mt-2">
                {bannerSlides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => carouselApi?.scrollTo(i)}
                    className={cn(
                      'w-2 h-2 rounded-full transition-all',
                      i === currentSlide ? 'bg-primary w-5' : 'bg-border'
                    )}
                  />
                ))}
              </div>
            </div>

            <QuickCalculator onSaveProduct={(prefill) => {
              setPrefillProduct({
                costPrice: parseFloat(prefill.costPrice) || 0,
                salePrice: parseFloat(prefill.salePrice) || 0,
                packagingCost: parseFloat(prefill.packaging) || 0,
                name: '',
              });
              setShowProductForm(true);
            }} />

            {/* Top Products */}
            {topProducts.length > 0 && (
              <div className="space-y-2 animate-fade-up stagger-4 order-7 md:order-none">
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
                          <span className={cn('font-mono text-[13px] font-bold font-mono-num', 
                            calc.realMargin >= 20 ? 'text-success' : calc.realMargin >= 12 ? 'text-warning' : 'text-danger'
                          )}>
                            {calc.realMargin.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {stats.totalProducts === 0 && (
              <div className="text-center py-10 animate-fade-up order-7 md:order-none">
                <div className="w-14 h-14 rounded-xl bg-surface-2 mx-auto flex items-center justify-center mb-3">
                  <Package className="w-7 h-7 text-text-3" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Nenhum produto ainda</h3>
                <p className="text-sm text-text-2 mb-5 max-w-xs mx-auto">Adicione seu primeiro produto para começar a precificar</p>
              </div>
            )}
          </div>

          {/* Right column: slim sidebar */}
          <div className="space-y-4 order-2 md:order-none md:sticky md:top-20 md:self-start">
            {/* Low stock alert */}
            {estoqueStats.baixo > 0 && (
              <button onClick={() => navigate('/stock')} className="surface-card px-4 py-3 flex items-center justify-between w-full hover:bg-surface-2/50 transition-colors animate-fade-up">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  <div className="text-left">
                    <p className="text-[13px] font-semibold text-foreground">Estoque baixo</p>
                    <p className="text-[11px] text-text-2">{estoqueStats.baixo} {estoqueStats.baixo === 1 ? 'variação' : 'variações'} abaixo do mínimo</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-text-3" />
              </button>
            )}

            {/* Education Card */}
            <HomeEducationCard />
          </div>

        </div>
      </div>

      {showProductForm && <ProductForm product={prefillProduct as any} onClose={() => { setShowProductForm(false); setPrefillProduct(null); }} onSave={handleSaveProduct} />}
      <SubscriptionModal open={showPaywall} onClose={() => setShowPaywall(false)} />
      <DailyOfferModal />
    </AppLayout>
  );
}
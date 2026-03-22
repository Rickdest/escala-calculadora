import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import { cn } from '@/lib/utils';

interface Banner {
  id: string;
  image_url: string;
  link_destino: string | null;
  ordem: number;
  ativo: boolean;
}

const fallbackSlides = [
  {
    id: 'f1',
    title: 'Precifique com precisão',
    subtitle: 'Calcule custos, taxas e margem real dos seus produtos Shopee',
    cta: 'Precificar produto',
    emoji: '🎯',
    link_destino: '/?new=1',
    bgClass: 'bg-gradient-to-br from-primary to-primary/80',
    textClass: 'text-primary-foreground',
  },
  {
    id: 'f2',
    title: 'Analise seus Ads',
    subtitle: 'Importe o CSV da Shopee e descubra o ROAS real de cada produto',
    cta: 'Ver Análise →',
    emoji: '📊',
    link_destino: '/roas',
    bgClass: 'bg-gradient-to-br from-blue-600 to-blue-500',
    textClass: 'text-white',
  },
  {
    id: 'f3',
    title: 'Controle seu Estoque',
    subtitle: 'Cadastre variações e receba alertas automáticos de reposição',
    cta: 'Ver Estoque →',
    emoji: '📦',
    link_destino: '/stock',
    bgClass: 'bg-gradient-to-br from-emerald-600 to-emerald-500',
    textClass: 'text-white',
  },
];

export function BannerCarousel() {
  const navigate = useNavigate();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [hasBanners, setHasBanners] = useState<boolean | null>(null);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    supabase
      .from('banners')
      .select('*')
      .eq('ativo', true)
      .order('ordem', { ascending: true })
      .then(({ data }) => {
        const valid = (data as Banner[] | null)?.filter(b => b.image_url) || [];
        setBanners(valid);
        setHasBanners(valid.length > 0);
      });
  }, []);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on('select', onSelect);
    onSelect();
    return () => { api.off('select', onSelect); };
  }, [api]);

  const handleClick = (link: string | null) => {
    if (!link) return;
    if (link.startsWith('http')) {
      window.open(link, '_blank', 'noopener');
    } else {
      navigate(link);
    }
  };

  // Still loading
  if (hasBanners === null) return null;

  // DB banners with images
  if (hasBanners) {
    return (
      <div className="block md:hidden animate-fade-up">
        <Carousel
          setApi={setApi}
          opts={{ loop: true }}
          plugins={[Autoplay({ delay: 4000, stopOnInteraction: true })]}
          className="w-full"
        >
          <CarouselContent className="-ml-0">
            {banners.map((banner) => (
              <CarouselItem key={banner.id} className="pl-0">
                <button
                  onClick={() => handleClick(banner.link_destino)}
                  className="w-full h-[100px] rounded-xl overflow-hidden relative transition-all active:scale-[0.99]"
                >
                  <img
                    src={banner.image_url}
                    alt="Banner"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {banners.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-2">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => api?.scrollTo(i)}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === current ? 'w-5 bg-primary' : 'w-1.5 bg-text-3/30'
                )}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Fallback: static text slides (same as before)
  return (
    <div className="block md:hidden animate-fade-up">
      <Carousel
        setApi={setApi}
        opts={{ loop: true }}
        plugins={[Autoplay({ delay: 5000, stopOnInteraction: true })]}
        className="w-full"
      >
        <CarouselContent className="-ml-0">
          {fallbackSlides.map((slide) => (
            <CarouselItem key={slide.id} className="pl-0">
              <button
                onClick={() => handleClick(slide.link_destino)}
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
        {fallbackSlides.map((_, i) => (
          <button
            key={i}
            onClick={() => api?.scrollTo(i)}
            className={cn(
              'h-1.5 rounded-full transition-all',
              i === current ? 'w-5 bg-primary' : 'w-1.5 bg-text-3/30'
            )}
          />
        ))}
      </div>
    </div>
  );
}

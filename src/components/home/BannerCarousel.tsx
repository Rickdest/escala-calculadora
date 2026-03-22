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

export function BannerCarousel() {
  const navigate = useNavigate();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    supabase
      .from('banners')
      .select('*')
      .eq('ativo', true)
      .order('ordem', { ascending: true })
      .then(({ data }) => {
        if (data) setBanners(data as Banner[]);
      });
  }, []);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on('select', onSelect);
    onSelect();
    return () => { api.off('select', onSelect); };
  }, [api]);

  const handleClick = (banner: Banner) => {
    if (!banner.link_destino) return;
    if (banner.link_destino.startsWith('http')) {
      window.open(banner.link_destino, '_blank', 'noopener');
    } else {
      navigate(banner.link_destino);
    }
  };

  if (banners.length === 0) return null;

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
                onClick={() => handleClick(banner)}
                className="w-full h-[160px] rounded-2xl overflow-hidden relative transition-all active:scale-[0.99]"
              >
                {banner.image_url ? (
                  <img
                    src={banner.image_url}
                    alt="Banner"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground text-2xl font-bold">Precify</span>
                  </div>
                )}
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
                i === current
                  ? 'w-5 bg-primary'
                  : 'w-1.5 bg-text-3/30'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

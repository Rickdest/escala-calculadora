import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, ChevronRight, Play, BookOpen, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { cn } from '@/lib/utils';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';

interface BannerSlide {
  id: string;
  type: 'education' | 'custom';
  title: string;
  subtitle: string;
  imageUrl?: string;
  gradient?: string;
}

const defaultSlides: BannerSlide[] = [
  {
    id: 'education',
    type: 'education',
    title: 'Aprenda a Vender Mais',
    subtitle: 'Tutoriais e cursos exclusivos para você',
    gradient: 'from-primary/20 to-primary/5',
  },
];

export function EducationBanner() {
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  const [slides, setSlides] = useState<BannerSlide[]>(defaultSlides);
  const [customBanners, setCustomBanners] = useState<any[]>([]);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    const { data } = await supabase
      .from('education_content')
      .select('*')
      .eq('content_type', 'banner')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (data && data.length > 0) {
      const bannerSlides: BannerSlide[] = data.map((banner: any) => ({
        id: banner.id,
        type: 'custom' as const,
        title: banner.title,
        subtitle: banner.description || '',
        imageUrl: (banner.content_data as any)?.imageUrl,
        gradient: (banner.content_data as any)?.gradient || 'from-secondary to-secondary/50',
      }));
      setCustomBanners(data);
      setSlides([...defaultSlides, ...bannerSlides]);
    }
  };

  return (
    <div className="animate-fade-up">
      <Carousel
        opts={{
          align: 'start',
          loop: slides.length > 1,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2">
          {slides.map((slide, index) => (
            <CarouselItem key={slide.id} className="pl-2 basis-full">
              <div
                onClick={() => navigate('/education')}
                className={cn(
                  'relative overflow-hidden rounded-2xl cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]',
                  'bg-gradient-to-br',
                  slide.gradient || 'from-primary/20 to-primary/5',
                  'min-h-[160px]'
                )}
              >
                {slide.imageUrl ? (
                  <img
                    src={slide.imageUrl}
                    alt={slide.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : null}
                
                <div className={cn(
                  'relative z-10 p-6 flex flex-col justify-between h-full min-h-[160px]',
                  slide.imageUrl && 'bg-gradient-to-t from-black/60 to-transparent'
                )}>
                  <div className="flex items-start justify-between">
                    <div className="p-3 rounded-xl bg-primary/20 backdrop-blur-sm">
                      {slide.type === 'education' ? (
                        <GraduationCap className="w-6 h-6 text-primary" />
                      ) : (
                        <Sparkles className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    {slides.length > 1 && (
                      <div className="flex gap-1.5">
                        {slides.map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              'w-2 h-2 rounded-full transition-all',
                              i === index ? 'bg-primary w-6' : 'bg-primary/30'
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4">
                    <h3 className={cn(
                      'font-bold text-xl mb-1',
                      slide.imageUrl ? 'text-white' : 'text-foreground'
                    )}>
                      {slide.title}
                    </h3>
                    <p className={cn(
                      'text-sm',
                      slide.imageUrl ? 'text-white/80' : 'text-muted-foreground'
                    )}>
                      {slide.subtitle}
                    </p>
                    <div className={cn(
                      'mt-3 inline-flex items-center gap-2 text-sm font-semibold',
                      slide.imageUrl ? 'text-white' : 'text-primary'
                    )}>
                      Acessar
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
}

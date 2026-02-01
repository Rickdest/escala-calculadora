import { GraduationCap, PlayCircle, BookOpen, ExternalLink } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';

const tutorialVideos = [
  {
    id: 1,
    title: 'Como usar a Escala Calculadora',
    description: 'Tutorial completo de como precificar seus produtos',
    videoId: 'dQw4w9WgXcQ', // Placeholder - substituir pelo ID real
  },
  {
    id: 2,
    title: 'Configurando suas taxas',
    description: 'Aprenda a configurar taxas da Shopee e impostos',
    videoId: 'dQw4w9WgXcQ', // Placeholder
  },
  {
    id: 3,
    title: 'Analisando margens',
    description: 'Como interpretar os dados de margem dos seus produtos',
    videoId: 'dQw4w9WgXcQ', // Placeholder
  },
];

const educationalContent = [
  {
    id: 1,
    title: 'Guia de Precificação',
    description: 'Entenda como calcular o preço ideal dos seus produtos',
    icon: BookOpen,
  },
  {
    id: 2,
    title: 'Taxas da Shopee',
    description: 'Conheça todas as taxas cobradas pela plataforma',
    icon: BookOpen,
  },
  {
    id: 3,
    title: 'Margem de Lucro',
    description: 'Aprenda a definir margens saudáveis para seu negócio',
    icon: BookOpen,
  },
];

export default function Education() {
  return (
    <AppLayout>
      <PageHeader 
        title="Educação"
        subtitle="Aprenda a vender mais na Shopee"
        showStoreSelector={false}
      />

      <div className="px-4 py-6 space-y-6">
        {/* Tutorial Videos */}
        <section className="space-y-4 animate-fade-up">
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-primary" />
            Tutoriais em Vídeo
          </h2>

          <div className="space-y-3">
            {tutorialVideos.map((video) => (
              <div key={video.id} className="glass-card overflow-hidden">
                <div className="aspect-video bg-muted relative">
                  <iframe
                    src={`https://www.youtube.com/embed/${video.videoId}`}
                    title={video.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-foreground">{video.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{video.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Educational Content */}
        <section className="space-y-4 animate-fade-up stagger-1">
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            Conteúdos Educativos
          </h2>

          <div className="space-y-3">
            {educationalContent.map((content) => (
              <div key={content.id} className="glass-card p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-secondary">
                    <content.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground">{content.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{content.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Course Promotion - Discrete */}
        <section className="mt-8 animate-fade-up stagger-2">
          <div className="glass-card p-5 border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl gradient-primary shrink-0">
                <GraduationCap className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                  Curso Completo
                </span>
                <h3 className="font-bold text-foreground text-lg mt-1">
                  Domine as Vendas na Shopee
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Aprenda estratégias avançadas de precificação, anúncios e escala para multiplicar seus lucros.
                </p>
                
                <div className="mt-4 space-y-3">
                  {/* Video placeholder */}
                  <div className="aspect-video bg-muted/50 rounded-xl overflow-hidden relative">
                    <iframe
                      src="https://www.youtube.com/embed/dQw4w9WgXcQ" // Placeholder - substituir pelo vídeo de vendas
                      title="Apresentação do Curso"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                    />
                  </div>
                  
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Módulos completos de precificação
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Estratégias de Shopee Ads
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Suporte exclusivo
                    </li>
                  </ul>

                  <Button 
                    className="w-full h-11 font-bold"
                    variant="outline"
                    onClick={() => window.open('https://seu-link-de-venda.com', '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Conhecer o Curso
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

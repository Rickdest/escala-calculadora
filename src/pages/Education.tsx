import { useState, useEffect } from 'react';
import { GraduationCap, PlayCircle, BookOpen, ExternalLink, Edit2, Save, X, Plus, Trash2, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EducationContent {
  id: string;
  content_type: string;
  title: string;
  description: string | null;
  content_data: any;
  display_order: number;
  is_active: boolean;
}

export default function Education() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { toast } = useToast();
  const [content, setContent] = useState<EducationContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('education_content')
      .select('*')
      .eq('is_active', true)
      .order('content_type')
      .order('display_order');

    if (data) {
      setContent(data);
    }
    setLoading(false);
  };

  const startEditing = (item: EducationContent) => {
    setEditingId(item.id);
    setEditForm({
      title: item.title,
      description: item.description || '',
      ...item.content_data,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (item: EducationContent) => {
    setSaving(true);
    
    const { title, description, ...contentData } = editForm;

    // Validate inputs
    if (title && title.length > 200) {
      toast({ title: 'Erro', description: 'Título deve ter no máximo 200 caracteres.', variant: 'destructive' });
      setSaving(false);
      return;
    }
    if (description && description.length > 1000) {
      toast({ title: 'Erro', description: 'Descrição deve ter no máximo 1000 caracteres.', variant: 'destructive' });
      setSaving(false);
      return;
    }
    if (contentData.youtube_id && !/^[a-zA-Z0-9_-]{11}$/.test(contentData.youtube_id)) {
      toast({ title: 'Erro', description: 'ID do YouTube inválido (deve ter 11 caracteres alfanuméricos).', variant: 'destructive' });
      setSaving(false);
      return;
    }
    if (contentData.button_link && !contentData.button_link.startsWith('https://')) {
      toast({ title: 'Erro', description: 'Link deve começar com https://', variant: 'destructive' });
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from('education_content')
      .update({
        title,
        description,
        content_data: contentData,
      })
      .eq('id', item.id);

    if (error) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Salvo!',
        description: 'Conteúdo atualizado com sucesso.',
      });
      await loadContent();
      cancelEditing();
    }
    
    setSaving(false);
  };

  const videos = content.filter(c => c.content_type === 'video');
  const guides = content.filter(c => c.content_type === 'guide');
  const offers = content.filter(c => c.content_type === 'offer');

  if (loading || adminLoading) {
    return (
      <AppLayout>
        <PageHeader title="Educação" showStoreSelector={false} />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader 
        title="Educação"
        subtitle="Aprenda a vender mais na Shopee"
        showStoreSelector={false}
      />

      <div className="py-6 md:py-8 space-y-6">
        {/* Tutorial Videos */}
        <section className="space-y-4 animate-fade-up">
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-primary" />
            Tutoriais em Vídeo
          </h2>

          <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
            {videos.map((video) => (
              <div key={video.id} className="glass-card overflow-hidden">
                {editingId === video.id ? (
                  <div className="p-4 space-y-4">
                    <div className="space-y-2">
                      <Label>Título</Label>
                      <Input
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        className="input-modern"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <Textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className="input-modern"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>ID do YouTube</Label>
                      <Input
                        value={editForm.youtube_id || ''}
                        onChange={(e) => setEditForm({ ...editForm, youtube_id: e.target.value })}
                        placeholder="Ex: dQw4w9WgXcQ"
                        className="input-modern"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => saveEdit(video)} disabled={saving} className="flex-1">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Salvar
                      </Button>
                      <Button onClick={cancelEditing} variant="outline">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="aspect-video bg-muted relative">
                      <iframe
                        src={`https://www.youtube.com/embed/${video.content_data?.youtube_id}`}
                        title={video.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="absolute inset-0 w-full h-full"
                      />
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-foreground">{video.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{video.description}</p>
                        </div>
                        {isAdmin && (
                          <Button onClick={() => startEditing(video)} variant="ghost" size="sm">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </>
                )}
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

          <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
            {guides.map((guide) => (
              <div key={guide.id} className="glass-card p-4">
                {editingId === guide.id ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Título</Label>
                      <Input
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        className="input-modern"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <Textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className="input-modern"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => saveEdit(guide)} disabled={saving} className="flex-1">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Salvar
                      </Button>
                      <Button onClick={cancelEditing} variant="outline">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-secondary">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-foreground">{guide.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{guide.description}</p>
                    </div>
                    {isAdmin && (
                      <Button onClick={() => startEditing(guide)} variant="ghost" size="sm">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Course Promotion */}
        {offers.map((offer) => (
          <section key={offer.id} className="mt-8 animate-fade-up stagger-2">
            {editingId === offer.id ? (
              <div className="glass-card p-5 space-y-4">
                <h3 className="font-bold">Editar Oferta</h3>
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="input-modern"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="input-modern"
                  />
                </div>
                <div className="space-y-2">
                  <Label>URL do Vídeo de Vendas (YouTube ID)</Label>
                  <Input
                    value={editForm.video_url || ''}
                    onChange={(e) => setEditForm({ ...editForm, video_url: e.target.value })}
                    placeholder="Ex: dQw4w9WgXcQ"
                    className="input-modern"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Texto do Botão</Label>
                  <Input
                    value={editForm.button_text || ''}
                    onChange={(e) => setEditForm({ ...editForm, button_text: e.target.value })}
                    className="input-modern"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Link do Botão</Label>
                  <Input
                    value={editForm.button_link || ''}
                    onChange={(e) => setEditForm({ ...editForm, button_link: e.target.value })}
                    className="input-modern"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Benefícios (um por linha)</Label>
                  <Textarea
                    value={(editForm.features || []).join('\n')}
                    onChange={(e) => setEditForm({ ...editForm, features: e.target.value.split('\n').filter(Boolean) })}
                    className="input-modern"
                    rows={4}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => saveEdit(offer)} disabled={saving} className="flex-1">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Salvar
                  </Button>
                  <Button onClick={cancelEditing} variant="outline">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="glass-card p-5 border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl gradient-primary shrink-0">
                    <GraduationCap className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                          Oferta Especial
                        </span>
                        <h3 className="font-bold text-foreground text-lg mt-1">
                          {offer.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-2">
                          {offer.description}
                        </p>
                      </div>
                      {isAdmin && (
                        <Button onClick={() => startEditing(offer)} variant="ghost" size="sm">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="mt-4 space-y-3">
                      {offer.content_data?.video_url && (
                        <div className="aspect-video bg-muted/50 rounded-xl overflow-hidden relative">
                          <iframe
                            src={`https://www.youtube.com/embed/${offer.content_data.video_url}`}
                            title="Apresentação do Curso"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="absolute inset-0 w-full h-full"
                          />
                        </div>
                      )}
                      
                      {offer.content_data?.features && (
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {offer.content_data.features.map((feature: string, index: number) => (
                            <li key={index} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      )}

                      <Button 
                        className="w-full h-11 font-bold"
                        variant="outline"
                        onClick={() => window.open(offer.content_data?.button_link || '#', '_blank', 'noopener,noreferrer')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        {offer.content_data?.button_text || 'Conhecer o Curso'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        ))}
      </div>
    </AppLayout>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, ArrowUp, ArrowDown, Pencil, Trash2, Save, X, Loader2, Upload, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { validateImageMagicBytes, validateImageSize } from '@/lib/imageValidation';

interface Banner {
  id: string;
  image_url: string;
  link_destino: string | null;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

function compressBannerImage(dataUrl: string): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_W = 1200;
      const MAX_H = 400;
      let w = img.width;
      let h = img.height;
      if (w > MAX_W) { h = Math.round(h * MAX_W / w); w = MAX_W; }
      if (h > MAX_H) { w = Math.round(w * MAX_H / h); h = MAX_H; }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.8);
    };
    img.src = dataUrl;
  });
}

export default function AdminBanners() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ image_url: '', link_destino: '', ordem: 0, ativo: true });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!adminLoading && !isAdmin) navigate('/');
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => { loadBanners(); }, []);

  const loadBanners = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('banners')
      .select('*')
      .order('ordem', { ascending: true });
    if (data) setBanners(data as Banner[]);
    setLoading(false);
  };

  const startNew = () => {
    setEditingId('new');
    setFormData({ image_url: '', link_destino: '', ordem: banners.length + 1, ativo: true });
    setPreviewUrl(null);
  };

  const startEdit = (b: Banner) => {
    setEditingId(b.id);
    setFormData({ image_url: b.image_url, link_destino: b.link_destino || '', ordem: b.ordem, ativo: b.ativo });
    setPreviewUrl(b.image_url || null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setPreviewUrl(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!validateImageSize(file)) {
      toast.error('Imagem muito grande. Máximo 5MB.');
      return;
    }
    if (!(await validateImageMagicBytes(file))) {
      toast.error('Arquivo inválido. Use apenas JPG, PNG ou WebP.');
      return;
    }
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        const blob = await compressBannerImage(dataUrl);
        const filename = `banner_${Date.now()}.jpg`;
        const { error } = await supabase.storage.from('banners').upload(filename, blob, { contentType: 'image/jpeg', upsert: true });
        if (error) {
          toast.error('Erro no upload', { description: error.message });
          setUploading(false);
          return;
        }
        const { data: urlData } = supabase.storage.from('banners').getPublicUrl(filename);
        const url = urlData.publicUrl;
        setFormData(f => ({ ...f, image_url: url }));
        setPreviewUrl(url);
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
      toast.error('Erro no upload');
    }
  };

  const handleSave = async () => {
    if (!formData.image_url) {
      toast.error('Faça upload de uma imagem');
      return;
    }
    setSaving(true);
    if (editingId === 'new') {
      const { error } = await supabase.from('banners').insert({
        image_url: formData.image_url,
        link_destino: formData.link_destino || null,
        ordem: formData.ordem,
        ativo: formData.ativo,
      });
      if (error) toast.error('Erro ao salvar', { description: error.message });
      else toast.success('Banner criado!');
    } else {
      const { error } = await supabase.from('banners').update({
        image_url: formData.image_url,
        link_destino: formData.link_destino || null,
        ordem: formData.ordem,
        ativo: formData.ativo,
      }).eq('id', editingId!);
      if (error) toast.error('Erro ao salvar', { description: error.message });
      else toast.success('Banner atualizado!');
    }
    setSaving(false);
    setEditingId(null);
    setPreviewUrl(null);
    loadBanners();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('banners').delete().eq('id', id);
    toast.success('Banner removido');
    if (editingId === id) setEditingId(null);
    loadBanners();
  };

  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    const idx = banners.findIndex(b => b.id === id);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= banners.length) return;
    const a = banners[idx];
    const b = banners[swapIdx];
    await Promise.all([
      supabase.from('banners').update({ ordem: b.ordem }).eq('id', a.id),
      supabase.from('banners').update({ ordem: a.ordem }).eq('id', b.id),
    ]);
    loadBanners();
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-2 transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Gerenciar Banners</h1>
      </div>

      <div className="page-container-narrow px-4 py-6 space-y-4">
        {/* Add button */}
        {editingId !== 'new' && (
          <Button onClick={startNew} className="w-full gap-2">
            <Plus className="w-4 h-4" /> Novo Banner
          </Button>
        )}

        {/* Form */}
        {editingId && (
          <div className="surface-card p-4 space-y-4 rounded-xl border border-border animate-fade-up">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-foreground">{editingId === 'new' ? 'Novo Banner' : 'Editando Banner'}</p>
              <button onClick={cancelEdit}><X className="w-4 h-4 text-text-3" /></button>
            </div>

            {/* Image upload */}
            <div>
              <Label className="text-sm mb-2 block">Imagem do banner</Label>
              {previewUrl ? (
                <div className="relative rounded-xl overflow-hidden h-[120px] mb-2">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => { setPreviewUrl(null); setFormData(f => ({ ...f, image_url: '' })); }}
                    className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-full h-[120px] rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-text-3 hover:border-primary hover:text-primary transition-colors"
                >
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                  <span className="text-xs">{uploading ? 'Enviando...' : 'Clique para enviar imagem'}</span>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>

            {/* Link */}
            <div>
              <Label className="text-sm">Link destino</Label>
              <Input
                value={formData.link_destino}
                onChange={e => setFormData(f => ({ ...f, link_destino: e.target.value }))}
                placeholder="/education ou https://..."
                className="mt-1"
              />
            </div>

            {/* Ordem */}
            <div>
              <Label className="text-sm">Ordem</Label>
              <Input
                type="number"
                value={formData.ordem}
                onChange={e => setFormData(f => ({ ...f, ordem: parseInt(e.target.value) || 0 }))}
                className="mt-1 w-24"
              />
            </div>

            {/* Ativo */}
            <div className="flex items-center gap-3">
              <Switch checked={formData.ativo} onCheckedChange={v => setFormData(f => ({ ...f, ativo: v }))} />
              <Label className="text-sm">Ativo</Label>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={cancelEdit} className="flex-1">Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar banner
              </Button>
            </div>
          </div>
        )}

        {/* Banner list */}
        {banners.map((banner, idx) => (
          <div key={banner.id} className="surface-card rounded-xl border border-border overflow-hidden">
            <div className="flex items-start gap-3 p-3">
              <div className="w-20 h-[50px] rounded-lg overflow-hidden bg-surface-2 flex-shrink-0">
                {banner.image_url ? (
                  <img src={banner.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-4 h-4 text-text-3" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Banner #{idx + 1}</p>
                <p className="text-xs text-text-3">Ordem: {banner.ordem}</p>
                {banner.link_destino && <p className="text-xs text-primary truncate">{banner.link_destino}</p>}
                <span className={cn('inline-block mt-1 text-[11px] font-medium px-1.5 py-0.5 rounded-full', banner.ativo ? 'bg-success/10 text-success' : 'bg-text-3/10 text-text-3')}>
                  {banner.ativo ? '● Ativo' : '○ Inativo'}
                </span>
              </div>
            </div>
            <div className="flex border-t border-border divide-x divide-border">
              <button onClick={() => handleReorder(banner.id, 'up')} disabled={idx === 0} className="flex-1 py-2 flex items-center justify-center gap-1 text-xs text-text-2 hover:bg-surface-2 disabled:opacity-30 transition-colors">
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => handleReorder(banner.id, 'down')} disabled={idx === banners.length - 1} className="flex-1 py-2 flex items-center justify-center gap-1 text-xs text-text-2 hover:bg-surface-2 disabled:opacity-30 transition-colors">
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => startEdit(banner)} className="flex-1 py-2 flex items-center justify-center gap-1 text-xs text-text-2 hover:bg-surface-2 transition-colors">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => handleDelete(banner.id)} className="flex-1 py-2 flex items-center justify-center gap-1 text-xs text-danger hover:bg-danger/5 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}

        {banners.length === 0 && !editingId && (
          <div className="text-center py-12">
            <ImageIcon className="w-10 h-10 text-text-3 mx-auto mb-3" />
            <p className="text-sm text-text-2">Nenhum banner criado ainda</p>
          </div>
        )}
      </div>
    </div>
  );
}

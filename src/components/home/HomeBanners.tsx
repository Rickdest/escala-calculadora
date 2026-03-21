import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { cn } from '@/lib/utils';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';

interface HomeBanner {
  id: string;
  title: string;
  subtitle: string | null;
  cta_label: string | null;
  cta_url: string | null;
  bg_class: string;
  text_class: string;
  emoji: string | null;
  is_active: boolean;
  display_order: number;
}

const BG_OPTIONS = [
  { value: 'bg-primary', label: 'Laranja' },
  { value: 'bg-surface-2', label: 'Neutro' },
  { value: 'bg-success/20', label: 'Verde' },
  { value: 'bg-warning/20', label: 'Amarelo' },
  { value: 'bg-primary/10', label: 'Laranja suave' },
];

const TEXT_OPTIONS = [
  { value: 'text-primary-foreground', label: 'Branco' },
  { value: 'text-foreground', label: 'Padrão' },
];

export function HomeBanners() {
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<HomeBanner>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadBanners(); }, []);

  const loadBanners = async () => {
    const { data } = await supabase
      .from('home_banners' as any)
      .select('*')
      .eq('is_active', true)
      .order('display_order');
    if (data) setBanners(data as unknown as HomeBanner[]);
  };

  const startEdit = (banner: HomeBanner) => {
    setEditingId(banner.id);
    setEditForm({ ...banner });
  };

  const startNew = () => {
    setEditingId('new');
    setEditForm({
      title: '',
      subtitle: '',
      cta_label: '',
      cta_url: '',
      bg_class: 'bg-primary',
      text_class: 'text-primary-foreground',
      emoji: '🎯',
      is_active: true,
      display_order: banners.length + 1,
    });
  };

  const handleSave = async () => {
    if (!editForm.title?.trim()) return;
    setSaving(true);
    if (editingId === 'new') {
      await (supabase.from('home_banners' as any) as any).insert(editForm);
    } else {
      await (supabase.from('home_banners' as any) as any).update(editForm).eq('id', editingId);
    }
    setSaving(false);
    setEditingId(null);
    loadBanners();
  };

  const handleDelete = async (id: string) => {
    await (supabase.from('home_banners' as any) as any).delete().eq('id', id);
    setEditingId(null);
    loadBanners();
  };

  if (banners.length === 0 && !isAdmin) return null;

  const EditFormContent = ({ onClose }: { onClose: () => void }) => (
    <div className="surface-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="section-label">{editingId === 'new' ? 'NOVO BANNER' : 'EDITANDO BANNER'}</p>
        <button onClick={onClose} className="text-text-3 hover:text-foreground"><X className="w-4 h-4" /></button>
      </div>
      <input value={editForm.emoji || ''} onChange={e => setEditForm(p => ({ ...p, emoji: e.target.value }))} placeholder="Emoji" className="w-20 h-9 bg-surface-2 border border-border rounded-lg px-3 text-center text-lg" />
      <input value={editForm.title || ''} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} placeholder="Título *" className="w-full h-9 bg-surface-2 border border-border rounded-lg px-3 text-sm text-foreground" />
      <input value={editForm.subtitle || ''} onChange={e => setEditForm(p => ({ ...p, subtitle: e.target.value }))} placeholder="Subtítulo" className="w-full h-9 bg-surface-2 border border-border rounded-lg px-3 text-sm text-foreground" />
      <div className="grid grid-cols-2 gap-2">
        <input value={editForm.cta_label || ''} onChange={e => setEditForm(p => ({ ...p, cta_label: e.target.value }))} placeholder="Label do botão" className="h-9 bg-surface-2 border border-border rounded-lg px-3 text-sm text-foreground" />
        <input value={editForm.cta_url || ''} onChange={e => setEditForm(p => ({ ...p, cta_url: e.target.value }))} placeholder="URL (ex: /roas)" className="h-9 bg-surface-2 border border-border rounded-lg px-3 text-sm text-foreground" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select value={editForm.bg_class || ''} onChange={e => setEditForm(p => ({ ...p, bg_class: e.target.value }))} className="h-9 bg-surface-2 border border-border rounded-lg px-3 text-sm text-foreground">
          {BG_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={editForm.text_class || ''} onChange={e => setEditForm(p => ({ ...p, text_class: e.target.value }))} className="h-9 bg-surface-2 border border-border rounded-lg px-3 text-sm text-foreground">
          {TEXT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving} className="h-9 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-semibold flex items-center gap-1 disabled:opacity-50">
          <Save className="w-3.5 h-3.5" />
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
        {editingId !== 'new' && (
          <button onClick={() => handleDelete(editingId!)} className="h-9 px-3 bg-danger/10 text-danger rounded-lg text-sm font-semibold flex items-center gap-1">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-3 animate-fade-up">
      {/* Banner cards - horizontal scroll on mobile */}
      <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-hide md:grid md:grid-cols-2 md:overflow-visible md:pb-0">
        {banners.map(banner => (
          <div key={banner.id} className="flex-shrink-0 w-[82vw] md:w-auto snap-start">
            {editingId === banner.id ? (
              <EditFormContent onClose={() => setEditingId(null)} />
            ) : (
              <div
                onClick={() => banner.cta_url && navigate(banner.cta_url)}
                className={cn(
                  'rounded-xl p-5 relative overflow-hidden cursor-pointer transition-all active:scale-[0.98] hover:opacity-95',
                  banner.bg_class,
                  banner.bg_class === 'bg-surface-2' && 'border border-border'
                )}
              >
                {banner.emoji && (
                  <span className="absolute top-3 right-4 text-3xl opacity-20 pointer-events-none">
                    {banner.emoji}
                  </span>
                )}
                <div className={cn('relative z-10', banner.text_class)}>
                  <p className="text-[15px] font-bold leading-snug">{banner.title}</p>
                  {banner.subtitle && (
                    <p className="text-[12px] mt-1 opacity-80 leading-snug">{banner.subtitle}</p>
                  )}
                  {banner.cta_label && (
                    <span className="inline-block mt-3 text-[12px] font-bold opacity-90">
                      {banner.cta_label}
                    </span>
                  )}
                </div>
                {isAdmin && (
                  <button
                    onClick={(e) => { e.stopPropagation(); startEdit(banner); }}
                    className="absolute top-2 right-2 w-6 h-6 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center transition-colors z-20"
                  >
                    <Edit2 className="w-3 h-3 text-white" />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Admin: new banner button */}
        {isAdmin && editingId !== 'new' && (
          <button onClick={startNew} className="flex-shrink-0 w-[82vw] md:w-auto snap-start surface-card rounded-xl border-2 border-dashed border-border flex items-center justify-center gap-2 text-text-2 text-sm font-medium min-h-[100px] hover:border-primary hover:text-primary transition-colors">
            <Plus className="w-4 h-4" /> Novo Banner
          </button>
        )}
      </div>

      {/* New banner form */}
      {editingId === 'new' && <EditFormContent onClose={() => setEditingId(null)} />}
    </div>
  );
}

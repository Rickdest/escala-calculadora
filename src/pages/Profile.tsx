import { useState, useEffect, useRef } from 'react';
import { User, Camera, Mail, Lock, Save, Loader2, Check, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setDisplayName(data.display_name || '');
      setAvatarUrl(data.avatar_url || '');
    }
    setLoading(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: signedData, error: signError } = await supabase.storage
        .from('avatars')
        .createSignedUrl(fileName, 3600);

      if (signError || !signedData?.signedUrl) throw signError || new Error('Failed to get signed URL');

      const newAvatarUrl = signedData.signedUrl;
      setAvatarUrl(newAvatarUrl);

      // Update profile with new avatar URL
      await supabase
        .from('profiles')
        .update({ avatar_url: fileName })
        .eq('user_id', user.id);

      toast({
        title: 'Foto atualizada!',
        description: 'Sua foto de perfil foi atualizada com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar foto',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Perfil atualizado!',
        description: 'Suas informações foram salvas com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Senhas não conferem',
        description: 'Digite a mesma senha nos dois campos.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha deve ter pelo menos 6 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    setSavingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: 'Senha alterada!',
        description: 'Sua senha foi atualizada com sucesso.',
      });

      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({
        title: 'Erro ao alterar senha',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  if (!user) {
    return (
      <AppLayout>
        <PageHeader title="Perfil" showStoreSelector={false} />
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
          <p className="text-muted-foreground">Faça login para ver seu perfil</p>
        </div>
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout>
        <PageHeader title="Perfil" showStoreSelector={false} />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title="Perfil" showStoreSelector={false} />

      <div className="px-4 py-6 space-y-6">
        {/* Avatar Section */}
        <div className="flex flex-col items-center animate-fade-up">
          <div className="relative">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="relative group"
              disabled={uploadingAvatar}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-28 h-28 rounded-full object-cover ring-4 ring-primary/20 group-hover:ring-primary/40 transition-all"
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-secondary flex items-center justify-center ring-4 ring-border group-hover:ring-primary/40 transition-all">
                  <User className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
              <div className="absolute inset-0 bg-foreground/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {uploadingAvatar ? (
                  <Loader2 className="w-8 h-8 text-background animate-spin" />
                ) : (
                  <Camera className="w-8 h-8 text-background" />
                )}
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
          <p className="text-sm text-muted-foreground mt-3">Toque para alterar a foto</p>
        </div>

        {/* Profile Info */}
        <div className="glass-card p-5 space-y-4 animate-fade-up stagger-1">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Informações do Perfil
          </h3>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-sm font-semibold">Nome de Exibição</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Seu nome"
                className="input-modern h-12"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Email</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={user.email || ''}
                  disabled
                  className="pl-11 h-12 bg-secondary/50 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-muted-foreground">O email não pode ser alterado</p>
            </div>
          </div>

          <Button
            onClick={handleSaveProfile}
            disabled={saving}
            className="w-full h-12 gradient-primary"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Salvar Perfil
              </>
            )}
          </Button>
        </div>

        {/* Subscription Status */}
        <SubscriptionSection />

        {/* Change Password */}
        <div className="glass-card p-5 space-y-4 animate-fade-up stagger-2">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            Alterar Senha
          </h3>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-sm font-semibold">Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-11 pr-11 h-12 input-modern"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-semibold">Confirmar Senha</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-11 h-12 input-modern"
                  minLength={6}
                />
              </div>
            </div>
          </div>

          <Button
            onClick={handleChangePassword}
            disabled={savingPassword || !newPassword || !confirmPassword}
            variant="outline"
            className="w-full h-12"
          >
            {savingPassword ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Alterando...
              </>
            ) : (
              <>
                <Check className="w-5 h-5 mr-2" />
                Alterar Senha
              </>
            )}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}

const CHECKOUT_URL = import.meta.env.VITE_HOTMART_URL || 'https://pay.hotmart.com/B104846948H?off=au88x8b1&checkoutMode=6';

function SubscriptionSection() {
  const { status, trialEnd, isActive } = useSubscription();
  const { user } = useAuth();

  const handleCheckout = () => {
    const url = new URL(CHECKOUT_URL);
    if (user?.email) url.searchParams.set('email', user.email);
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
  };

  let statusText = '';
  let statusEmoji = '';
  let showButton = false;
  let buttonText = '';

  if (status === 'trialing' && trialEnd) {
    const daysLeft = Math.max(0, Math.ceil((new Date(trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    statusEmoji = '⏳';
    statusText = `Teste gratuito — ${daysLeft} ${daysLeft === 1 ? 'dia restante' : 'dias restantes'}`;
    showButton = true;
    buttonText = 'Garantir plano anual · R$49,90';
  } else if (status === 'active') {
    statusEmoji = '✅';
    statusText = 'Plano ativo';
  } else if (status === 'canceled' || status === 'past_due') {
    statusEmoji = '❌';
    statusText = 'Acesso expirado';
    showButton = true;
    buttonText = 'Renovar acesso · R$49,90/ano';
  }

  if (!statusText) return null;

  return (
    <div className="glass-card p-5 space-y-3 animate-fade-up stagger-1">
      <h3 className="font-bold text-foreground text-sm">Assinatura</h3>
      <div className="flex items-center gap-2">
        <span className="text-sm">{statusEmoji}</span>
        <span className="text-sm text-foreground">{statusText}</span>
      </div>
      {status === 'active' && (
        <p className="text-xs text-muted-foreground">Acesso completo ao Precify</p>
      )}
      {showButton && (
        <button
          onClick={handleCheckout}
          className="w-full h-12 rounded-xl bg-[#F97316] hover:bg-[#ea6c10] text-white font-bold text-sm transition-colors active:scale-[0.98]"
        >
          {buttonText}
        </button>
      )}
    </div>
  );
}

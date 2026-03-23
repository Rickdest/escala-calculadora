import { useState, useEffect } from 'react';
import { User, Mail, Lock, Save, Loader2, Check, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { openCheckout } from '@/services/checkout.service';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { UserAvatar } from '@/components/UserAvatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function Profile() {
  const { user } = useAuth();
  

  const [displayName, setDisplayName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setDisplayName(data.display_name || '');
    }
    setLoading(false);
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

      toast.success('Perfil atualizado!', { description: 'Suas informações foram salvas com sucesso.' });
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

      <div className="py-6 md:py-8 space-y-6">
        {/* Avatar Section */}
        <div className="flex flex-col items-center animate-fade-up">
          <UserAvatar displayName={displayName} email={user.email} size="lg" />
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

function SubscriptionSection() {
  const { status, trialEnd, isActive } = useSubscription();
  const { user } = useAuth();

  const handleCheckout = () => openCheckout(user?.email || undefined);

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

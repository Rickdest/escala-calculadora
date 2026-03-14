import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { lovable } from '@/integrations/lovable/index';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) {
        toast({
          title: 'Erro ao entrar com Google',
          description: String(error),
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao entrar com Google',
        description: err?.message || 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent, isLogin: boolean) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: 'Erro ao entrar',
            description: error.message === 'Invalid login credentials'
              ? 'Email ou senha incorretos'
              : error.message,
            variant: 'destructive',
          });
        } else {
          navigate('/');
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          toast({
            title: 'Erro ao criar conta',
            description: error.message,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Conta criada!',
            description: 'Verifique seu email para confirmar o cadastro.',
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const GoogleButton = () => (
    <button
      type="button"
      onClick={handleGoogleLogin}
      disabled={googleLoading}
      className="w-full h-12 flex items-center justify-center gap-3 bg-card text-foreground font-medium border border-border hover:bg-muted transition-colors disabled:opacity-50 rounded-xl"
    >
      {googleLoading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <>
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continuar com Google
        </>
      )}
    </button>
  );


  const EmailPasswordFields = ({ isLogin }: { isLogin: boolean }) => (
    <form onSubmit={(e) => handleSubmit(e, isLogin)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`email-${isLogin}`} className="text-sm font-semibold">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            id={`email-${isLogin}`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="pl-11 h-12 input-modern"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`password-${isLogin}`} className="text-sm font-semibold">Senha</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            id={`password-${isLogin}`}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="pl-11 pr-11 h-12 input-modern"
            required
            minLength={6}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <Button
        type="submit"
        variant="outline"
        className="w-full h-12 text-base font-semibold"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            {isLogin ? 'Entrando...' : 'Criando conta...'}
          </>
        ) : (
          isLogin ? 'Entrar' : 'Criar conta e começar grátis'
        )}
      </Button>
    </form>
  );

  const Divider = ({ text }: { text: string }) => (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground">{text}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background gradient-mesh flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <h1 className="text-5xl font-extrabold text-gradient tracking-tight">Precify</h1>
          <p className="text-base text-muted-foreground">
            Precificação Inteligente para Shopee
          </p>
          <span className="inline-block text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
            3 dias grátis · Sem cartão
          </span>
        </div>

        {/* Card with Tabs */}
        <div className="glass-card p-6 space-y-0">
          <Tabs defaultValue="signup" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 h-11 rounded-xl">
              <TabsTrigger value="signup" className="rounded-lg text-sm font-semibold">Criar conta</TabsTrigger>
              <TabsTrigger value="login" className="rounded-lg text-sm font-semibold">Já tenho conta</TabsTrigger>
            </TabsList>

            <TabsContent value="signup" className="space-y-0">
              <EmailPasswordFields isLogin={false} />
              <Divider text="ou" />
              <GoogleButton />
            </TabsContent>

            <TabsContent value="login" className="space-y-0">
              <EmailPasswordFields isLogin={true} />
              <Divider text="ou" />
              <GoogleButton />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

function traduzirErro(mensagem: string): string {
  if (mensagem.includes('already registered') || mensagem.includes('User already registered'))
    return 'Este email já está cadastrado. Faça login.';
  if (mensagem.includes('Invalid login credentials') || mensagem.includes('invalid_credentials'))
    return 'Email ou senha incorretos.';
  if (mensagem.includes('Email not confirmed'))
    return 'Confirme seu email antes de entrar.';
  if (mensagem.includes('Password should be'))
    return 'Senha deve ter no mínimo 8 caracteres.';
  if (mensagem.includes('after') && mensagem.includes('seconds'))
    return 'Aguarde alguns segundos antes de tentar novamente.';
  if (mensagem.includes('rate limit') || mensagem.includes('too many requests'))
    return 'Muitas tentativas. Aguarde um momento.';
  if (mensagem.includes('network') || mensagem.includes('fetch'))
    return 'Erro de conexão. Verifique sua internet.';
  return 'Erro ao processar. Tente novamente.';
}

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'signup' | 'login'>('signup');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage('');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) {
        setErrorMessage(traduzirErro(String(error)));
      }
    } catch (err: any) {
      setErrorMessage(traduzirErro(err?.message || 'network'));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent, isLogin: boolean) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          const msg = traduzirErro(error.message);
          setErrorMessage(msg);
          toast.error(msg, { duration: 4000 });
        } else {
          navigate('/');
        }
      } else {
        const { error, data } = await signUp(email, password);
        if (error) {
          if (error.message.includes('already registered') || error.message.includes('User already registered')) {
            setErrorMessage(traduzirErro(error.message));
            setActiveTab('login');
          } else {
            setErrorMessage(traduzirErro(error.message));
          }
        } else if (data?.user?.identities?.length === 0) {
          setErrorMessage('Este email já está cadastrado. Faça login.');
          setActiveTab('login');
        } else {
          toast.success('Conta criada!', { description: 'Verifique seu email para confirmar o cadastro.' });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const isLogin = activeTab === 'login';

  return (
    <div className="min-h-screen bg-[#0D0F17] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-5">
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <h1 className="text-5xl font-extrabold text-[#F97316] tracking-tight font-sans">Precify</h1>
          <p className="text-[14px] font-normal text-[#8B92A5]">
            Precificação Inteligente para Shopee
          </p>
          <span className="inline-block text-[12px] font-medium text-[#F97316] border border-[#F97316] bg-transparent px-3 py-1 rounded-[20px]">
            3 dias grátis · Sem cartão
          </span>
        </div>

        {/* Inline error banner */}
        {errorMessage && (
          <div className="bg-[#EF4444] text-white text-[13px] px-4 py-2.5 rounded-lg h-11 flex items-center justify-center text-center">
            {errorMessage}
          </div>
        )}

        {/* Card */}
        <div className="bg-[#13161F] border border-[#1F2433] rounded-[14px] p-5">
          {/* Tabs */}
          <div className="bg-[#13161F] rounded-[10px] p-1 flex mb-5">
            <button
              type="button"
              onClick={() => setActiveTab('signup')}
              className={`flex-1 text-[13px] py-2 rounded-[8px] transition-all duration-150 ${
                activeTab === 'signup'
                  ? 'bg-[#1A1D27] border border-[#1F2433] text-[#F0F2F7] font-semibold'
                  : 'bg-transparent border border-transparent text-[#4A5068] font-normal'
              }`}
            >
              Criar conta
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('login')}
              className={`flex-1 text-[13px] py-2 rounded-[8px] transition-all duration-150 ${
                activeTab === 'login'
                  ? 'bg-[#1A1D27] border border-[#1F2433] text-[#F0F2F7] font-semibold'
                  : 'bg-transparent border border-transparent text-[#4A5068] font-normal'
              }`}
            >
              Já tenho conta
            </button>
          </div>

          {/* Form */}
          <form onSubmit={(e) => handleSubmit(e, isLogin)} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block uppercase text-[11px] tracking-[0.08em] font-medium text-[#8B92A5] mb-1.5">
                Email
              </label>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrorMessage(''); }}
                placeholder="seu@email.com"
                className="w-full h-12 bg-[#1A1D27] border border-[#1F2433] rounded-[8px] px-3 text-[15px] text-[#F0F2F7] placeholder:text-[#4A5068] focus:outline-none focus:border-[#F97316] transition-colors"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block uppercase text-[11px] tracking-[0.08em] font-medium text-[#8B92A5] mb-1.5">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="mínimo 8 caracteres"
                  className="w-full h-12 bg-[#1A1D27] border border-[#1F2433] rounded-[8px] px-3 pr-11 text-[15px] text-[#F0F2F7] placeholder:text-[#4A5068] focus:outline-none focus:border-[#F97316] transition-colors"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A5068] hover:text-[#8B92A5] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
            </div>

            {/* Terms checkbox - signup only */}
            {!isLogin && (
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-[#1F2433] bg-[#1A1D27] accent-[#F97316] cursor-pointer"
                />
                <span className="text-[12px] text-[#8B92A5] leading-tight">
                  Li e aceito os{' '}
                  <a href="#" className="text-[#F97316] underline">Termos de Uso</a>{' '}
                  e a{' '}
                  <a href="#" className="text-[#F97316] underline">Política de Privacidade</a>
                </span>
              </label>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading || (!isLogin && !acceptedTerms)}
              className="w-full h-12 text-[15px] font-semibold bg-[#F97316] hover:bg-[#EA6C0A] text-white rounded-[10px] active:scale-[0.98] transition-all"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{isLogin ? 'Entrando...' : 'Criando conta...'}</>
              ) : (
                isLogin ? 'Entrar' : 'Criar conta e começar grátis'
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[#1F2433]" />
            <span className="text-[12px] text-[#4A5068]">ou</span>
            <div className="flex-1 h-px bg-[#1F2433]" />
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full h-12 flex items-center justify-center gap-3 bg-[#13161F] border border-[#1F2433] rounded-[10px] hover:bg-[#1A1D27] transition-colors disabled:opacity-50"
          >
            {googleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#F0F2F7]" />
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span className="text-[14px] font-medium text-[#F0F2F7]">Continuar com Google</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
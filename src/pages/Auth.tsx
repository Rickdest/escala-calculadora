import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Eye, EyeOff, TrendingUp, Target, Zap, BarChart3 } from 'lucide-react';
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

const featurePills = [
  { icon: TrendingUp, label: 'Margem real' },
  { icon: Target, label: 'ROAS ideal' },
  { icon: Zap, label: 'Taxas auto' },
  { icon: BarChart3, label: 'Multi-canal' },
];

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
      const timer = setTimeout(() => setErrorMessage(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) setErrorMessage(traduzirErro(String(error)));
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
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#0D1117' }}>
      <div className="w-full max-w-sm space-y-5">
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <h1 className="text-[28px] font-bold tracking-tight" style={{ color: '#ffffff' }}>
            Skalify
          </h1>
          <p className="text-[13px] leading-relaxed" style={{ color: '#888888' }}>
            Calcule margem, ROAS e taxas de marketplace em segundos
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {featurePills.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid #252525',
                  color: '#cccccc',
                }}
              >
                <Icon className="w-3 h-3" style={{ color: '#e85d00' }} />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Error banner */}
        {errorMessage && (
          <div className="text-white text-[13px] px-4 py-2.5 rounded-lg h-11 flex items-center justify-center text-center" style={{ background: '#EF4444' }}>
            {errorMessage}
          </div>
        )}

        {/* Card */}
        <div className="p-5" style={{ background: '#111111', border: '1px solid #252525', borderRadius: '16px' }}>
          {/* Tabs */}
          <div className="flex p-1 rounded-lg mb-5" style={{ background: '#0D1117' }}>
            <button
              type="button"
              onClick={() => setActiveTab('signup')}
              className="flex-1 text-[13px] py-2 rounded-md transition-all duration-150"
              style={{
                background: activeTab === 'signup' ? '#1a1a1a' : 'transparent',
                color: activeTab === 'signup' ? '#ffffff' : '#555555',
                fontWeight: activeTab === 'signup' ? 700 : 400,
              }}
            >
              Criar conta
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('login')}
              className="flex-1 text-[13px] py-2 rounded-md transition-all duration-150"
              style={{
                background: activeTab === 'login' ? '#1a1a1a' : 'transparent',
                color: activeTab === 'login' ? '#ffffff' : '#555555',
                fontWeight: activeTab === 'login' ? 700 : 400,
              }}
            >
              Entrar
            </button>
          </div>

          {/* Form */}
          <form onSubmit={(e) => handleSubmit(e, isLogin)} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block uppercase text-[11px] tracking-[0.08em] font-medium mb-1.5" style={{ color: '#888888' }}>
                Email
              </label>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrorMessage(''); }}
                placeholder="seu@email.com"
                className="w-full h-12 rounded-lg px-3 text-[15px] focus:outline-none transition-colors"
                style={{
                  background: '#1a1a1a',
                  border: '1px solid #252525',
                  color: '#dddddd',
                }}
                onFocus={(e) => e.target.style.borderColor = '#e85d00'}
                onBlur={(e) => e.target.style.borderColor = '#252525'}
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block uppercase text-[11px] tracking-[0.08em] font-medium mb-1.5" style={{ color: '#888888' }}>
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="mínimo 8 caracteres"
                  className="w-full h-12 rounded-lg px-3 pr-11 text-[15px] focus:outline-none transition-colors"
                  style={{
                    background: '#1a1a1a',
                    border: '1px solid #252525',
                    color: '#dddddd',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#e85d00'}
                  onBlur={(e) => e.target.style.borderColor = '#252525'}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: '#555555' }}
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
                  className="mt-0.5 w-4 h-4 rounded cursor-pointer"
                  style={{ accentColor: '#e85d00', background: '#1a1a1a', borderColor: '#252525' }}
                />
                <span className="text-[12px] leading-tight" style={{ color: '#888888' }}>
                  Li e aceito os{' '}
                  <a href="#" style={{ color: '#e85d00' }} className="underline">Termos de Uso</a>{' '}
                  e a{' '}
                  <a href="#" style={{ color: '#e85d00' }} className="underline">Política de Privacidade</a>
                </span>
              </label>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || (!isLogin && !acceptedTerms)}
              className="w-full h-12 text-[15px] font-bold text-white rounded-xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
              style={{ background: '#e85d00' }}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />{isLogin ? 'Entrando...' : 'Criando conta...'}</>
              ) : (
                <>{isLogin ? 'Entrar' : 'Criar conta gratuita'} →</>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: '#252525' }} />
            <span className="text-[12px]" style={{ color: '#555555' }}>ou</span>
            <div className="flex-1 h-px" style={{ background: '#252525' }} />
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full h-12 flex items-center justify-center gap-3 rounded-xl transition-colors disabled:opacity-50"
            style={{ background: '#0D1117', border: '1px solid #252525' }}
          >
            {googleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#dddddd' }} />
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span className="text-[14px] font-medium" style={{ color: '#dddddd' }}>Continuar com Google</span>
              </>
            )}
          </button>
        </div>

        {/* Social proof */}
        <div className="flex items-center justify-center gap-2 pt-1">
          <div className="flex -space-x-2">
            {['#e85d00', '#3b82f6', '#22c55e'].map((color, i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-full"
                style={{ background: color, border: '2px solid #0D1117', zIndex: 3 - i }}
              />
            ))}
          </div>
          <span className="text-[12px]" style={{ color: '#666666' }}>
            +200 vendedores já usam o Precify
          </span>
        </div>
      </div>
    </div>
  );
}

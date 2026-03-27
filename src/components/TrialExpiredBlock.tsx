import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBilling } from '@/hooks/useBilling';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import logoIcon from '@/assets/logo-icon.png';

const benefits = [
  { icon: '💰', text: 'Lucro real por produto' },
  { icon: '📊', text: 'ROAS ideal para seus ads' },
  { icon: '🏷️', text: 'Taxas automáticas' },
  { icon: '📚', text: 'Conteúdo exclusivo' },
];

export function TrialExpiredBlock() {
  const { handleCheckout, refreshSubscription, isActive } = useBilling();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  const handleVerifyAccess = async () => {
    setChecking(true);
    try {
      await refreshSubscription();
      setTimeout(() => {
        setChecking(false);
      }, 500);
    } catch {
      setChecking(false);
      toast.error('Erro ao verificar assinatura. Tente novamente.');
    }
  };

  useEffect(() => {
    if (isActive && !checking) {
      navigate('/', { replace: true });
    }
  }, [isActive, checking, navigate]);

  if (isActive && !checking) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-5 py-8">
      <div className="w-full max-w-sm" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Logo */}
        <div className="flex justify-center">
          <img src={logoIcon} alt="Precify" className="w-10 h-10 rounded-xl" />
        </div>

        {/* Headline */}
        <div className="text-center space-y-2">
          <h1 className="text-foreground font-bold leading-tight" style={{ fontSize: '24px' }}>
            Assine o Precify
          </h1>
          <p className="text-muted-foreground leading-relaxed" style={{ fontSize: '14px' }}>
            Para acessar todas as ferramentas de precificação, análise de Ads e gestão da sua loja, assine agora.
          </p>
        </div>

        {/* Benefits grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {benefits.map((b) => (
            <div
              key={b.text}
              className="rounded-[10px] border border-border bg-[hsl(var(--surface-2,228_15%_13%))] p-3 flex items-start gap-2"
            >
              <span style={{ fontSize: '20px', lineHeight: '1' }}>{b.icon}</span>
              <span className="text-foreground/90" style={{ fontSize: '13px', lineHeight: '1.3' }}>{b.text}</span>
            </div>
          ))}
          <div className="col-span-2 rounded-[10px] border border-border bg-[hsl(var(--surface-2,228_15%_13%))] p-3 flex items-center justify-center gap-2">
            <span style={{ fontSize: '20px', lineHeight: '1' }}>📦</span>
            <span className="text-foreground/90" style={{ fontSize: '13px' }}>Controle de estoque (bônus)</span>
          </div>
        </div>

        {/* Price */}
        <div className="text-center space-y-1.5">
          <span
            className="inline-block rounded-full bg-primary/15 text-primary font-semibold px-3 py-1"
            style={{ fontSize: '12px' }}
          >
            Oferta de lançamento
          </span>
          <p className="text-foreground font-bold font-mono" style={{ fontSize: '36px', lineHeight: '1.1' }}>
            R$ 49,90 <span className="text-muted-foreground font-normal" style={{ fontSize: '16px' }}>/ano</span>
          </p>
          <p className="text-muted-foreground/60" style={{ fontSize: '13px' }}>
            menos de R$ 4,16 por mês
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={handleCheckout}
          className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold transition-colors active:scale-[0.98]"
          style={{ height: '56px', fontSize: '17px', borderRadius: '12px' }}
        >
          ⚡ Assinar agora
        </button>

        {/* Microcopy */}
        <p className="text-center text-muted-foreground/60" style={{ fontSize: '13px' }}>
          🔒 Pagamento seguro via Cakto
        </p>

        {/* Secondary buttons */}
        <div className="flex flex-col items-center">
          <button
            onClick={handleVerifyAccess}
            disabled={checking}
            className="text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors disabled:opacity-50 flex items-center gap-2"
            style={{ fontSize: '13px' }}
          >
            {checking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verificando...
              </>
            ) : (
              'Já assinei → Verificar acesso'
            )}
          </button>

          <button
            onClick={async () => {
              await signOut();
              navigate('/auth', { replace: true });
            }}
            className="text-muted-foreground/60 hover:text-foreground transition-colors"
            style={{ fontSize: '13px', paddingTop: '8px' }}
          >
            Sair da conta
          </button>
        </div>
      </div>
    </div>
  );
}

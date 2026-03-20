import { useState } from 'react';
import { Lock, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBilling } from '@/hooks/useBilling';
import { toast } from 'sonner';
import logoIcon from '@/assets/logo-icon.png';

const benefits = [
  'Cálculo automático de todas as taxas da Shopee',
  'Lucro real por produto',
  'ROAS de empate, saudável e ideal',
  'Histórico de produtos salvos',
  'Compartilhar resultados',
  'Conteúdo educacional exclusivo',
  'Controle de estoque (bônus)',
];

export function TrialExpiredBlock() {
  const { handleCheckout, refreshSubscription, isActive } = useBilling();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  const handleVerifyAccess = async () => {
    setChecking(true);
    try {
      await refreshSubscription();
      // We need a small delay to let state propagate
      setTimeout(() => {
        // Re-check after refresh — isActive won't update in this closure,
        // so we rely on the context re-render to redirect via the parent gate.
        // If still on this screen after refresh, show error toast.
        setChecking(false);
      }, 500);
    } catch {
      setChecking(false);
      toast.error('Erro ao verificar assinatura. Tente novamente.');
    }
  };

  // If subscription became active after refresh, redirect
  if (isActive && !checking) {
    navigate('/', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <img src={logoIcon} alt="Precify" className="w-10 h-10 rounded-xl opacity-60" />
          <div className="w-12 h-12 rounded-full border border-border/50 flex items-center justify-center">
            <Lock className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Seu teste gratuito encerrou</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Continue tendo acesso a tudo que o Precify oferece.
          </p>
        </div>

        <div className="rounded-xl border border-border/40 bg-card/50 p-5 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground tracking-wide text-center">
            O que você tem acesso
          </p>
          <div className="space-y-2.5">
            {benefits.map((b) => (
              <div key={b} className="flex items-start gap-2.5">
                <ArrowRight className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" strokeWidth={2} />
                <span className="text-sm text-foreground/80 leading-snug">{b}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center space-y-1">
          <p className="text-3xl font-bold text-foreground">
            R$ 49,90 <span className="text-base font-normal text-muted-foreground">/ano</span>
          </p>
          <p className="text-sm text-muted-foreground">menos de R$ 4,16 por mês</p>
        </div>

        <button
          onClick={handleCheckout}
          className="w-full h-14 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[17px] transition-colors active:scale-[0.98]"
        >
          ⚡ Quero acesso completo
        </button>

        <p className="text-center text-xs text-muted-foreground">
          🔒 Pagamento seguro · Cancele quando quiser
        </p>

        <button
          onClick={handleVerifyAccess}
          disabled={checking}
          className="w-full text-center text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
      </div>
    </div>
  );
}

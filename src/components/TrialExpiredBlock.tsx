import { Lock, RefreshCw, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import logoIcon from '@/assets/logo-icon.png';

const CHECKOUT_URL = import.meta.env.VITE_HOTMART_URL || 'https://pay.hotmart.com/B104846948H?off=au88x8b1&checkoutMode=6';

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
  const { user } = useAuth();
  const { refreshSubscription } = useSubscription();

  const handleCheckout = () => {
    const url = new URL(CHECKOUT_URL);
    if (user?.email) url.searchParams.set('email', user.email);
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo + Lock */}
        <div className="flex flex-col items-center gap-3">
          <img src={logoIcon} alt="Precify" className="w-10 h-10 rounded-xl opacity-60" />
          <div className="w-12 h-12 rounded-full border border-border/50 flex items-center justify-center">
            <Lock className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
          </div>
        </div>

        {/* Headline */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Seu teste gratuito encerrou</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Continue tendo acesso a tudo que o Precify oferece.
          </p>
        </div>

        {/* Benefits */}
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

        {/* Price */}
        <div className="text-center space-y-1">
          <p className="text-3xl font-bold text-foreground">
            R$ 49,90 <span className="text-base font-normal text-muted-foreground">/ano</span>
          </p>
          <p className="text-sm text-muted-foreground">menos de R$ 4,16 por mês</p>
        </div>

        {/* CTA */}
        <button
          onClick={handleCheckout}
          className="w-full h-14 rounded-xl bg-[#F97316] hover:bg-[#ea6c10] text-white font-bold text-[17px] transition-colors active:scale-[0.98]"
        >
          ⚡ Quero acesso completo
        </button>

        <p className="text-center text-xs text-muted-foreground">
          🔒 Pagamento seguro · Cancele quando quiser
        </p>

        {/* Secondary */}
        <button
          onClick={refreshSubscription}
          className="w-full text-center text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
        >
          Já assinei → Verificar acesso
        </button>
      </div>
    </div>
  );
}

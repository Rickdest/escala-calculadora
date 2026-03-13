import { useState, useEffect } from 'react';
import { X, Crown } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import logoIcon from '@/assets/logo-icon.png';

const CHECKOUT_URLS: Record<string, string> = {
  mensal: 'https://pay.hotmart.com/B104846948H?off=kc5jdg0u&checkoutMode=6',
  anual: 'https://pay.hotmart.com/B104846948H?off=au88x8b1&checkoutMode=6',
};

const LAST_OFFER_KEY = 'precify-last-offer-date';

export function DailyOfferModal() {
  const { status, isActive } = useSubscription();
  const { user } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only show for trial users, not active subscribers
    if (status !== 'trialing') return;

    const today = new Date().toDateString();
    const lastShown = localStorage.getItem(LAST_OFFER_KEY);
    if (lastShown === today) return;

    const timer = setTimeout(() => {
      setShow(true);
      localStorage.setItem(LAST_OFFER_KEY, today);
    }, 30000); // 30 seconds

    return () => clearTimeout(timer);
  }, [status]);

  if (!show) return null;

  const handleCheckout = (planKey: string) => {
    const url = new URL(CHECKOUT_URLS[planKey]);
    if (user?.email) url.searchParams.set('email', user.email);
    window.open(url.toString(), '_blank');
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShow(false)} />
      <div className="relative bg-card w-full max-w-sm mx-4 rounded-3xl p-6 space-y-5 animate-scale-up max-h-[90vh] overflow-y-auto">
        <button
          onClick={() => setShow(false)}
          className="absolute top-4 right-4 p-2 rounded-xl hover:bg-secondary transition-colors"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Logo */}
        <div className="flex justify-center pt-2">
          <img src={logoIcon} alt="Precify" className="w-14 h-14 rounded-2xl" />
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-foreground">🔥 Aproveite enquanto está no teste!</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Você está usando o Precify grátis. Garanta seu acesso completo antes de expirar e continue precificando sem limites.
          </p>
        </div>

        {/* Plans */}
        <div className="space-y-3">
          {/* Annual - highlighted */}
          <div className="relative">
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 text-[10px] font-bold bg-primary text-primary-foreground rounded-full shadow-sm z-10 whitespace-nowrap">
              🔥 MAIS POPULAR
            </span>
            <button
              onClick={() => handleCheckout('anual')}
              className="w-full min-h-[56px] rounded-xl font-bold text-lg text-white active:scale-[0.98] transition-transform animate-gradient-flow border-2 border-primary/50"
              style={{
                background: 'linear-gradient(135deg, #F97316, #EA580C, #F59E0B, #F97316)',
                backgroundSize: '200% 200%',
                boxShadow: '0 0 20px rgba(249, 115, 22, 0.3)',
              }}
            >
              ⚡ Garantir plano anual com desconto
            </button>
            <p className="text-center text-xs text-muted-foreground mt-1">
              R$ 8,08/mês — cobrado anualmente · <span className="font-bold text-primary">ECONOMIZE 59%</span>
            </p>
          </div>

          {/* Monthly */}
          <button
            onClick={() => handleCheckout('mensal')}
            className="w-full min-h-[48px] rounded-xl font-semibold text-sm text-foreground border border-border hover:bg-secondary/50 active:scale-[0.98] transition-all"
          >
            Assinar plano mensal — R$ 19,90/mês
          </button>
        </div>

        <div className="text-center space-y-1">
          <p className="text-[10px] text-muted-foreground">🔒 Pagamento 100% seguro via Hotmart · Cancele quando quiser</p>
          <button
            onClick={() => setShow(false)}
            className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
          >
            Fechar e continuar testando
          </button>
        </div>
      </div>
    </div>
  );
}

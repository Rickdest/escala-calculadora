import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';

const CHECKOUT_URL = import.meta.env.VITE_HOTMART_URL || 'https://pay.hotmart.com/B104846948H?off=au88x8b1&checkoutMode=6';
const LAST_OFFER_KEY = 'precify-last-offer-date';

export function DailyOfferModal() {
  const { status } = useSubscription();
  const { user } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (status !== 'trialing') return;

    const today = new Date().toDateString();
    const lastShown = localStorage.getItem(LAST_OFFER_KEY);
    if (lastShown === today) return;

    const timer = setTimeout(() => {
      setShow(true);
      localStorage.setItem(LAST_OFFER_KEY, today);
    }, 30000);

    return () => clearTimeout(timer);
  }, [status]);

  if (!show) return null;

  const handleCheckout = () => {
    const url = new URL(CHECKOUT_URL);
    if (user?.email) url.searchParams.set('email', user.email);
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={() => setShow(false)} />
      <div
        className="relative bg-card w-full max-w-sm mx-4 rounded-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto animate-fade-up"
      >
        <button
          onClick={() => setShow(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-secondary/60 transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Icon */}
        <div className="text-center pt-2">
          <span className="text-3xl">🔥</span>
        </div>

        {/* Copy */}
        <div className="text-center space-y-2">
          <h2 className="text-lg font-bold text-foreground">Você ainda está no teste</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Garanta seu acesso antes de expirar. São menos de R$4,16 por mês para precificar com inteligência na Shopee.
          </p>
        </div>

        {/* CTA */}
        <div className="space-y-2">
          <div className="text-center">
            <p className="text-xl font-bold text-foreground">R$49,90<span className="text-sm font-normal text-muted-foreground">/ano</span></p>
          </div>
          <button
            onClick={handleCheckout}
            className="w-full h-14 rounded-xl bg-[#F97316] hover:bg-[#ea6c10] text-white font-bold text-base transition-colors active:scale-[0.98]"
          >
            ⚡ Garantir agora
          </button>
        </div>

        <button
          onClick={() => setShow(false)}
          className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Fechar e continuar testando
        </button>
      </div>
    </div>
  );
}

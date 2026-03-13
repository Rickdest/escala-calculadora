import { Crown, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Button } from '@/components/ui/button';

const CHECKOUT_URLS: Record<string, string> = {
  mensal: 'https://pay.hotmart.com/B104846948H?off=kc5jdg0u&checkoutMode=6',
  anual: 'https://pay.hotmart.com/B104846948H?off=au88x8b1&checkoutMode=6',
};

export function TrialExpiredBlock() {
  const { user } = useAuth();
  const { refreshSubscription } = useSubscription();

  const handleCheckout = (planKey: string) => {
    const url = new URL(CHECKOUT_URLS[planKey]);
    if (user?.email) url.searchParams.set('email', user.email);
    window.open(url.toString(), '_blank');
  };

  return (
    <div className="min-h-screen bg-background gradient-mesh flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl gradient-primary mx-auto flex items-center justify-center shadow-lg">
          <Crown className="w-10 h-10 text-primary-foreground" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Seu teste grátis encerrou</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">Assine o plano para continuar usando sem limites.</p>
        </div>

        <div className="space-y-3">
          {/* Annual */}
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
            <div className="text-center mt-1.5 space-y-0.5">
              <p className="text-xs font-bold text-primary">ECONOMIZE 59%</p>
              <p className="text-[10px] text-muted-foreground">R$ 8,08/mês — cobrado anualmente R$ 97,00</p>
            </div>
          </div>

          {/* Monthly */}
          <button
            onClick={() => handleCheckout('mensal')}
            className="w-full min-h-[48px] rounded-xl font-semibold text-sm text-foreground border border-border hover:bg-secondary/50 active:scale-[0.98] transition-all"
          >
            Assinar plano mensal — R$ 19,90/mês
          </button>

          <Button onClick={refreshSubscription} variant="outline" size="lg" className="w-full h-12 text-sm font-semibold">
            <RefreshCw className="w-4 h-4 mr-2" />
            Já assinei → Verificar acesso
          </Button>
        </div>

        <div className="text-center space-y-0.5">
          <p className="text-[10px] text-muted-foreground">🔒 Pagamento 100% seguro via Hotmart</p>
          <p className="text-[10px] text-muted-foreground">Cancele quando quiser</p>
        </div>
      </div>
    </div>
  );
}

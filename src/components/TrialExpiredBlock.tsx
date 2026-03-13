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

  const handleCheckout = () => {
    const url = new URL(CHECKOUT_URLS.anual);
    if (user?.email) {
      url.searchParams.set('email', user.email);
    }
    window.open(url.toString(), '_blank');
  };

  return (
    <div className="min-h-screen bg-background gradient-mesh flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl gradient-primary mx-auto flex items-center justify-center shadow-lg">
          <Crown className="w-10 h-10 text-primary-foreground" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Seu teste grátis encerrou
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Assine o plano para continuar usando sem limites.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleCheckout}
            className="w-full h-14 rounded-xl font-bold text-lg text-white active:scale-[0.98] transition-transform"
            style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)' }}
          >
            Assinar agora
          </button>

          <Button
            onClick={refreshSubscription}
            variant="outline"
            size="lg"
            className="w-full h-12 text-sm font-semibold"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Já assinei → Verificar acesso
          </Button>
        </div>

         <p className="text-xs text-muted-foreground">
           R$ 19,90/mês ou R$ 97,00/ano · Pagamento via Hotmart
         </p>
      </div>
    </div>
  );
}

import { AppLayout } from '@/components/layout/AppLayout';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Crown, Zap, Shield, TrendingUp, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const CHECKOUT_URLS: Record<string, string> = {
  mensal: 'https://pay.hotmart.com/B104846948H?off=kc5jdg0u&checkoutMode=6',
  anual: 'https://pay.hotmart.com/B104846948H?off=au88x8b1&checkoutMode=6',
};

const plans = [
  {
    name: 'Mensal',
    key: 'mensal',
    price: 'R$ 29,90',
    period: '/mês',
    description: 'Acesso completo ao Escala',
    popular: false,
  },
  {
    name: 'Anual',
    key: 'anual',
    price: 'R$ 249,90',
    period: '/ano',
    description: 'Economize com o plano anual',
    popular: true,
    badge: 'Mais Popular',
  },
];

const features = [
  { icon: TrendingUp, text: 'Precificação inteligente ilimitada' },
  { icon: Zap, text: 'Análise ROAS com importação Shopee Ads' },
  { icon: Shield, text: 'Dados salvos na nuvem com segurança' },
  { icon: Crown, text: 'Suporte prioritário' },
];

export default function Paywall() {
  const { status, trialEnd } = useSubscription();
  const { user } = useAuth();

  const trialExpired = status === 'canceled' || status === 'past_due';
  const isFree = status === 'free';

  const handleCheckout = (planKey: string) => {
    const url = CHECKOUT_URLS[planKey];
    if (url) {
      const checkoutUrl = new URL(url);
      if (user?.email) {
        checkoutUrl.searchParams.set('email', user.email);
      }
      window.open(checkoutUrl.toString(), '_blank');
    }
  };

  return (
    <AppLayout>
      <div className="px-4 py-8 space-y-8 max-w-md mx-auto">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl gradient-primary mx-auto flex items-center justify-center">
            <Crown className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {trialExpired ? 'Seu período de teste expirou' : 'Desbloqueie o Escala Pro'}
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {trialExpired
              ? 'Assine para continuar usando todas as funcionalidades.'
              : 'Teste grátis por 7 dias. Cancele quando quiser.'}
          </p>
        </div>

        {/* Trial badge */}
        {isFree && (
          <div className="bg-success-muted rounded-2xl p-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-success" />
            <div>
              <p className="font-bold text-success text-sm">7 dias grátis</p>
              <p className="text-xs text-success/80">Comece agora sem pagar nada</p>
            </div>
          </div>
        )}

        {/* Features */}
        <div className="space-y-3">
          {features.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">{text}</span>
            </div>
          ))}
        </div>

        {/* Plans */}
        <div className="space-y-3">
          {plans.map((plan) => (
            <button
              key={plan.name}
              onClick={() => handleCheckout(plan.key)}
              className={cn(
                'w-full glass-card p-5 text-left relative transition-all',
                plan.popular && 'ring-2 ring-primary'
              )}
            >
              {plan.badge && (
                <span className="absolute -top-2.5 right-4 px-3 py-0.5 text-xs font-bold gradient-primary text-primary-foreground rounded-full">
                  {plan.badge}
                </span>
              )}
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="font-bold text-foreground">{plan.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-extrabold text-foreground">{plan.price}</span>
                  <span className="text-xs text-muted-foreground">{plan.period}</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Pagamento seguro via Hotmart. Cancele a qualquer momento.
        </p>
      </div>
    </AppLayout>
  );
}

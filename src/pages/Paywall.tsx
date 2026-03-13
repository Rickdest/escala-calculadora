import { AppLayout } from '@/components/layout/AppLayout';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import { Crown, Zap, Shield, TrendingUp, Clock, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const CHECKOUT_URLS: Record<string, string> = {
  mensal: 'https://pay.hotmart.com/B104846948H?off=kc5jdg0u&checkoutMode=6',
  anual: 'https://pay.hotmart.com/B104846948H?off=au88x8b1&checkoutMode=6',
};

const plans = [
  {
    key: 'anual',
    name: 'Anual',
    price: 'R$ 97,00',
    priceMonthly: 'R$ 8,08/mês',
    period: '/ano',
    description: 'Melhor custo-benefício',
    popular: true,
    badge: 'Economia de 58%',
  },
  {
    key: 'mensal',
    name: 'Mensal',
    price: 'R$ 19,90',
    priceMonthly: '',
    period: '/mês',
    description: 'Flexibilidade total',
    popular: false,
  },
];

const features = [
  { icon: TrendingUp, text: 'Precificação inteligente ilimitada' },
  { icon: Zap, text: 'Análise ROAS com importação Shopee Ads' },
  { icon: Shield, text: 'Dados salvos na nuvem com segurança' },
  { icon: Crown, text: 'Suporte prioritário' },
];

export default function Paywall() {
  const { status } = useSubscription();
  const { user } = useAuth();

  const trialExpired = status === 'canceled' || status === 'past_due';

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
          <div className="w-16 h-16 rounded-2xl gradient-primary mx-auto flex items-center justify-center shadow-lg">
            <Crown className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {trialExpired ? 'Seu período de teste expirou' : 'Desbloqueie o Precify Pro'}
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {trialExpired
              ? 'Assine para continuar usando todas as funcionalidades.'
              : 'Acesse todas as ferramentas para maximizar seus lucros na Shopee.'}
          </p>
        </div>

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
              key={plan.key}
              onClick={() => handleCheckout(plan.key)}
              className={cn(
                'w-full rounded-2xl p-5 text-left relative transition-all active:scale-[0.98]',
                plan.popular
                  ? 'gradient-primary text-primary-foreground shadow-lg'
                  : 'bg-secondary hover:bg-secondary/80 text-foreground'
              )}
            >
              {plan.badge && (
                <span className="absolute -top-2.5 right-4 px-3 py-0.5 text-[10px] font-bold bg-card text-primary rounded-full shadow-sm">
                  {plan.badge}
                </span>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-base">{plan.name}</p>
                  <p className={cn(
                    'text-xs mt-0.5',
                    plan.popular ? 'text-primary-foreground/80' : 'text-muted-foreground'
                  )}>
                    {plan.description}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-extrabold">{plan.price}</span>
                  <span className={cn(
                    'text-xs ml-0.5',
                    plan.popular ? 'text-primary-foreground/80' : 'text-muted-foreground'
                  )}>
                    {plan.period}
                  </span>
                  {plan.priceMonthly && (
                    <p className={cn(
                      'text-[10px] mt-0.5',
                      plan.popular ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    )}>
                      equivale a {plan.priceMonthly}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Pagamento seguro via Hotmart · Cancele quando quiser
        </p>
      </div>
    </AppLayout>
  );
}

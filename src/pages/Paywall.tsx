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
            <div key={plan.key} className="relative">
              {plan.badge && (
                <span className="absolute -top-2.5 right-4 px-3 py-0.5 text-[10px] font-bold bg-card text-primary rounded-full shadow-sm z-10">
                  {plan.badge}
                </span>
              )}
              <button
                onClick={() => handleCheckout(plan.key)}
                className="w-full h-14 rounded-xl font-bold text-lg text-white active:scale-[0.98] transition-transform"
                style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)' }}
              >
                {plan.name} — {plan.price}{plan.period}
              </button>
              {plan.priceMonthly && (
                <p className="text-center text-xs text-muted-foreground mt-1">
                  equivale a {plan.priceMonthly}
                </p>
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Pagamento seguro via Hotmart · Cancele quando quiser
        </p>
      </div>
    </AppLayout>
  );
}

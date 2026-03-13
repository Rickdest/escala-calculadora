import { Crown, TrendingUp, Zap, Shield, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const CHECKOUT_URLS: Record<string, string> = {
  mensal: 'https://pay.hotmart.com/B104846948H?off=kc5jdg0u&checkoutMode=6',
  anual: 'https://pay.hotmart.com/B104846948H?off=au88x8b1&checkoutMode=6',
};

const plans = [
  {
    key: 'mensal',
    name: 'Mensal',
    price: 'R$ 19,90',
    period: '/mês',
    popular: false,
  },
  {
    key: 'anual',
    name: 'Anual',
    price: 'R$ 97,00',
    period: '/ano',
    popular: true,
    badge: 'Economia de 58%',
  },
];

const features = [
  { icon: TrendingUp, text: 'Precificação inteligente ilimitada' },
  { icon: Zap, text: 'Análise ROAS com importação Shopee Ads' },
  { icon: Shield, text: 'Dados salvos na nuvem com segurança' },
  { icon: Crown, text: 'Suporte prioritário' },
];

interface SubscriptionModalProps {
  open: boolean;
  onClose: () => void;
}

export function SubscriptionModal({ open, onClose }: SubscriptionModalProps) {
  const { user } = useAuth();

  if (!open) return null;

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
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 pb-8 space-y-5 animate-fade-up max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl hover:bg-secondary transition-colors"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2 pt-2">
          <div className="w-14 h-14 rounded-2xl gradient-primary mx-auto flex items-center justify-center">
            <Crown className="w-7 h-7 text-primary-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Assine o Precify Pro</h2>
          <p className="text-sm text-muted-foreground">
            Para usar esta funcionalidade, ative sua assinatura.
          </p>
        </div>

        {/* Features */}
        <div className="space-y-2.5">
          {features.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Icon className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-sm text-foreground">{text}</span>
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
                'w-full rounded-2xl p-4 text-left relative transition-all active:scale-[0.98]',
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
                  <p className="font-bold">{plan.name}</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-extrabold">{plan.price}</span>
                  <span className="text-xs opacity-80">{plan.period}</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        <p className="text-center text-[10px] text-muted-foreground">
          Pagamento seguro via Hotmart · Cancele quando quiser
        </p>
      </div>
    </div>
  );
}

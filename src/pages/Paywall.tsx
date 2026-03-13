import { AppLayout } from '@/components/layout/AppLayout';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import { Crown, Zap, Shield, TrendingUp } from 'lucide-react';

const CHECKOUT_URLS: Record<string, string> = {
  mensal: 'https://pay.hotmart.com/B104846948H?off=kc5jdg0u&checkoutMode=6',
  anual: 'https://pay.hotmart.com/B104846948H?off=au88x8b1&checkoutMode=6',
};

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
      if (user?.email) checkoutUrl.searchParams.set('email', user.email);
      window.open(checkoutUrl.toString(), '_blank');
    }
  };

  return (
    <AppLayout>
      <div className="px-4 py-8 space-y-8 max-w-md mx-auto">
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

        <div className="space-y-3">
          {features.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10"><Icon className="w-4 h-4 text-primary" /></div>
              <span className="text-sm font-medium text-foreground">{text}</span>
            </div>
          ))}
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
        </div>

        <div className="text-center space-y-0.5">
          <p className="text-[10px] text-muted-foreground">🔒 Pagamento 100% seguro via Hotmart</p>
          <p className="text-[10px] text-muted-foreground">Cancele quando quiser</p>
        </div>
      </div>
    </AppLayout>
  );
}

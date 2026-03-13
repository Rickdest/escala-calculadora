import { Crown, TrendingUp, Zap, Shield, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

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
      if (user?.email) checkoutUrl.searchParams.set('email', user.email);
      window.open(checkoutUrl.toString(), '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 pb-8 space-y-5 animate-fade-up max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-xl hover:bg-secondary transition-colors">
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2 pt-2">
          <div className="w-14 h-14 rounded-2xl gradient-primary mx-auto flex items-center justify-center">
            <Crown className="w-7 h-7 text-primary-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Assine o Precify Pro</h2>
          <p className="text-sm text-muted-foreground">Para usar esta funcionalidade, ative sua assinatura.</p>
        </div>

        {/* Features */}
        <div className="space-y-2.5">
          {features.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-primary/10"><Icon className="w-3.5 h-3.5 text-primary" /></div>
              <span className="text-sm text-foreground">{text}</span>
            </div>
          ))}
        </div>

        {/* Plans */}
        <div className="space-y-3">
          {/* Annual - Max highlight */}
          <div className="relative">
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 text-[10px] font-bold bg-primary text-primary-foreground rounded-full shadow-sm z-10 whitespace-nowrap">
              ✨ MELHOR CUSTO-BENEFÍCIO
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

          {/* Monthly - Secondary */}
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
    </div>
  );
}

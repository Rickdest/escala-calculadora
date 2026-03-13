import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';

const CHECKOUT_URLS: Record<string, string> = {
  anual: 'https://pay.hotmart.com/B104846948H?off=au88x8b1&checkoutMode=6',
};

export function TrialBanner() {
  const { status, trialEnd } = useSubscription();
  const { user } = useAuth();

  if (status !== 'trialing' || !trialEnd) return null;

  const now = new Date();
  const end = new Date(trialEnd);
  const diffMs = end.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  if (daysLeft <= 0) return null;

  const handleClick = () => {
    const url = new URL(CHECKOUT_URLS.anual);
    if (user?.email) {
      url.searchParams.set('email', user.email);
    }
    window.open(url.toString(), '_blank');
  };

  const config = daysLeft >= 3
    ? {
        bg: 'bg-[#1e3a5f]',
        icon: '🚀',
        title: 'Bem-vindo! Você tem 3 dias grátis',
        text: 'Calcule preços, descubra seu lucro real e tome decisões inteligentes na Shopee.',
        button: 'Garantir meu plano →',
      }
    : daysLeft === 2
    ? {
        bg: 'bg-[#c2410c]',
        icon: '⏳',
        title: 'Falta 1 dia do seu teste grátis',
        text: 'Não perca o acesso. Assine agora e continue precificando com inteligência.',
        button: 'Assinar agora →',
      }
    : {
        bg: 'bg-[#dc2626]',
        icon: '🚨',
        title: 'Último dia de teste!',
        text: 'Seu acesso expira hoje. Garanta o plano e nunca mais precifique no chute.',
        button: 'Quero continuar →',
      };

  return (
    <div className={`${config.bg} rounded-2xl p-4 text-white`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">{config.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">{config.title}</p>
          <p className="text-xs text-white/80 mt-1 leading-relaxed">{config.text}</p>
          <button
            onClick={handleClick}
            className="mt-3 w-full h-14 rounded-xl font-bold text-lg text-white"
            style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)' }}
          >
            {config.button}
          </button>
        </div>
      </div>
    </div>
  );
}

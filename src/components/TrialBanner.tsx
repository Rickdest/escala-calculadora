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
    if (user?.email) url.searchParams.set('email', user.email);
    window.open(url.toString(), '_blank');
  };

  const isLastDay = daysLeft === 1;

  return (
    <div className={`${isLastDay ? 'bg-[#dc2626]' : 'bg-[#1e3a5f]'} rounded-2xl p-4 text-white`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-lg shrink-0">{isLastDay ? '🚨' : '🎉'}</span>
          <p className="font-bold text-sm truncate">
            {isLastDay
              ? 'Último dia de teste grátis!'
              : `Você tem ${daysLeft} dias de teste grátis restantes`}
          </p>
        </div>
        <button
          onClick={handleClick}
          className="shrink-0 px-4 py-2 rounded-lg text-xs font-bold bg-white/20 hover:bg-white/30 transition-colors"
        >
          {isLastDay ? 'Garantir acesso agora →' : 'Ver planos →'}
        </button>
      </div>
    </div>
  );
}

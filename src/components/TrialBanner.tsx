import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const CHECKOUT_URL = import.meta.env.VITE_HOTMART_URL || 'https://pay.hotmart.com/B104846948H?off=au88x8b1&checkoutMode=6';

export function TrialBanner() {
  const { status, trialEnd } = useSubscription();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (status !== 'trialing' || !trialEnd) return null;

  const now = new Date();
  const end = new Date(trialEnd);
  const diffMs = end.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  if (daysLeft <= 0) return null;

  const handleClick = () => {
    const url = new URL(CHECKOUT_URL);
    if (user?.email) url.searchParams.set('email', user.email);
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
  };

  const isLastDay = daysLeft === 1;
  const isSecondDay = daysLeft === 2;

  let bg = 'bg-[#1e3a5f]';
  let emoji = '🚀';
  let text = `${daysLeft} dias grátis · Garantir plano →`;

  if (isSecondDay) {
    bg = 'bg-[#7c3206]';
    emoji = '⏳';
    text = 'Falta 1 dia · Garantir plano →';
  } else if (isLastDay) {
    bg = 'bg-[#7c1d1d]';
    emoji = '🚨';
    text = 'Último dia de teste · Assinar →';
  }

  return (
    <button
      onClick={handleClick}
      className={`${bg} w-full h-9 flex items-center justify-center gap-2 text-white/90 transition-colors`}
    >
      <span className={`text-sm ${isLastDay ? 'animate-pulse' : ''}`}>{emoji}</span>
      <span className="text-[13px] font-medium">{text}</span>
    </button>
  );
}

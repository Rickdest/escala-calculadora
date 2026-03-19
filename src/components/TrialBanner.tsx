import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';

const CHECKOUT_URL = import.meta.env.VITE_HOTMART_URL || 'https://pay.hotmart.com/B104846948H?off=au88x8b1&checkoutMode=6';

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
    const url = new URL(CHECKOUT_URL);
    if (user?.email) url.searchParams.set('email', user.email);
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
  };

  return null; // Trial display handled in Home page inline
}

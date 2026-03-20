import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import { openCheckout } from '@/services/checkout.service';

/**
 * Domain hook for billing-related operations.
 * Centralizes subscription status checks and checkout actions.
 */
export function useBilling() {
  const { status, plan, isActive, trialEnd, loading, refreshSubscription } = useSubscription();
  const { user } = useAuth();

  const daysLeft = trialEnd
    ? Math.max(0, Math.ceil((new Date(trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const isTrialing = status === 'trialing';
  const isExpired = status === 'canceled' || status === 'past_due' || status === 'expired';

  const handleCheckout = () => {
    openCheckout(user?.email || undefined);
  };

  return {
    status,
    plan,
    isActive,
    isTrialing,
    isExpired,
    trialEnd,
    daysLeft,
    loading,
    handleCheckout,
    refreshSubscription,
  };
}

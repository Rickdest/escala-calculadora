import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import { openCheckout } from '@/services/checkout.service';

/**
 * Domain hook for billing-related operations.
 * Centralizes subscription status checks and checkout actions.
 */
export function useBilling() {
  const { status, plan, isActive, loading, refreshSubscription } = useSubscription();
  const { user } = useAuth();

  const isExpired = status === 'canceled' || status === 'past_due' || status === 'expired';

  const handleCheckout = () => {
    openCheckout(user?.email || undefined);
  };

  return {
    status,
    plan,
    isActive,
    isExpired,
    loading,
    handleCheckout,
    refreshSubscription,
  };
}

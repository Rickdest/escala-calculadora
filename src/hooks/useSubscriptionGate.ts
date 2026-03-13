import { useState, useCallback } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';

export function useSubscriptionGate() {
  const { isActive, status } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  // Allow access for: active, trialing, free (new users before subscription created), loading
  const canAccess = isActive || status === 'free' || status === 'loading';

  const gate = useCallback(
    (action: () => void) => {
      if (canAccess) {
        action();
      } else {
        setShowPaywall(true);
      }
    },
    [canAccess]
  );

  return { gate, showPaywall, setShowPaywall, isActive: canAccess };
}

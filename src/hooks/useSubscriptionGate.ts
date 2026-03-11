import { useState, useCallback } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';

export function useSubscriptionGate() {
  const { isActive } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  const gate = useCallback(
    (action: () => void) => {
      if (isActive) {
        action();
      } else {
        setShowPaywall(true);
      }
    },
    [isActive]
  );

  return { gate, showPaywall, setShowPaywall, isActive };
}

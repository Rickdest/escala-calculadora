import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { checkSubscription } from '@/services/billing.service';
import { useQueryClient } from '@tanstack/react-query';

type SubscriptionStatus = 'free' | 'active' | 'canceled' | 'past_due' | 'expired' | 'loading' | 'error';

interface SubscriptionContextType {
  status: SubscriptionStatus;
  plan: string;
  isActive: boolean;
  loading: boolean;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

const STATUS_MAP: Record<string, SubscriptionStatus> = {
  active: 'active',
  canceled: 'canceled',
  past_due: 'past_due',
  expired: 'expired',
  free: 'free',
  trialing: 'expired',
};

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, session, loading: authLoading, authReady } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SubscriptionStatus>('loading');
  const [plan, setPlan] = useState('free');
  const [loading, setLoading] = useState(true);
  const userId = user?.id;
  const accessToken = session?.access_token;
  const lastKnownStatus = useRef<{ userId: string; status: SubscriptionStatus; plan: string } | null>(null);
  const resolvedUserId = useRef<string | null>(null);
  const hasResolved = useRef(false);

  const fetchSubscription = useCallback(async (noCache = false, retryCount = 0) => {
    // Don't do anything until auth is fully ready
    if (!authReady || authLoading) return;

    // No user or no valid token — set free immediately
    if (!userId || !accessToken) {
      resolvedUserId.current = null;
      lastKnownStatus.current = null;
      hasResolved.current = true;
      setStatus('free');
      setPlan('free');
      setLoading(false);
      return;
    }

    const userChanged = resolvedUserId.current !== userId;
    if (userChanged) {
      resolvedUserId.current = userId;
      lastKnownStatus.current = null;
      hasResolved.current = false;
    }

    if (!hasResolved.current) {
      setLoading(true);
    }

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 10000)
      );
      const data = await Promise.race([
        checkSubscription(accessToken, noCache),
        timeoutPromise,
      ]);
      const newStatus = STATUS_MAP[data.status] || 'expired';
      lastKnownStatus.current = { userId, status: newStatus, plan: data.plan };
      setStatus(newStatus);
      setPlan(data.plan);
    } catch {
      // Technical error — do NOT treat as expired
      if (lastKnownStatus.current?.userId === userId) {
        // Use cached status from this same user
        setStatus(lastKnownStatus.current.status);
        setPlan(lastKnownStatus.current.plan);
      } else if (retryCount < 2) {
        // Retry up to 2 times with increasing delay
        await new Promise<void>((resolve) => setTimeout(resolve, 2000 * (retryCount + 1)));
        return await fetchSubscription(true, retryCount + 1);
      } else {
        // After all retries failed, set error state — NOT expired
        setStatus('error');
        setPlan('free');
      }
    } finally {
      hasResolved.current = true;
      setLoading(false);
    }
  }, [accessToken, authLoading, authReady, userId]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const isActive = status === 'active';
  const effectiveLoading = loading || (!authReady) || (!!userId && (!hasResolved.current || resolvedUserId.current !== userId));

  const refreshSubscription = useCallback(async () => {
    await fetchSubscription(true);
    queryClient.invalidateQueries({ queryKey: ['stores-and-products'] });
  }, [fetchSubscription, queryClient]);

  return (
    <SubscriptionContext.Provider
      value={{ status, plan, isActive, loading: effectiveLoading, refreshSubscription }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

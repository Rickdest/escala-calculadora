import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { checkSubscription, SubscriptionData } from '@/services/billing.service';
import { toast } from 'sonner';

type SubscriptionStatus = 'free' | 'trialing' | 'active' | 'canceled' | 'past_due' | 'expired' | 'loading';

interface SubscriptionContextType {
  status: SubscriptionStatus;
  plan: string;
  isActive: boolean;
  trialEnd: string | null;
  loading: boolean;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

const STATUS_MAP: Record<string, SubscriptionStatus> = {
  active: 'active',
  trialing: 'trialing',
  canceled: 'canceled',
  past_due: 'past_due',
  expired: 'expired',
  free: 'free',
};

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, session, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>('loading');
  const [plan, setPlan] = useState('free');
  const [trialEnd, setTrialEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const lastKnownStatus = useRef<{ status: SubscriptionStatus; plan: string; trialEnd: string | null } | null>(null);

  const fetchSubscription = useCallback(async (noCache = false) => {
    if (authLoading) return; // auth still resolving, don't decide yet
    if (!user || !session?.access_token) {
      setStatus('free');
      setPlan('free');
      setTrialEnd(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 10000)
      );
      const data = await Promise.race([
        checkSubscription(session.access_token, noCache),
        timeoutPromise,
      ]);
      const newStatus = STATUS_MAP[data.status] || 'expired';
      lastKnownStatus.current = { status: newStatus, plan: data.plan, trialEnd: data.trialEnd };
      setStatus(newStatus);
      setPlan(data.plan);
      setTrialEnd(data.trialEnd);
    } catch {
      if (lastKnownStatus.current) {
        setStatus(lastKnownStatus.current.status);
        setPlan(lastKnownStatus.current.plan);
        setTrialEnd(lastKnownStatus.current.trialEnd);
        toast.warning('Não foi possível verificar sua assinatura. Usando dados anteriores.');
      } else {
        setStatus('expired');
        setPlan('free');
        setTrialEnd(null);
      }
    } finally {
      setLoading(false);
    }
  }, [user, session?.access_token, authLoading]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const isActive = status === 'active' || status === 'trialing';

  const refreshSubscription = useCallback(async () => {
    await fetchSubscription(true);
  }, [fetchSubscription]);

  return (
    <SubscriptionContext.Provider
      value={{ status, plan, isActive, trialEnd, loading, refreshSubscription }}
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

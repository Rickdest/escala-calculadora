import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { checkSubscriptionServer, checkSubscriptionClient, SubscriptionData } from '@/services/billing.service';

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

function applySubscriptionData(
  data: SubscriptionData,
  setStatus: (s: SubscriptionStatus) => void,
  setPlan: (p: string) => void,
  setTrialEnd: (t: string | null) => void,
) {
  const statusMap: Record<string, SubscriptionStatus> = {
    active: 'active',
    trialing: 'trialing',
    canceled: 'canceled',
    past_due: 'past_due',
    expired: 'canceled',
    free: 'free',
  };
  setStatus(statusMap[data.status] || 'canceled');
  setPlan(data.plan);
  setTrialEnd(data.trialEnd);
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>('loading');
  const [plan, setPlan] = useState('free');
  const [trialEnd, setTrialEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!user || !session?.access_token) {
      setStatus('free');
      setPlan('free');
      setTrialEnd(null);
      setLoading(false);
      return;
    }

    try {
      // Try server-side validation first
      const data = await checkSubscriptionServer(session.access_token);
      applySubscriptionData(data, setStatus, setPlan, setTrialEnd);
    } catch {
      // Fallback to client-side (still protected by RLS)
      try {
        const data = await checkSubscriptionClient(user.id, user.email || undefined);
        applySubscriptionData(data, setStatus, setPlan, setTrialEnd);
      } catch {
        setStatus('free');
        setPlan('free');
        setTrialEnd(null);
      }
    } finally {
      setLoading(false);
    }
  }, [user, session?.access_token]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const isActive = status === 'active' || status === 'trialing';

  return (
    <SubscriptionContext.Provider
      value={{ status, plan, isActive, trialEnd, loading, refreshSubscription: fetchSubscription }}
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

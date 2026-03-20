import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

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
      // Server-side validation via edge function
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Subscription check failed, falling back to client query');
        await fallbackClientCheck();
        return;
      }

      const serverStatus = data?.status || 'free';
      const serverPlan = data?.plan || 'free';
      const serverTrialEnd = data?.trialEnd || null;

      // Map server statuses
      if (serverStatus === 'active') {
        setStatus('active');
        setPlan(serverPlan);
      } else if (serverStatus === 'trialing') {
        setStatus('trialing');
        setPlan(serverPlan);
      } else if (serverStatus === 'canceled' || serverStatus === 'past_due') {
        setStatus(serverStatus as SubscriptionStatus);
        setPlan('free');
      } else {
        // expired or unknown
        setStatus('canceled');
        setPlan('free');
      }

      setTrialEnd(serverTrialEnd);
    } catch (err) {
      console.error('Subscription check error, using fallback');
      await fallbackClientCheck();
    } finally {
      setLoading(false);
    }
  }, [user, session?.access_token]);

  // Fallback: direct DB query (still protected by RLS)
  const fallbackClientCheck = async () => {
    if (!user) return;

    try {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status, plan, trial_end')
        .eq('user_id', user.id)
        .maybeSingle();

      if (sub) {
        if (sub.status === 'active') {
          setStatus('active');
          setPlan(sub.plan || 'pro');
          setTrialEnd(sub.trial_end || null);
          return;
        }
        if (sub.status === 'trialing' && sub.trial_end) {
          const trialEndDate = new Date(sub.trial_end);
          if (trialEndDate > new Date()) {
            setStatus('trialing');
            setPlan(sub.plan || 'pro');
          } else {
            setStatus('canceled');
            setPlan('free');
          }
          setTrialEnd(sub.trial_end);
          return;
        }
        if (sub.status === 'canceled' || sub.status === 'past_due') {
          setStatus(sub.status as SubscriptionStatus);
          setPlan('free');
          setTrialEnd(sub.trial_end || null);
          return;
        }
      }

      // Check by email
      if (!sub && user.email) {
        const { data: emailSub } = await supabase
          .from('subscriptions')
          .select('status, plan, trial_end')
          .eq('email', user.email.toLowerCase())
          .maybeSingle();

        if (emailSub) {
          setStatus(emailSub.status as SubscriptionStatus);
          setPlan(emailSub.plan || 'free');
          setTrialEnd(emailSub.trial_end || null);
          return;
        }
      }

      // Profile fallback
      const { data: profile } = await supabase
        .from('profiles')
        .select('trial_fim, status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile) {
        const pStatus = profile.status as string | null;
        const trialFim = profile.trial_fim as string | null;

        if (pStatus === 'ativo') {
          setStatus('active');
          setPlan('pro');
          return;
        }
        if (pStatus === 'trial' && trialFim && new Date(trialFim) > new Date()) {
          setStatus('trialing');
          setPlan('pro');
          setTrialEnd(trialFim);
          return;
        }
      }

      setStatus('canceled');
      setPlan('free');
    } catch {
      setStatus('free');
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const isActive = status === 'active' || status === 'trialing';

  return (
    <SubscriptionContext.Provider
      value={{
        status,
        plan,
        isActive,
        trialEnd,
        loading,
        refreshSubscription: fetchSubscription,
      }}
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

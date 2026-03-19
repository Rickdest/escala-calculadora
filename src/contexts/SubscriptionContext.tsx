import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

type SubscriptionStatus = 'free' | 'trialing' | 'active' | 'canceled' | 'past_due' | 'loading';

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
  const { user } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>('loading');
  const [plan, setPlan] = useState('free');
  const [trialEnd, setTrialEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = async () => {
    if (!user) {
      setStatus('free');
      setPlan('free');
      setTrialEnd(null);
      setLoading(false);
      return;
    }

    try {
      // 1. Check profile for trial fields
      const { data: profile } = await supabase
        .from('profiles')
        .select('trial_inicio, trial_fim, status')
        .eq('user_id', user.id)
        .maybeSingle();

      // 2. Check subscriptions table for paid status
      const { data: sub, error: subErr } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();


      // Paid subscription takes priority
      if (sub) {
        if (sub.status === 'active') {
          setStatus('active');
          setPlan(sub.plan || 'pro');
          setTrialEnd(sub.trial_end || null);
          setLoading(false);
          return;
        }
        if (sub.status === 'trialing' && sub.trial_end) {
          const trialEndDate = new Date(sub.trial_end);
          if (trialEndDate < new Date()) {
            setStatus('canceled');
          } else {
            setStatus('trialing');
          }
          setPlan(sub.plan || 'pro');
          setTrialEnd(sub.trial_end);
          setLoading(false);
          return;
        }
        if (sub.status === 'canceled' || sub.status === 'past_due') {
          setStatus(sub.status as SubscriptionStatus);
          setPlan(sub.plan || 'free');
          setTrialEnd(sub.trial_end || null);
          setLoading(false);
          return;
        }
      }

      // No paid sub found — also check by email
      if (!sub) {
        const { data: emailSub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('email', user.email?.toLowerCase() || '')
          .maybeSingle();

        if (emailSub) {
          setStatus(emailSub.status as SubscriptionStatus);
          setPlan(emailSub.plan || 'free');
          setTrialEnd(emailSub.trial_end || null);
          setLoading(false);
          return;
        }
      }

      // Fall back to profile trial fields
      if (profile) {
        const profileStatus = (profile as any).status as string | null;
        const trialFim = (profile as any).trial_fim as string | null;

        if (profileStatus === 'ativo') {
          setStatus('active');
          setPlan('pro');
          setTrialEnd(null);
          setLoading(false);
          return;
        }

        if (profileStatus === 'expirado' || profileStatus === 'cancelado') {
          setStatus('canceled');
          setPlan('free');
          setTrialEnd(trialFim || null);
          setLoading(false);
          return;
        }

        if (profileStatus === 'trial' && trialFim) {
          const end = new Date(trialFim);
          if (end > new Date()) {
            setStatus('trialing');
            setPlan('pro');
            setTrialEnd(trialFim);
          } else {
            setStatus('canceled');
            setPlan('free');
            setTrialEnd(trialFim);
          }
          setLoading(false);
          return;
        }
      }

      // Nothing found at all
      setStatus('free');
      setPlan('free');
      setTrialEnd(null);
    } catch (err) {
      setStatus('free');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [user]);

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

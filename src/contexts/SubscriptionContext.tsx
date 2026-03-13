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
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription:', error);
        setStatus('free');
      } else if (data) {
        if (data.status === 'active') {
          setStatus('active');
        } else if (data.status === 'trialing' && data.trial_end) {
          const trialEndDate = new Date(data.trial_end);
          if (trialEndDate < new Date()) {
            // Trial expired → treat as canceled, block access
            setStatus('canceled');
          } else {
            setStatus('trialing');
          }
        } else if (data.status === 'canceled' || data.status === 'past_due') {
          // Always block canceled/past_due, no exceptions
          setStatus(data.status as SubscriptionStatus);
        } else {
          setStatus(data.status as SubscriptionStatus);
        }
        setPlan(data.plan || 'free');
        setTrialEnd(data.trial_end || null);
      } else {
        // No subscription found - also check by email
        const { data: emailSub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('email', user.email?.toLowerCase() || '')
          .maybeSingle();

        if (emailSub) {
          // Link subscription to user
          if (emailSub.user_id === '00000000-0000-0000-0000-000000000000') {
            // This was a pre-registered subscription, update user_id
            // We can't update due to RLS, but we can still read status
          }
          setStatus(emailSub.status as SubscriptionStatus);
          setPlan(emailSub.plan || 'free');
          setTrialEnd(emailSub.trial_end || null);
        } else {
          setStatus('free');
        }
      }
    } catch (err) {
      console.error('Subscription check failed:', err);
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

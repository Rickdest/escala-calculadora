import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionData {
  status: string;
  plan: string;
  trialEnd: string | null;
}

/**
 * Single entry point: calls the check-subscription edge function.
 * This is the ONLY source of truth for subscription status.
 */
export async function checkSubscription(accessToken: string): Promise<SubscriptionData> {
  const { data, error } = await supabase.functions.invoke('check-subscription', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (error) {
    throw new Error('Subscription check failed');
  }

  return {
    status: data?.status || 'expired',
    plan: data?.plan || 'free',
    trialEnd: data?.trialEnd || null,
  };
}

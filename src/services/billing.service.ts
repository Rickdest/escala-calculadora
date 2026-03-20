import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionData {
  status: string;
  plan: string;
  trialEnd: string | null;
}

/**
 * Server-side subscription check via edge function.
 * Falls back to direct DB query if edge function is unavailable.
 */
export async function checkSubscriptionServer(accessToken: string): Promise<SubscriptionData> {
  const { data, error } = await supabase.functions.invoke('check-subscription', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (error) {
    throw new Error('Edge function unavailable');
  }

  return {
    status: data?.status || 'free',
    plan: data?.plan || 'free',
    trialEnd: data?.trialEnd || null,
  };
}

/**
 * Client-side subscription check (fallback).
 * Protected by RLS - only returns own data.
 */
export async function checkSubscriptionClient(userId: string, userEmail?: string): Promise<SubscriptionData> {
  // Check subscriptions table by user_id
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status, plan, trial_end')
    .eq('user_id', userId)
    .maybeSingle();

  if (sub) {
    return mapSubscription(sub);
  }

  // Check by email
  if (userEmail) {
    const { data: emailSub } = await supabase
      .from('subscriptions')
      .select('status, plan, trial_end')
      .eq('email', userEmail.toLowerCase())
      .maybeSingle();

    if (emailSub) {
      return mapSubscription(emailSub);
    }
  }

  // Fallback to profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('status, trial_fim')
    .eq('user_id', userId)
    .maybeSingle();

  if (profile) {
    const pStatus = profile.status as string | null;
    const trialFim = profile.trial_fim as string | null;

    if (pStatus === 'ativo') {
      return { status: 'active', plan: 'pro', trialEnd: null };
    }
    if (pStatus === 'trial' && trialFim && new Date(trialFim) > new Date()) {
      return { status: 'trialing', plan: 'pro', trialEnd: trialFim };
    }
  }

  return { status: 'expired', plan: 'free', trialEnd: null };
}

function mapSubscription(sub: { status: string; plan: string; trial_end: string | null }): SubscriptionData {
  if (sub.status === 'active') {
    return { status: 'active', plan: sub.plan || 'pro', trialEnd: sub.trial_end };
  }
  if (sub.status === 'trialing' && sub.trial_end) {
    const isValid = new Date(sub.trial_end) > new Date();
    return {
      status: isValid ? 'trialing' : 'expired',
      plan: isValid ? (sub.plan || 'pro') : 'free',
      trialEnd: sub.trial_end,
    };
  }
  if (sub.status === 'canceled' || sub.status === 'past_due') {
    return { status: sub.status, plan: 'free', trialEnd: sub.trial_end };
  }
  return { status: 'expired', plan: 'free', trialEnd: sub.trial_end };
}

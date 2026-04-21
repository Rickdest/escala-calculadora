import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionData {
  status: string;
  plan: string;
}

interface InvokeError {
  message?: string;
  context?: { status?: number };
}

/**
 * Single entry point: calls the check-subscription edge function.
 * This is the ONLY source of truth for subscription status.
 *
 * Notes:
 * - We DO NOT send a custom `Cache-Control: no-cache` header anymore. On iOS/PWA
 *   that header forces a CORS preflight whose POST sometimes never reaches the
 *   server (the browser silently drops it after the OPTIONS). We bust the
 *   browser cache via a query-string cache-buster instead, which is preflight-safe.
 * - The edge function returns `Cache-Control: private, max-age=15`, so a fresh
 *   query string is enough to force revalidation when `noCache=true`.
 */
export async function checkSubscription(
  accessToken: string,
  noCache = false,
  signal?: AbortSignal,
): Promise<SubscriptionData> {
  const path = noCache ? `check-subscription?_t=${Date.now()}` : 'check-subscription';

  const { data, error } = await supabase.functions.invoke(path, {
    headers: { Authorization: `Bearer ${accessToken}` },
    // @ts-expect-error supabase-js v2 forwards `signal` to the underlying fetch
    signal,
  });

  if (error) {
    const e = error as InvokeError;
    const httpStatus = e.context?.status;

    // Auth problem → treat as expired (paywall), not as a network error.
    if (httpStatus === 401 || httpStatus === 403) {
      return { status: 'expired', plan: 'free' };
    }

    // Anything else (network, timeout, 5xx) → re-throw so caller can retry / fall back.
    throw new Error(e.message || 'Subscription check failed');
  }

  if (!data || typeof data !== 'object') {
    return { status: 'expired', plan: 'free' };
  }

  return {
    status: data?.status || 'expired',
    plan: data?.plan || 'free',
  };
}

export interface SubscriptionData {
  status: string;
  plan: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

/**
 * Single entry point: calls the check-subscription edge function.
 * This is the ONLY source of truth for subscription status.
 *
 * We use native `fetch` instead of `supabase.functions.invoke` because the SDK
 * does NOT support query strings in the function name — appending `?_t=...`
 * caused the OPTIONS preflight to succeed but the POST to never reach the
 * server, leaving every active user stuck on the paywall.
 *
 * To bust browser cache when `noCache=true`, we use the native fetch option
 * `cache: 'no-store'` (a client directive, not an HTTP header), which is safe
 * for CORS preflight.
 */
export async function checkSubscription(
  accessToken: string,
  noCache = false,
  signal?: AbortSignal,
): Promise<SubscriptionData> {
  const url = `${SUPABASE_URL}/functions/v1/check-subscription`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: SUPABASE_PUBLISHABLE_KEY,
        'Content-Type': 'application/json',
      },
      body: '{}',
      signal,
      cache: noCache ? 'no-store' : 'default',
    });
  } catch (err) {
    // Network error / abort — re-throw so the context can retry / fall back.
    throw err instanceof Error ? err : new Error(String(err));
  }

  // Auth problem → treat as expired (paywall), not as a network error.
  if (response.status === 401 || response.status === 403) {
    return { status: 'expired', plan: 'free' };
  }

  if (!response.ok) {
    // 5xx / unexpected → throw so caller can retry / use cached state.
    throw new Error(`check-subscription failed with status ${response.status}`);
  }

  let data: { status?: string; plan?: string } | null = null;
  try {
    data = await response.json();
  } catch {
    return { status: 'expired', plan: 'free' };
  }

  if (!data || typeof data !== 'object') {
    return { status: 'expired', plan: 'free' };
  }

  return {
    status: data.status || 'expired',
    plan: data.plan || 'free',
  };
}

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { checkSubscription } from '@/services/billing.service';
import { supabase } from '@/integrations/supabase/client';
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

const CACHE_KEY = 'skalify:sub-cache:v2';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const FETCH_TIMEOUT_MS = 20_000;

interface CachedEntry {
  userId: string;
  status: SubscriptionStatus;
  plan: string;
  ts: number;
}

function readCache(userId: string): CachedEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedEntry;
    if (parsed.userId !== userId) return null;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    if (parsed.status !== 'active') return null; // only trust positive cached state
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(entry: CachedEntry) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    /* ignore quota / private mode */
  }
}

function clearCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
    // Also clean up old cache key from previous version
    localStorage.removeItem('skalify:sub-cache:v1');
  } catch {
    /* ignore */
  }
}

/**
 * Fallback DB direct query — final safety net when edge function fails.
 * RLS guarantees the user can only read their own subscription row.
 */
async function fetchSubscriptionFromDb(
  userId: string,
): Promise<{ status: string; plan: string } | null> {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('status, plan')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('[subscription] DB fallback error', error.message);
      return null;
    }
    if (!data) {
      console.log('[subscription] DB fallback: no row for user');
      return null;
    }
    return { status: data.status || 'expired', plan: data.plan || 'free' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[subscription] DB fallback threw', msg);
    return null;
  }
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, session, loading: authLoading, authReady } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SubscriptionStatus>('loading');
  const [plan, setPlan] = useState('free');
  const [loading, setLoading] = useState(true);
  const userId = user?.id;
  const accessToken = session?.access_token;

  // Refs hold latest values so fetchSubscription stays stable (zero deps).
  const userIdRef = useRef<string | undefined>(userId);
  const accessTokenRef = useRef<string | undefined>(accessToken);
  const authReadyRef = useRef(authReady);
  const authLoadingRef = useRef(authLoading);

  useEffect(() => {
    userIdRef.current = userId;
    accessTokenRef.current = accessToken;
    authReadyRef.current = authReady;
    authLoadingRef.current = authLoading;
  }, [userId, accessToken, authReady, authLoading]);

  const lastKnownStatus = useRef<{ userId: string; status: SubscriptionStatus; plan: string } | null>(null);
  const resolvedUserId = useRef<string | null>(null);
  const hasResolved = useRef(false);
  const inflightController = useRef<AbortController | null>(null);

  // Stable function — reads everything from refs. Never recreated.
  const fetchSubscription = useCallback(async (noCache = false, retryCount = 0): Promise<void> => {
    const currentAuthReady = authReadyRef.current;
    const currentAuthLoading = authLoadingRef.current;
    const currentUserId = userIdRef.current;
    const currentAccessToken = accessTokenRef.current;

    // Don't do anything until auth is fully ready
    if (!currentAuthReady || currentAuthLoading) return;

    // No user or no valid token — set free immediately
    if (!currentUserId || !currentAccessToken) {
      resolvedUserId.current = null;
      lastKnownStatus.current = null;
      hasResolved.current = true;
      clearCache();
      setStatus('free');
      setPlan('free');
      setLoading(false);
      return;
    }

    const userChanged = resolvedUserId.current !== currentUserId;
    if (userChanged) {
      resolvedUserId.current = currentUserId;
      lastKnownStatus.current = null;
      hasResolved.current = false;
    }

    // Optimistic restore from local cache (only if active and same user) so the
    // user never sees the paywall flash while we revalidate in background.
    if (!hasResolved.current) {
      const cached = readCache(currentUserId);
      if (cached) {
        console.log('[subscription] source=cache', { ts: cached.ts, plan: cached.plan });
        lastKnownStatus.current = { userId: currentUserId, status: cached.status, plan: cached.plan };
        setStatus(cached.status);
        setPlan(cached.plan);
        setLoading(false);
        hasResolved.current = true;

        // SECURITY: revalidate cache against DB immediately (non-blocking).
        // If localStorage was tampered with, DB truth overrides within <1s.
        fetchSubscriptionFromDb(currentUserId).then((dbResult) => {
          // Bail if user changed in the meantime
          if (userIdRef.current !== currentUserId) return;
          if (!dbResult) return; // network/RLS error → keep cache, edge will resolve
          const verified = STATUS_MAP[dbResult.status] || 'expired';
          if (verified !== 'active') {
            console.warn('[subscription] cache invalidated by DB', {
              cached: cached.status,
              db: verified,
            });
            lastKnownStatus.current = { userId: currentUserId, status: verified, plan: dbResult.plan };
            setStatus(verified);
            setPlan(dbResult.plan);
            clearCache();
          }
        }).catch(() => { /* ignore — edge fetch will reconcile */ });
      } else {
        setLoading(true);
      }
    }

    // Abort any previous in-flight request to avoid race conditions
    if (inflightController.current) {
      inflightController.current.abort();
    }
    const controller = new AbortController();
    inflightController.current = controller;

    const timeoutId = setTimeout(() => {
      console.warn('[subscription] request timed out after', FETCH_TIMEOUT_MS, 'ms');
      controller.abort();
    }, FETCH_TIMEOUT_MS);

    try {
      console.log('[subscription] fetching edge', { userId: currentUserId, noCache, retryCount });
      const data = await checkSubscription(currentAccessToken, noCache, controller.signal);
      clearTimeout(timeoutId);

      // If this call was superseded, silently bail without touching state.
      if (inflightController.current !== controller) {
        console.log('[subscription] resolved but superseded — discarding result');
        return;
      }

      const newStatus = STATUS_MAP[data.status] || 'expired';
      console.log('[subscription] source=edge', { status: newStatus, plan: data.plan });
      lastKnownStatus.current = { userId: currentUserId, status: newStatus, plan: data.plan };
      setStatus(newStatus);
      setPlan(data.plan);

      if (newStatus === 'active') {
        writeCache({ userId: currentUserId, status: newStatus, plan: data.plan, ts: Date.now() });
      } else {
        clearCache();
      }

      hasResolved.current = true;
      setLoading(false);
    } catch (err) {
      clearTimeout(timeoutId);

      // Aborted because a new fetch superseded this one — do not change state.
      if (inflightController.current !== controller) {
        console.log('[subscription] aborted (superseded)');
        return;
      }

      const message = err instanceof Error ? err.message : String(err);
      console.warn('[subscription] edge fetch failed', { message, retryCount });

      // Retry edge function up to 2 times before falling back to DB
      if (retryCount < 2) {
        if (inflightController.current === controller) {
          inflightController.current = null;
        }
        await new Promise<void>((resolve) => setTimeout(resolve, 2000 * (retryCount + 1)));
        return await fetchSubscription(true, retryCount + 1);
      }

      // ===== FALLBACK 1: Direct DB query via Supabase client =====
      console.log('[subscription] edge exhausted → trying DB fallback');
      const dbResult = await fetchSubscriptionFromDb(currentUserId);

      if (dbResult) {
        const newStatus = STATUS_MAP[dbResult.status] || 'expired';
        console.log('[subscription] source=db', { status: newStatus, plan: dbResult.plan });
        lastKnownStatus.current = { userId: currentUserId, status: newStatus, plan: dbResult.plan };
        setStatus(newStatus);
        setPlan(dbResult.plan);

        if (newStatus === 'active') {
          writeCache({ userId: currentUserId, status: newStatus, plan: dbResult.plan, ts: Date.now() });
        } else {
          clearCache();
        }

        hasResolved.current = true;
        setLoading(false);
        return;
      }

      // ===== FALLBACK 2: Last-known in-memory state =====
      if (lastKnownStatus.current?.userId === currentUserId) {
        console.log('[subscription] source=memory (keeping last-known)');
        setStatus(lastKnownStatus.current.status);
        setPlan(lastKnownStatus.current.plan);
        hasResolved.current = true;
        setLoading(false);
        return;
      }

      // ===== Final: paywall =====
      console.warn('[subscription] source=paywall (all fallbacks exhausted)');
      setStatus('expired');
      setPlan('free');
      hasResolved.current = true;
      setLoading(false);
    } finally {
      // Only release the slot if this is still the current controller.
      // Do NOT touch loading/hasResolved here — handled in success/error paths
      // so that superseded calls leave state untouched.
      if (inflightController.current === controller) {
        inflightController.current = null;
      }
    }
  }, []); // stable — refs handle latest values

  // Trigger only when actual values change, not on every render.
  useEffect(() => {
    fetchSubscription();
  }, [userId, accessToken, authReady, authLoading, fetchSubscription]);

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

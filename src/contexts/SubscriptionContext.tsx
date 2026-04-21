import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { checkSubscription } from '@/services/billing.service';
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

const CACHE_KEY = 'skalify:sub-cache:v1';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1h
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
  } catch {
    /* ignore */
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
  const lastKnownStatus = useRef<{ userId: string; status: SubscriptionStatus; plan: string } | null>(null);
  const resolvedUserId = useRef<string | null>(null);
  const hasResolved = useRef(false);
  const inflightController = useRef<AbortController | null>(null);

  const fetchSubscription = useCallback(async (noCache = false, retryCount = 0) => {
    // Don't do anything until auth is fully ready
    if (!authReady || authLoading) return;

    // No user or no valid token — set free immediately
    if (!userId || !accessToken) {
      resolvedUserId.current = null;
      lastKnownStatus.current = null;
      hasResolved.current = true;
      clearCache();
      setStatus('free');
      setPlan('free');
      setLoading(false);
      return;
    }

    const userChanged = resolvedUserId.current !== userId;
    if (userChanged) {
      resolvedUserId.current = userId;
      lastKnownStatus.current = null;
      hasResolved.current = false;
    }

    // Optimistic restore from local cache (only if active and same user) so the
    // user never sees the paywall flash while we revalidate in background.
    if (!hasResolved.current) {
      const cached = readCache(userId);
      if (cached) {
        console.log('[subscription] using cached active state', { ts: cached.ts, plan: cached.plan });
        lastKnownStatus.current = { userId, status: cached.status, plan: cached.plan };
        setStatus(cached.status);
        setPlan(cached.plan);
        setLoading(false);
        hasResolved.current = true;
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
      console.log('[subscription] fetching', { userId, noCache, retryCount });
      const data = await checkSubscription(accessToken, noCache, controller.signal);
      clearTimeout(timeoutId);

      const newStatus = STATUS_MAP[data.status] || 'expired';
      console.log('[subscription] resolved', { status: newStatus, plan: data.plan });
      lastKnownStatus.current = { userId, status: newStatus, plan: data.plan };
      setStatus(newStatus);
      setPlan(data.plan);

      if (newStatus === 'active') {
        writeCache({ userId, status: newStatus, plan: data.plan, ts: Date.now() });
      } else {
        clearCache();
      }
    } catch (err) {
      clearTimeout(timeoutId);

      // Aborted because a new fetch superseded this one — do not change state.
      if (controller.signal.aborted && inflightController.current !== controller) {
        console.log('[subscription] aborted (superseded)');
        return;
      }

      const message = err instanceof Error ? err.message : String(err);
      console.warn('[subscription] fetch failed', { message, retryCount });

      // Use cached/last-known status if any
      if (lastKnownStatus.current?.userId === userId) {
        console.log('[subscription] keeping last-known state');
        setStatus(lastKnownStatus.current.status);
        setPlan(lastKnownStatus.current.plan);
      } else if (retryCount < 2) {
        // Retry up to 2 times with increasing delay
        await new Promise<void>((resolve) => setTimeout(resolve, 2000 * (retryCount + 1)));
        return await fetchSubscription(true, retryCount + 1);
      } else {
        // After all retries failed → fail-safe to expired (paywall), NOT error
        console.warn('[subscription] all retries exhausted → expired');
        setStatus('expired');
        setPlan('free');
      }
    } finally {
      hasResolved.current = true;
      setLoading(false);
      if (inflightController.current === controller) {
        inflightController.current = null;
      }
    }
  }, [accessToken, authLoading, authReady, userId]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

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

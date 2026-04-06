import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type AppType = 'seller' | 'ads';

type ParsedShopeeError = {
  code?: string;
  message: string;
};

function getShopeeAuthErrorMessage(appType: AppType, code?: string, fallback?: string) {
  const normalizedCode = code?.toLowerCase();
  const appLabel = appType === 'ads' ? 'Ads' : 'Seller';

  if (normalizedCode === 'error_sign' || normalizedCode === 'wrong_sign') {
    return `A chave da Shopee ${appLabel} está inválida ou não corresponde ao app configurado.`;
  }

  if (normalizedCode === 'auth_url_unavailable' || normalizedCode === 'auth_preflight_failed') {
    return `A Shopee não aceitou iniciar a autorização de ${appLabel}. Tente novamente em instantes.`;
  }

  return fallback || 'Erro ao iniciar integração Shopee';
}

function getShopeePayloadError(payload: unknown, appType: AppType): ParsedShopeeError | null {
  if (!payload || typeof payload !== 'object' || !('error' in payload)) {
    return null;
  }

  const payloadRecord = payload as Record<string, unknown>;
  const code = typeof payloadRecord.error === 'string' ? payloadRecord.error : undefined;
  const payloadMessage = typeof payloadRecord.message === 'string' ? payloadRecord.message : undefined;
  const fallback = payloadMessage || code || 'Erro ao iniciar integração Shopee';

  return {
    code,
    message: getShopeeAuthErrorMessage(appType, code, fallback),
  };
}

async function parseShopeeInvokeError(invokeError: unknown, appType: AppType): Promise<ParsedShopeeError> {
  const fallback = invokeError instanceof Error ? invokeError.message : 'Erro ao iniciar integração Shopee';

  if (invokeError && typeof invokeError === 'object' && 'context' in invokeError) {
    const context = (invokeError as { context?: Response }).context;

    if (context) {
      try {
        const payload = await context.clone().json();
        const parsedPayloadError = getShopeePayloadError(payload, appType);
        if (parsedPayloadError) return parsedPayloadError;
      } catch {
        // ignore JSON parse errors and try plain text
      }

      try {
        const text = await context.clone().text();
        return {
          message: getShopeeAuthErrorMessage(appType, undefined, text || fallback),
        };
      } catch {
        // ignore plain text parse errors and fall back to generic message
      }
    }
  }

  return {
    message: getShopeeAuthErrorMessage(appType, undefined, fallback),
  };
}

export function useShopeeToken(appType?: AppType, storeId?: string) {
  const { user } = useAuth();
  const [needsReauth, setNeedsReauth] = useState(false);

  const { data: token, isLoading, refetch } = useQuery({
    queryKey: ['shopee-token', user?.id, appType, storeId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_shopee_token_metadata', {
        p_app_type: appType || null,
        p_store_id: storeId || null,
      });
      if (error) throw error;
      // RPC returns an array; take first row or null
      const row = Array.isArray(data) ? data[0] ?? null : data;
      return row;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Check if token is likely expired based on local time
  // Expiração é controlada pelo backend (refresh automático a cada ~4h).
  // Só marca expirado quando o backend retorna needs_reauth (refresh token morreu).
  const isTokenExpired = needsReauth;

  const startOAuth = async (oauthAppType: AppType = 'seller', oauthStoreId?: string) => {
    const { data: session } = await supabase.auth.getSession();
    const res = await supabase.functions.invoke('shopee-auth', {
      headers: {
        Authorization: `Bearer ${session.session?.access_token}`,
      },
      body: { app_type: oauthAppType, store_id: oauthStoreId || storeId },
    });

    if (res.error) {
      const parsedError = await parseShopeeInvokeError(res.error, oauthAppType);
      toast.error(parsedError.message);
      throw new Error(parsedError.message);
    }

    const data = res.data;
    const payloadError = getShopeePayloadError(data, oauthAppType);

    if (payloadError) {
      toast.error(payloadError.message);
      throw new Error(payloadError.message);
    }

    const { auth_url } = data;
    if (!auth_url) {
      toast.error('URL de autenticação não retornada pelo servidor.');
      throw new Error('No auth_url returned');
    }

    window.location.href = auth_url;
  };

  /** Sync store data: shop info, products, orders (shopee-sync) */
  const syncStoreData = async () => {
    const { data: session } = await supabase.auth.getSession();
    const res = await supabase.functions.invoke('shopee-sync', {
      headers: {
        Authorization: `Bearer ${session.session?.access_token}`,
      },
    });
    if (res.error) {
      throw res.error;
    }
      throw res.error;
    }
    // If needs_reauth, set flag but DON'T throw — return data so caller can check
    if (res.data?.needs_reauth) {
      setNeedsReauth(true);
      return res.data;
    }
    if (res.data?.error) {
      throw new Error(res.data.error);
    }
    return res.data;
  };

  /** Sync ads only: campaigns, daily performance, balance (shopee-ads) */
  const syncAdsOnly = async (itemId?: number) => {
    const { data: session } = await supabase.auth.getSession();
    const res = await supabase.functions.invoke('shopee-ads', {
      headers: {
        Authorization: `Bearer ${session.session?.access_token}`,
      },
      body: itemId ? { item_id: itemId } : undefined,
    });
    if (res.error) {
      const msg = res.error?.message || 'Erro ao importar ads';
      toast.error(msg);
      throw res.error;
    }
    if (res.data?.error) {
      toast.error(`Erro Shopee: ${res.data.error}`);
      throw new Error(res.data.error);
    }
    if (res.data?.needs_reauth) {
      setNeedsReauth(true);
    }
    return res.data;
  };

  return {
    token,
    isConnected: !!token,
    isExpired: isTokenExpired,
    needsReauth,
    isLoading,
    startOAuth,
    syncStoreData,
    syncAdsOnly,
    refetch,
    clearReauth: () => setNeedsReauth(false),
  };
}

/** Hook to check both seller and ads token status for a specific store */
export function useShopeeTokenStatus(storeId?: string) {
  const seller = useShopeeToken('seller', storeId);
  const ads = useShopeeToken('ads', storeId);

  return {
    sellerConnected: seller.isConnected,
    adsConnected: ads.isConnected,
    sellerExpired: seller.isExpired,
    adsExpired: ads.isExpired,
    sellerToken: seller.token,
    adsToken: ads.token,
    isLoading: seller.isLoading || ads.isLoading,
    startOAuth: seller.startOAuth,
    syncStoreData: seller.syncStoreData,
    syncAdsOnly: ads.syncAdsOnly || seller.syncAdsOnly,
    refetchAll: () => { seller.refetch(); ads.refetch(); },
  };
}

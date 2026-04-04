import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type AppType = 'seller' | 'ads';

export function useShopeeToken(appType?: AppType) {
  const { user } = useAuth();
  const [needsReauth, setNeedsReauth] = useState(false);

  const { data: token, isLoading, refetch } = useQuery({
    queryKey: ['shopee-token', user?.id, appType],
    queryFn: async () => {
      const baseQuery = supabase
        .from('shopee_tokens')
        .select('*')
        .eq('user_id', user!.id);

      const finalQuery = appType
        ? (baseQuery as any).eq('app_type', appType)
        : baseQuery;

      const { data, error } = await finalQuery.limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Check if token is likely expired based on local time
  const isTokenExpired = (() => {
    if (!token) return false;
    if (needsReauth) return true;
    const tokenAge = (Date.now() - new Date(token.token_created_at).getTime()) / 1000;
    return tokenAge > (token.expire_in || 14400); // default 4h
  })();

  const startOAuth = async (oauthAppType: AppType = 'seller') => {
    const { data: session } = await supabase.auth.getSession();
    const res = await supabase.functions.invoke('shopee-auth', {
      headers: {
        Authorization: `Bearer ${session.session?.access_token}`,
      },
      body: { app_type: oauthAppType },
    });

    if (res.error) {
      const msg = res.error?.message || 'Erro ao iniciar integração Shopee';
      toast.error(msg);
      throw res.error;
    }

    const data = res.data;

    if (data?.error) {
      toast.error(`Erro Shopee: ${data.error}`);
      throw new Error(data.error);
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
      const msg = res.error?.message || 'Erro ao sincronizar dados da loja';
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

/** Hook to check both seller and ads token status */
export function useShopeeTokenStatus() {
  const seller = useShopeeToken('seller');
  const ads = useShopeeToken('ads');

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

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useShopeeToken() {
  const { user } = useAuth();

  const { data: token, isLoading, refetch } = useQuery({
    queryKey: ['shopee-token', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shopee_tokens')
        .select('*')
        .eq('user_id', user!.id)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const startOAuth = async () => {
    const callbackUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopee-callback`;

    const { data: session } = await supabase.auth.getSession();
    const res = await supabase.functions.invoke('shopee-auth', {
      body: { redirect_url: callbackUrl },
      headers: {
        Authorization: `Bearer ${session.session?.access_token}`,
      },
    });

    if (res.error) throw res.error;
    const { auth_url } = res.data;
    window.location.href = auth_url;
  };

  const syncAds = async () => {
    const { data: session } = await supabase.auth.getSession();
    const res = await supabase.functions.invoke('shopee-sync', {
      headers: {
        Authorization: `Bearer ${session.session?.access_token}`,
      },
    });
    if (res.error) throw res.error;
    return res.data;
  };

  return {
    token,
    isConnected: !!token,
    isLoading,
    startOAuth,
    syncAds,
    refetch,
  };
}

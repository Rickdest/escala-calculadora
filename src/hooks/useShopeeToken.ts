import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
    const { data: session } = await supabase.auth.getSession();
    const res = await supabase.functions.invoke('shopee-auth', {
      headers: {
        Authorization: `Bearer ${session.session?.access_token}`,
      },
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

  const syncAds = async () => {
    const { data: session } = await supabase.auth.getSession();
    const res = await supabase.functions.invoke('shopee-sync', {
      headers: {
        Authorization: `Bearer ${session.session?.access_token}`,
      },
    });
    if (res.error) {
      const msg = res.error?.message || 'Erro ao sincronizar ads';
      toast.error(msg);
      throw res.error;
    }
    if (res.data?.error) {
      toast.error(`Erro Shopee: ${res.data.error}`);
      throw new Error(res.data.error);
    }
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

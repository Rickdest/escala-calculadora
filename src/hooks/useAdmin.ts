import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

async function checkAdminRole(): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_role', { _role: 'admin' });
  if (error) return false;
  return !!data;
}

export function useAdmin() {
  const { user } = useAuth();

  const { data: isAdmin = false, isLoading: loading } = useQuery({
    queryKey: ['admin-role', user?.id],
    queryFn: checkAdminRole,
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 min — papel admin não muda com frequência
    retry: 1,
  });

  return { isAdmin, loading };
}

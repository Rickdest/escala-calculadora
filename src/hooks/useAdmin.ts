import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAdminStatus() {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // Check admin role via database function (server-side validated)
      const { data, error } = await supabase.rpc('has_role', {
        _role: 'admin',
      });

      if (error) {
        setIsAdmin(false);
      } else {
        setIsAdmin(!!data);
      }

      setLoading(false);
    }

    checkAdminStatus();
  }, [user]);

  return { isAdmin, loading };
}

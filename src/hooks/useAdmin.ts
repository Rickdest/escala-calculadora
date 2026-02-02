import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const ADMIN_EMAIL = 'richard.aragao@outlook.com';

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

      // Check if user email matches admin email
      if (user.email === ADMIN_EMAIL) {
        // Check/create admin role in database
        const { data: existingRole } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .single();

        if (!existingRole) {
          // Create admin role for this user
          await supabase
            .from('user_roles')
            .insert({ user_id: user.id, role: 'admin' });
        }

        setIsAdmin(true);
      } else {
        // Check if user has admin role in database
        const { data: role } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .single();

        setIsAdmin(!!role);
      }

      setLoading(false);
    }

    checkAdminStatus();
  }, [user]);

  return { isAdmin, loading };
}

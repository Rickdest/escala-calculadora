import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function useSignOut() {
  const { signOut } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    queryClient.clear();
    navigate('/auth', { replace: true });
  };

  return { handleSignOut };
}

import { useAuth } from '@/contexts/AuthContext';

export function useIsBooker() {
  return useAuth().profile?.role === 'booker';
}
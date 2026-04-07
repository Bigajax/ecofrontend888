import { useAuth } from '@/contexts/AuthContext';

export function useGuest() {
  const { isGuest, guestUser, initGuestSession } = useAuth();
  return { isGuest, guestUser, initGuestSession };
}

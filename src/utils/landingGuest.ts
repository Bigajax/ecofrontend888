import { v4 as uuidv4 } from 'uuid';
import mixpanel from '@/lib/mixpanel';

export const GUEST_USER_KEY = 'eco_guest_user';

export interface GuestUser {
  id: string;
  isGuest: true;
  createdAt: string;
}

export function getGuestSession(): GuestUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(GUEST_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'id' in parsed &&
      'isGuest' in parsed &&
      (parsed as GuestUser).isGuest === true
    ) {
      return parsed as GuestUser;
    }
    return null;
  } catch {
    return null;
  }
}

export function createGuestSession(source = 'landing'): GuestUser {
  const existing = getGuestSession();
  if (existing) return existing;

  const guest: GuestUser = {
    id: `guest_${uuidv4()}`,
    isGuest: true,
    createdAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(GUEST_USER_KEY, JSON.stringify(guest));
  } catch {}

  try {
    mixpanel.track('Guest Session Started', {
      source,
      guestId: guest.id,
      timestamp: guest.createdAt,
    });
  } catch {}

  return guest;
}

export function clearLandingGuestSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(GUEST_USER_KEY);
  } catch {}
}

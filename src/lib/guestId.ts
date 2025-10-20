import { getOrCreateGuestId } from "../api/guestIdentity";

let cachedGuestId: string | null = null;

export function ensureGuestId(): string {
  if (cachedGuestId) {
    return cachedGuestId;
  }

  const guestId = getOrCreateGuestId();
  cachedGuestId = guestId;
  return guestId;
}

export const ECO_GUEST_ID = ensureGuestId();

export function getGuestId(): string {
  return ECO_GUEST_ID;
}

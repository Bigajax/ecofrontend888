import { getGuestId, syncGuestId } from "../lib/guestId";
import { normalizeGuestIdFormat, readPersistedGuestId } from "./guestIdentity";
import type { EnviarMensagemOptions, GuestResolution } from "./types";

export const resolveGuestHeaders = (
  options: EnviarMensagemOptions | undefined,
  token: string | null,
): GuestResolution => {
  const userWantsGuest = options?.isGuest === true;
  const isGuest = userWantsGuest || !token;

  const providedGuestId = normalizeGuestIdFormat(options?.guestId);
  const rawGuestId =
    typeof options?.guestId === "string" && options.guestId.trim().length > 0
      ? options.guestId.trim()
      : "";
  const storedGuestId = readPersistedGuestId();

  const guestId = providedGuestId || rawGuestId || storedGuestId || getGuestId();

  syncGuestId(guestId);

  return { guestId, isGuest };
};

export const resolveUserId = (
  explicitUserId: string | undefined,
  sessionUserId: string | undefined,
  guest: GuestResolution,
): string => {
  const directId = typeof explicitUserId === "string" ? explicitUserId.trim() : "";
  if (directId) return directId;

  const sessionId = typeof sessionUserId === "string" ? sessionUserId.trim() : "";
  if (sessionId) return sessionId;

  return guest.isGuest ? guest.guestId : "";
};

import { resolveApiUrl } from "@/constants/api";
import { getOrCreateGuestId, getOrCreateSessionId } from "@/utils/ecoIdentity";

export const ASK_ECO_ENDPOINT_PATH = "/api/ask-eco" as const;

const FALLBACK_ORIGIN = "https://local.eco";

const toAbsoluteUrl = (rawUrl: string): URL => {
  try {
    return new URL(rawUrl);
  } catch {
    const base = typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : FALLBACK_ORIGIN;
    return new URL(rawUrl, base);
  }
};

export const buildAskEcoUrl = (
  path: string = ASK_ECO_ENDPOINT_PATH,
  options: { clientMessageId?: string | null } = {},
): string => {
  const resolved = resolveApiUrl(path);
  const url = toAbsoluteUrl(resolved);
  const guestId = getOrCreateGuestId();
  const sessionId = getOrCreateSessionId();
  const clientMessageId = typeof options.clientMessageId === "string"
    ? options.clientMessageId.trim()
    : "";

  if (guestId) {
    url.searchParams.set("guest_id", guestId);
  }
  if (sessionId) {
    url.searchParams.set("session_id", sessionId);
  }
  if (clientMessageId) {
    url.searchParams.set("client_message_id", clientMessageId);
  }
  return url.toString();
};

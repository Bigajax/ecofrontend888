import { resolveApiUrl } from "@/constants/api";
import { getGuestId, getSessionId } from "@/utils/guestSession";

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

export const buildAskEcoUrl = (path: string = ASK_ECO_ENDPOINT_PATH): string => {
  const resolved = resolveApiUrl(path);
  const url = toAbsoluteUrl(resolved);
  const guestId = getGuestId();
  const sessionId = getSessionId();
  if (guestId) {
    url.searchParams.set("guest", guestId);
  }
  if (sessionId) {
    url.searchParams.set("session", sessionId);
  }
  return url.toString();
};

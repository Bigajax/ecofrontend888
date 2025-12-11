import { resolveApiUrl, API_BASE_URL } from "@/constants/api";
import { getOrCreateSessionId } from "@/utils/identity";
import { readGuestId } from "./guestIdentity";

export const ASK_ECO_ENDPOINT_PATH = "/api/ask-eco" as const;

// Fallback remoto seguro (só se nada mais existir)
const REMOTE_API_FALLBACK = "https://ecobackend888.onrender.com";

const toAbsoluteUrl = (rawUrl: string): URL => {
  // 1) Se já é absoluta, só parsear
  try {
    const u = new URL(rawUrl);
    return u;
  } catch {
    // not absolute — continue
  }

  // 2) Preferir a base efetiva da API (centralizada em constants/api)
  try {
    if (typeof API_BASE_URL === "string" && API_BASE_URL.trim()) {
      return new URL(rawUrl, API_BASE_URL);
    }
  } catch {
    /* noop */
  }

  // 3) Cair para a origem do browser (permite proxy/rewrite em /api)
  try {
    const base =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : undefined;
    if (base) return new URL(rawUrl, base);
  } catch {
    /* noop */
  }

  // 4) Último recurso: backend remoto
  return new URL(rawUrl, REMOTE_API_FALLBACK);
};

// Simplificada: retorna apenas a URL base
export const buildAskEcoUrl = (
  path: string = ASK_ECO_ENDPOINT_PATH,
): string => {
  const resolved = resolveApiUrl(path);
  const url = toAbsoluteUrl(resolved);
  return url.toString();
};

// Nova função para construir headers
export const buildAskEcoHeaders = (clientMessageId?: string) => {
  // Read guest ID without creating it (may be null if not in guest mode)
  const guestId = readGuestId();
  const sessionId = getOrCreateSessionId();

  return {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
    'x-eco-guest-id': guestId || '',
    'x-eco-session-id': sessionId || '',
    'x-eco-client-message-id': clientMessageId || '',
  };
};
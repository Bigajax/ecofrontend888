import { resolveApiUrl, API_BASE_URL } from "@/constants/api";
import { getOrCreateGuestId, getOrCreateSessionId } from "@/utils/identity";

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

export const buildAskEcoUrl = (
  path: string = ASK_ECO_ENDPOINT_PATH,
  options: { clientMessageId?: string | null } = {},
): string => {
  // resolveApiUrl já aplica a base consolidada; se vier relativo, toAbsoluteUrl aplica API_BASE_URL
  const resolved = resolveApiUrl(path);
  const url = toAbsoluteUrl(resolved);

  const guestId = getOrCreateGuestId();
  const sessionId = getOrCreateSessionId();
  const clientMessageId =
    typeof options.clientMessageId === "string" ? options.clientMessageId.trim() : "";

  if (guestId) url.searchParams.set("guest_id", guestId);
  if (sessionId) url.searchParams.set("session_id", sessionId);
  if (clientMessageId) url.searchParams.set("client_message_id", clientMessageId);

  return url.toString();
};

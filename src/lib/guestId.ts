import {
  ensureGuestId as ensureGuestIdentity,
  ensureSessionId as ensureSessionIdentity,
  getGuestId as getCachedGuestId,
  getSessionId as getCachedSessionId,
  rememberGuestId,
  rememberGuestIdFromResponse,
  rememberSessionId,
  rememberSessionIdFromResponse,
} from "@/utils/guestSession";
import { normalizeGuestIdFormat } from "@/api/guestIdentity";

let cachedBiasHint: string | null = null;

export function ensureGuestId(): string {
  return ensureGuestIdentity();
}

export function getGuestId(): string {
  return getCachedGuestId();
}

export function syncGuestId(nextGuestId: string | null | undefined): string | null {
  if (typeof nextGuestId !== "string" || nextGuestId.trim().length === 0) {
    return null;
  }

  const normalized = normalizeGuestIdFormat(nextGuestId);
  if (!normalized) {
    return null;
  }

  rememberGuestId(normalized);
  return normalized;
}

export function ensureSessionId(): string {
  return ensureSessionIdentity();
}

export function getSessionId(): string {
  return getCachedSessionId();
}

export function rememberSessionIdValue(candidate: string | null | undefined): string | null {
  if (typeof candidate !== "string") return null;
  return rememberSessionId(candidate);
}

export function rememberGuestIdentityFromResponse(
  source: Headers | Response | Record<string, unknown> | null | undefined,
): string | null {
  return rememberGuestIdFromResponse(source);
}

export function rememberSessionIdentityFromResponse(
  source: Headers | Response | Record<string, unknown> | null | undefined,
): string | null {
  return rememberSessionIdFromResponse(source);
}

export function updateBiasHint(nextHint: string | null | undefined): string | null {
  const normalized = typeof nextHint === "string" ? nextHint.trim() : "";
  cachedBiasHint = normalized ? normalized.slice(0, 256) : null;
  return cachedBiasHint;
}

export function getBiasHint(): string | null {
  return cachedBiasHint;
}

export function buildIdentityHeaders(
  options: { biasHint?: string | null } = {},
): Record<string, string> {
  const headers: Record<string, string> = {
    "X-Eco-Guest-Id": ensureGuestId(),
    "X-Eco-Session-Id": ensureSessionId(),
    "X-Client-Id": "webapp",
  };

  const hint = options.biasHint ?? cachedBiasHint;
  if (hint) {
    headers["X-Eco-Bias-Hint"] = hint;
  }

  return headers;
}

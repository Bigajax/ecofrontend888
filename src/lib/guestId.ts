import {
  ensureGuestId as ensurePersistedGuestId,
  normalizeGuestIdFormat,
  persistGuestId,
} from "../api/guestIdentity";
import { getOrCreateSessionId } from "../utils/session";

let cachedGuestId: string | null = null;
let cachedSessionId: string | null = null;
let cachedBiasHint: string | null = null;

export function ensureGuestId(): string {
  if (!cachedGuestId) {
    cachedGuestId = ensurePersistedGuestId();
  }
  return cachedGuestId;
}

export function getGuestId(): string {
  return ensureGuestId();
}

export function syncGuestId(nextGuestId: string | null | undefined): string | null {
  if (typeof nextGuestId !== "string" || nextGuestId.trim().length === 0) {
    return null;
  }

  const normalized = normalizeGuestIdFormat(nextGuestId);
  if (normalized) {
    cachedGuestId = normalized;
    persistGuestId(normalized);
    return normalized;
  }

  const trimmed = nextGuestId.trim();
  if (!trimmed) {
    return null;
  }

  cachedGuestId = trimmed;
  return trimmed;
}

export function ensureSessionId(): string {
  if (!cachedSessionId) {
    cachedSessionId = getOrCreateSessionId();
  }
  return cachedSessionId;
}

export function getSessionId(): string {
  return ensureSessionId();
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
    "X-Eco-Client": "web",
  };

  const hint = options.biasHint ?? cachedBiasHint;
  if (hint) {
    headers["X-Eco-Bias-Hint"] = hint;
  }

  return headers;
}

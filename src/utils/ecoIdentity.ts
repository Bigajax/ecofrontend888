import { v4 as uuidv4 } from "uuid";

import {
  ensureGuestId as ensureGuestIdentity,
  ensureSessionId as ensureSessionIdentity,
  rememberGuestIdentityFromResponse,
  rememberSessionIdentityFromResponse,
} from "@/lib/guestId";

const GUEST_STORAGE_KEY = "eco.guest_id" as const;
const SESSION_STORAGE_KEY = "eco.session_id" as const;

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const hasWindow = typeof window !== "undefined";

const safeStorage = <T extends Storage>(factory: () => T): T | null => {
  if (!hasWindow) return null;
  try {
    const storage = factory();
    const probeKey = "__eco_identity_probe__";
    storage.setItem(probeKey, "1");
    storage.removeItem(probeKey);
    return storage;
  } catch {
    return null;
  }
};

const getLocalStorage = () => safeStorage(() => window.localStorage);
const getSessionStorage = () => safeStorage(() => window.sessionStorage);

const readGuestIdFromStorage = (): string | null => {
  const storage = getLocalStorage();
  if (!storage) return null;
  try {
    return storage.getItem(GUEST_STORAGE_KEY);
  } catch {
    return null;
  }
};

const readSessionIdFromStorage = (): string | null => {
  const storages = [getSessionStorage(), getLocalStorage()].filter(Boolean) as Storage[];
  for (const storage of storages) {
    try {
      const candidate = storage.getItem(SESSION_STORAGE_KEY);
      if (candidate) return candidate;
    } catch {
      /* noop */
    }
  }
  return null;
};

const normalizeUuid = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return UUID_V4_REGEX.test(trimmed) ? trimmed.toLowerCase() : null;
};

const generateUuid = (): string => {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* noop */
  }
  return uuidv4();
};

const persistGuestId = (guestId: string) => {
  const storage = getLocalStorage();
  try {
    storage?.setItem(GUEST_STORAGE_KEY, guestId);
  } catch {
    /* noop */
  }
};

const persistSessionId = (sessionId: string) => {
  const sessionStorage = getSessionStorage();
  const localStorage = getLocalStorage();
  try {
    sessionStorage?.setItem(SESSION_STORAGE_KEY, sessionId);
  } catch {
    /* noop */
  }
  try {
    localStorage?.setItem(SESSION_STORAGE_KEY, sessionId);
  } catch {
    /* noop */
  }
};

export const isUuidV4 = (value: string): boolean => Boolean(normalizeUuid(value));

export const getOrCreateGuestId = (): string => {
  const ensured = ensureGuestIdentity();
  const normalized = normalizeUuid(ensured) ?? normalizeUuid(readGuestIdFromStorage());
  if (normalized) {
    persistGuestId(normalized);
    return normalized;
  }
  const generatedRaw = generateUuid();
  const generated = normalizeUuid(generatedRaw) ?? generatedRaw;
  persistGuestId(generated);
  return generated;
};

export const getOrCreateSessionId = (): string => {
  const ensured = ensureSessionIdentity();
  const normalized = normalizeUuid(ensured) ?? normalizeUuid(readSessionIdFromStorage());
  if (normalized) {
    persistSessionId(normalized);
    return normalized;
  }
  const generatedRaw = generateUuid();
  const generated = normalizeUuid(generatedRaw) ?? generatedRaw;
  persistSessionId(generated);
  return generated;
};

export const rememberIdsFromResponse = (response: Response): void => {
  const guestId = rememberGuestIdentityFromResponse(response.headers);
  const sessionId = rememberSessionIdentityFromResponse(response.headers);
  if (guestId && normalizeUuid(guestId)) {
    persistGuestId(guestId);
  }
  if (sessionId && normalizeUuid(sessionId)) {
    persistSessionId(sessionId);
  }
};

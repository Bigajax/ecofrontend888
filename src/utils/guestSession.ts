import { v4 as uuidv4 } from "uuid";

import {
  normalizeGuestIdFormat,
  persistGuestId,
  readPersistedGuestId,
} from "@/api/guestIdentity";

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SESSION_STORAGE_KEYS = ["eco.session_id", "eco_session_id"] as const;

const hasWindow = typeof window !== "undefined";

let inMemoryGuestId: string | null = null;
let inMemorySessionId: string | null = null;

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

const normalizeUuid = (value: unknown): string => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (UUID_V4_REGEX.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return "";
};

const readGuestIdFromStorage = (): string | null => {
  const persisted = readPersistedGuestId();
  if (persisted) {
    return normalizeGuestIdFormat(persisted);
  }
  return null;
};

const persistGuestIdentity = (guestId: string) => {
  try {
    persistGuestId(guestId);
  } catch {
    /* noop */
  }
};

const safeStorage = <K extends "session" | "local">(kind: K) => {
  if (!hasWindow) return null;
  try {
    const storage = kind === "session" ? window.sessionStorage : window.localStorage;
    const testKey = "__eco_session_test__";
    storage.setItem(testKey, "1");
    storage.removeItem(testKey);
    return storage;
  } catch {
    return null;
  }
};

const readSessionIdFromStorage = (): string | null => {
  if (!hasWindow) return inMemorySessionId;
  const storages = [safeStorage("session"), safeStorage("local")].filter(Boolean);
  for (const storage of storages) {
    try {
      for (const key of SESSION_STORAGE_KEYS) {
        const value = storage?.getItem(key) ?? null;
        if (value) {
          const normalized = normalizeUuid(value);
          if (normalized) {
            return normalized;
          }
        }
      }
    } catch {
      /* noop */
    }
  }
  return inMemorySessionId;
};

const persistSessionId = (sessionId: string) => {
  if (!hasWindow) return;
  const storages = [safeStorage("session"), safeStorage("local")].filter(Boolean);
  for (const storage of storages) {
    if (!storage) continue;
    try {
      for (const key of SESSION_STORAGE_KEYS) {
        storage.setItem(key, sessionId);
      }
    } catch {
      /* noop */
    }
  }
};

const generateGuestId = (): string => {
  const id = normalizeUuid(generateUuid());
  persistGuestIdentity(id);
  inMemoryGuestId = id;
  return id;
};

const generateSessionId = (): string => {
  const id = normalizeUuid(generateUuid());
  persistSessionId(id);
  inMemorySessionId = id;
  return id;
};

const extractHeaderValue = (
  source: Headers | Response | Record<string, unknown> | null | undefined,
  names: string[],
): string | null => {
  if (!source) return null;

  if (typeof Response !== "undefined" && source instanceof Response) {
    return extractHeaderValue(source.headers, names);
  }

  if (typeof Headers !== "undefined" && source instanceof Headers) {
    for (const name of names) {
      const value = source.get(name);
      if (typeof value === "string" && value.trim()) {
        return value;
      }
    }
    return null;
  }

  const record = source as Record<string, unknown>;
  for (const name of names) {
    const direct = record[name];
    if (typeof direct === "string" && direct.trim()) {
      return direct;
    }
    const lower = record[name.toLowerCase()];
    if (typeof lower === "string" && lower.trim()) {
      return lower;
    }
  }
  return null;
};

const rememberGuestIdInternal = (candidate: unknown): string | null => {
  const normalized = normalizeGuestIdFormat(candidate);
  if (!normalized) return null;
  persistGuestIdentity(normalized);
  inMemoryGuestId = normalized;
  return normalized;
};

const rememberSessionIdInternal = (candidate: unknown): string | null => {
  const normalized = normalizeUuid(candidate);
  if (!normalized) return null;
  persistSessionId(normalized);
  inMemorySessionId = normalized;
  return normalized;
};

export const ensureGuestId = (): string => {
  if (inMemoryGuestId && normalizeUuid(inMemoryGuestId)) {
    return inMemoryGuestId;
  }
  const stored = readGuestIdFromStorage();
  if (stored) {
    inMemoryGuestId = stored;
    return stored;
  }
  return generateGuestId();
};

export const ensureSessionId = (): string => {
  if (inMemorySessionId && normalizeUuid(inMemorySessionId)) {
    return inMemorySessionId;
  }
  const stored = readSessionIdFromStorage();
  if (stored) {
    inMemorySessionId = stored;
    return stored;
  }
  return generateSessionId();
};

export const getGuestId = (): string => ensureGuestId();

export const getSessionId = (): string => ensureSessionId();

export const rememberGuestId = (candidate: unknown): string | null =>
  rememberGuestIdInternal(candidate);

export const rememberSessionId = (candidate: unknown): string | null =>
  rememberSessionIdInternal(candidate);

export const rememberGuestIdFromResponse = (
  source: Headers | Response | Record<string, unknown> | null | undefined,
): string | null => {
  const headerValue = extractHeaderValue(source, [
    "X-Eco-Guest-Id",
    "x-eco-guest-id",
    "X-Guest-Id",
    "x-guest-id",
  ]);
  if (!headerValue) return null;
  return rememberGuestIdInternal(headerValue);
};

export const rememberSessionIdFromResponse = (
  source: Headers | Response | Record<string, unknown> | null | undefined,
): string | null => {
  const headerValue = extractHeaderValue(source, [
    "X-Eco-Session-Id",
    "x-eco-session-id",
    "X-Session-Id",
    "x-session-id",
  ]);
  if (!headerValue) return null;
  return rememberSessionIdInternal(headerValue);
};

export const ensureGuestAndSession = (): { guestId: string; sessionId: string } => ({
  guestId: ensureGuestId(),
  sessionId: ensureSessionId(),
});

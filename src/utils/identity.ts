const GUEST_STORAGE_KEY = "eco.guest_id" as const;
const SESSION_STORAGE_KEY = "eco.session_id" as const;

const hasWindow = typeof window !== "undefined";

type StorageKind = "local" | "session";

const inMemory = {
  guestId: "" as string | null,
  sessionId: "" as string | null,
};

const AUTH_TOKEN_KEY = "auth_token" as const;

type JwtPayload = {
  sub?: string;
  [key: string]: unknown;
};

const safeGetStorage = (kind: StorageKind): Storage | null => {
  if (!hasWindow) return null;
  try {
    const storage = kind === "local" ? window.localStorage : window.sessionStorage;
    const probeKey = "__eco_identity_probe__";
    storage.setItem(probeKey, "1");
    storage.removeItem(probeKey);
    return storage;
  } catch {
    return null;
  }
};

const getLocalStorage = () => safeGetStorage("local");
const getSessionStorage = () => safeGetStorage("session");

const normalizeId = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const generateId = (): string => {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* noop */
  }
  return `eco-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const decodeJwt = (token: string): JwtPayload | null => {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const hasBuffer = typeof globalThis !== "undefined" && typeof (globalThis as any).Buffer !== "undefined";
    const json =
      typeof window === "undefined" && hasBuffer
        ? (globalThis as any).Buffer.from(padded, "base64").toString("utf-8")
        : typeof atob === "function"
        ? atob(padded)
        : "";
    if (!json) return null;
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const rememberGuestId = (candidate: unknown): string | null => {
  const normalized = normalizeId(candidate);
  if (!normalized) return null;
  inMemory.guestId = normalized;
  try {
    getLocalStorage()?.setItem(GUEST_STORAGE_KEY, normalized);
  } catch {
    /* noop */
  }
  return normalized;
};

const rememberSessionId = (candidate: unknown): string | null => {
  const normalized = normalizeId(candidate);
  if (!normalized) return null;
  inMemory.sessionId = normalized;
  const storages = [getSessionStorage(), getLocalStorage()].filter(Boolean) as Storage[];
  for (const storage of storages) {
    try {
      storage.setItem(SESSION_STORAGE_KEY, normalized);
    } catch {
      /* noop */
    }
  }
  return normalized;
};

const readStoredGuestId = (): string | null => {
  if (inMemory.guestId) return inMemory.guestId;
  try {
    const stored = getLocalStorage()?.getItem(GUEST_STORAGE_KEY) ?? null;
    if (stored) {
      const normalized = normalizeId(stored);
      if (normalized) {
        inMemory.guestId = normalized;
        return normalized;
      }
    }
  } catch {
    /* noop */
  }
  return null;
};

const readStoredSessionId = (): string | null => {
  if (inMemory.sessionId) return inMemory.sessionId;
  const storages = [getSessionStorage(), getLocalStorage()].filter(Boolean) as Storage[];
  for (const storage of storages) {
    try {
      const stored = storage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        const normalized = normalizeId(stored);
        if (normalized) {
          inMemory.sessionId = normalized;
          return normalized;
        }
      }
    } catch {
      /* noop */
    }
  }
  return null;
};

export const getOrCreateGuestId = (): string => {
  const stored = readStoredGuestId();
  if (stored) {
    rememberGuestId(stored);
    return stored;
  }
  const generated = generateId();
  rememberGuestId(generated);
  return generated;
};

export const getOrCreateSessionId = (): string => {
  const stored = readStoredSessionId();
  if (stored) {
    rememberSessionId(stored);
    return stored;
  }
  const generated = generateId();
  rememberSessionId(generated);
  return generated;
};

export const getSessionId = (): string | null => {
  if (!hasWindow) return readStoredSessionId();
  const stored = readStoredSessionId();
  if (stored) return stored;
  return getOrCreateSessionId();
};

export const getUserIdFromStore = (): string | null => {
  if (!hasWindow) return null;
  try {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return null;
    const payload = decodeJwt(token);
    return typeof payload?.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
};

type HeaderSource = Headers | Response | Record<string, unknown> | null | undefined;

const extractHeaderValue = (source: HeaderSource, names: string[]): string | null => {
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

export const rememberIdsFromResponse = (source: HeaderSource): void => {
  const guestId = extractHeaderValue(source, ["X-Eco-Guest-Id", "x-eco-guest-id", "X-Guest-Id", "x-guest-id"]);
  if (guestId) {
    rememberGuestId(guestId);
  }
  const sessionId = extractHeaderValue(source, [
    "X-Eco-Session-Id",
    "x-eco-session-id",
    "X-Session-Id",
    "x-session-id",
  ]);
  if (sessionId) {
    rememberSessionId(sessionId);
  }
};

export const __private = {
  rememberGuestId,
  rememberSessionId,
};

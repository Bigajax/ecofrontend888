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

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuidV4 = (value: string): boolean => UUID_V4_REGEX.test(value);

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

const normalizeUuid = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const lowered = trimmed.toLowerCase();
  return isUuidV4(lowered) ? lowered : null;
};

const generateRandomBytes = (size: number): Uint8Array => {
  const bytes = new Uint8Array(size);
  try {
    if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
      return crypto.getRandomValues(bytes);
    }
  } catch {
    /* noop */
  }

  for (let i = 0; i < size; i += 1) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
};

const bytesToUuid = (bytes: Uint8Array): string => {
  const hex: string[] = [];
  for (let i = 0; i < bytes.length; i += 1) {
    hex.push(bytes[i].toString(16).padStart(2, "0"));
  }
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
};

const generateUuidV4 = (): string => {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* noop */
  }

  const bytes = generateRandomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return bytesToUuid(bytes);
};

const decodeJwt = (token: string): JwtPayload | null => {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const globalBuffer = (globalThis as typeof globalThis & {
      Buffer?: { from(input: string, encoding: string): { toString(encoding: string): string } };
    }).Buffer;
    const json =
      typeof window === "undefined" && globalBuffer
        ? globalBuffer.from(padded, "base64").toString("utf-8")
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
  const normalized = normalizeUuid(candidate);
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
  const normalized = normalizeUuid(candidate);
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
      const normalized = normalizeUuid(stored);
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
        const normalized = normalizeUuid(stored);
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
  const generated = generateUuidV4();
  rememberGuestId(generated);
  return generated;
};

export const getOrCreateSessionId = (): string => {
  const stored = readStoredSessionId();
  if (stored) {
    rememberSessionId(stored);
    return stored;
  }
  const generated = generateUuidV4();
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

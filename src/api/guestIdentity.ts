import { v4 as uuidv4 } from "uuid";

const KEY = "eco.guestId";
const COOKIE_NAME = "guest_id";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 ano
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const hasWindow = typeof window !== "undefined";

type NullableString = string | null | undefined;

const readFromLocalStorage = (): string | null => {
  if (!hasWindow) return null;
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

const writeToLocalStorage = (value: string) => {
  if (!hasWindow) return;
  try {
    window.localStorage.setItem(KEY, value);
  } catch {
    return;
  }
};

const removeFromLocalStorage = () => {
  if (!hasWindow) return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    return;
  }
};

const readFromCookie = (): string | null => {
  if (!hasWindow) return null;
  try {
    const cookies = document.cookie ? document.cookie.split(";") : [];
    for (const raw of cookies) {
      const [name, ...rest] = raw.trim().split("=");
      if (decodeURIComponent(name) === COOKIE_NAME) {
        return decodeURIComponent(rest.join("="));
      }
    }
  } catch {
    return null;
  }
  return null;
};

const writeCookie = (value: string) => {
  if (!hasWindow) return;
  try {
    const secure = window.location?.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${encodeURIComponent(COOKIE_NAME)}=${encodeURIComponent(
      value
    )}; Max-Age=${COOKIE_MAX_AGE_SECONDS}; path=/; SameSite=Lax${secure}`;
  } catch {
    return;
  }
};

const clearCookie = () => {
  if (!hasWindow) return;
  try {
    const secure = window.location?.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${encodeURIComponent(COOKIE_NAME)}=; Max-Age=0; path=/; SameSite=Lax${secure}`;
  } catch {
    return;
  }
};

const normalizeUuid = (uuid: string) => uuid.toLowerCase();

export const normalizeGuestIdFormat = (input: NullableString): string => {
  const raw = (input ?? "").trim();
  if (!raw) return "";

  const candidate = raw.replace(/^guest[:-]/i, "guest_");
  if (candidate.toLowerCase().startsWith("guest_") && candidate.length > 6) {
    const suffix = candidate.slice(6);
    if (UUID_V4_REGEX.test(suffix)) {
      return `guest_${normalizeUuid(suffix)}`;
    }
  }

  if (UUID_V4_REGEX.test(raw)) {
    return `guest_${normalizeUuid(raw)}`;
  }

  return raw.toLowerCase();
};

const persistNormalizedGuestId = (guestId: string) => {
  if (!guestId) return;
  writeToLocalStorage(guestId);
  writeCookie(guestId);
};

export const readPersistedGuestId = (): string | null => {
  const fromStorage = normalizeGuestIdFormat(readFromLocalStorage());
  if (fromStorage) {
    persistNormalizedGuestId(fromStorage);
    return fromStorage;
  }

  const fromCookie = normalizeGuestIdFormat(readFromCookie());
  if (fromCookie) {
    persistNormalizedGuestId(fromCookie);
    return fromCookie;
  }

  return null;
};

export const persistGuestId = (guestId: string) => {
  const normalized = normalizeGuestIdFormat(guestId);
  if (!normalized) return;
  persistNormalizedGuestId(normalized);
};

export const clearGuestId = () => {
  removeFromLocalStorage();
  clearCookie();
};

export const removePersistedGuestId = () => {
  clearGuestId();
};

export const getOrCreateGuestId = (): string => {
  const existing = readPersistedGuestId();
  if (existing) return existing;

  const generated = `guest_${normalizeUuid(uuidv4())}`;
  if (hasWindow) {
    persistNormalizedGuestId(generated);
  }
  return generated;
};

export const ensureGuestId = (): string => getOrCreateGuestId();

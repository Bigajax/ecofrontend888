import { v4 as uuidv4 } from "uuid";

import { hasWindow, isDev } from "./environment";

const GUEST_ID_KEY = "eco_guest_id";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

const normalizeUuid = (value: string) => value.toLowerCase();

export const normalizeGuestIdFormat = (id: string | null | undefined) => {
  const candidate = (id ?? "").trim();
  if (!candidate) return "";

  const normalized = candidate.replace(/^guest[:-]/i, "guest_");
  if (/^guest_[0-9a-fA-F-]{36}$/.test(normalized)) {
    const uuid = normalized.slice("guest_".length);
    return `guest_${normalizeUuid(uuid)}`;
  }

  if (/^[0-9a-fA-F-]{36}$/.test(candidate)) {
    return `guest_${normalizeUuid(candidate)}`;
  }

  return normalized.toLowerCase();
};

export const safeLocalStorageGet = (key: string) => {
  if (!hasWindow()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    if (isDev) console.warn(`⚠️ [ECO API] Falha ao ler localStorage (${key})`, error);
    return null;
  }
};

export const safeLocalStorageSet = (key: string, value: string) => {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    if (isDev) console.warn(`⚠️ [ECO API] Falha ao salvar localStorage (${key})`, error);
  }
};

export const safeLocalStorageRemove = (key: string) => {
  if (!hasWindow()) return;
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    if (isDev) console.warn(`⚠️ [ECO API] Falha ao remover localStorage (${key})`, error);
  }
};

const safeCookieGet = (key: string) => {
  if (!hasWindow()) return null;
  try {
    const cookies = document.cookie ? document.cookie.split(";") : [];
    for (const rawCookie of cookies) {
      const [name, ...rest] = rawCookie.trim().split("=");
      if (decodeURIComponent(name) === key) {
        return decodeURIComponent(rest.join("="));
      }
    }
  } catch (error) {
    if (isDev) console.warn(`⚠️ [ECO API] Falha ao ler cookie (${key})`, error);
  }
  return null;
};

const safeCookieSet = (key: string, value: string, maxAgeSeconds = ONE_YEAR_SECONDS) => {
  if (!hasWindow()) return;
  try {
    const sanitizedValue = value.replace(/\s+/g, "");
    const secure = window.location?.protocol === "https:" ? ";Secure" : "";
    const maxAge = Math.max(60, Math.floor(maxAgeSeconds));
    document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(sanitizedValue)};path=/;max-age=${maxAge};SameSite=Lax${secure}`;
  } catch (error) {
    if (isDev) console.warn(`⚠️ [ECO API] Falha ao salvar cookie (${key})`, error);
  }
};

const safeCookieRemove = (key: string) => {
  if (!hasWindow()) return;
  try {
    const secure = window.location?.protocol === "https:" ? ";Secure" : "";
    document.cookie = `${encodeURIComponent(key)}=;path=/;max-age=0;expires=Thu, 01 Jan 1970 00:00:00 GMT;SameSite=Lax${secure}`;
  } catch (error) {
    if (isDev) console.warn(`⚠️ [ECO API] Falha ao remover cookie (${key})`, error);
  }
};

export const generateGuestId = () => {
  if (hasWindow()) {
    const { crypto } = window;
    if (crypto && typeof crypto.randomUUID === "function") {
      try {
        return `guest_${crypto.randomUUID()}`;
      } catch (error) {
        if (isDev)
          console.warn("⚠️ [ECO API] Falha ao gerar guestId com crypto.randomUUID", error);
      }
    }
  }
  return `guest_${uuidv4()}`;
};

export const readPersistedGuestId = (): string | null => {
  const fromLocalStorage = normalizeGuestIdFormat(safeLocalStorageGet(GUEST_ID_KEY));
  if (fromLocalStorage) {
    return fromLocalStorage;
  }

  const fromCookie = normalizeGuestIdFormat(safeCookieGet(GUEST_ID_KEY));
  if (fromCookie) {
    safeLocalStorageSet(GUEST_ID_KEY, fromCookie);
    return fromCookie;
  }

  return null;
};

export const persistGuestId = (guestId: string) => {
  const normalized = normalizeGuestIdFormat(guestId);
  if (!normalized) return;

  safeLocalStorageSet(GUEST_ID_KEY, normalized);
  safeCookieSet(GUEST_ID_KEY, normalized);
};

export const ensureGuestId = () => {
  const stored = readPersistedGuestId();
  if (stored) {
    persistGuestId(stored);
    return stored;
  }

  const generated = generateGuestId();
  persistGuestId(generated);
  return generated;
};

export const removePersistedGuestId = () => {
  safeLocalStorageRemove(GUEST_ID_KEY);
  safeCookieRemove(GUEST_ID_KEY);
};

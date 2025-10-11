import { v4 as uuidv4 } from "uuid";

import { hasWindow, isDev } from "./environment";

export const normalizeGuestIdFormat = (id: string | null | undefined) =>
  (id ?? "").replace(/^guest[:\-]/i, "guest_");

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

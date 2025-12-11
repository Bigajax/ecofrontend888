import { useCallback, useEffect, useMemo, useState } from "react";
import { clearGuestId, getOrCreateGuestId } from "../api/guestIdentity";

const hasWindow = typeof window !== "undefined";

// chaves legadas + atuais
const LEGACY_STORAGE_KEYS = [
  "eco.guestId",
  "eco_guest_id",
  "eco.guest.id",
  "eco.guest.interactionCount",
  "eco.guest.inputDisabled",
  "eco.guest.gateTracked",
];

const STORAGE = {
  COUNT: "eco.guest.interactionCount.v2",
  INPUT_DISABLED: "eco.guest.inputDisabled.v2",
};

export function clearGuestStorage() {
  if (hasWindow) {
    try {
      LEGACY_STORAGE_KEYS.concat(Object.values(STORAGE)).forEach((key) =>
        window.localStorage.removeItem(key)
      );
    } catch {
      /* ignore */
    }
  }
  clearGuestId();
}

const DEFAULT_LIMIT = 6;

function readInt(key: string, fallback = 0) {
  if (!hasWindow) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return fallback;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

function readBool(key: string, fallback = false) {
  if (!hasWindow) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return fallback;
    return raw === "1" || raw === "true";
  } catch {
    return fallback;
  }
}

function write(key: string, value: string) {
  if (!hasWindow) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function useGuestGate(isLogged: boolean, isGuestMode: boolean = false) {
  // guestId - only create if explicitly in guest mode
  const [guestId, setGuestId] = useState<string | null>(() => {
    if (isLogged || !hasWindow) return null;
    // CRITICAL: Only create guest ID if explicitly in guest mode
    if (!isGuestMode) return null;
    try {
      return getOrCreateGuestId();
    } catch {
      return null;
    }
  });

  // estado persistido
  const [count, setCount] = useState<number>(() => readInt(STORAGE.COUNT, 0));
  const [inputDisabled, setInputDisabled] = useState<boolean>(() =>
    readBool(STORAGE.INPUT_DISABLED, false)
  );

  const limit = DEFAULT_LIMIT;
  const reachedLimit = count >= limit || inputDisabled;

  // quando logar, limpa tudo
  useEffect(() => {
    if (!hasWindow) return;
    if (isLogged) {
      // User is logged in - clear all guest data
      clearGuestStorage();
      setGuestId(null);
      setCount(0);
      setInputDisabled(false);
    } else if (isGuestMode) {
      // Explicitly in guest mode - create/restore guest ID
      setGuestId(getOrCreateGuestId());
      // reidrata caso tenha sido limpo em outra aba
      setCount(readInt(STORAGE.COUNT, 0));
      setInputDisabled(readBool(STORAGE.INPUT_DISABLED, false));
    } else {
      // Not logged in and not in guest mode - clear everything
      setGuestId(null);
      setCount(0);
      setInputDisabled(false);
    }
  }, [isLogged, isGuestMode]);

  // persiste mudanças locais
  useEffect(() => {
    write(STORAGE.COUNT, String(count));
  }, [count]);

  useEffect(() => {
    write(STORAGE.INPUT_DISABLED, inputDisabled ? "1" : "0");
  }, [inputDisabled]);

  // sincroniza com outras abas/janelas
  useEffect(() => {
    if (!hasWindow) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE.COUNT) {
        setCount(readInt(STORAGE.COUNT, 0));
      } else if (e.key === STORAGE.INPUT_DISABLED) {
        setInputDisabled(readBool(STORAGE.INPUT_DISABLED, false));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // registra interação (chamar ANTES do envio)
  const registerUserInteraction = useCallback(() => {
    // se já desabilitado, não incrementa mais
    if (inputDisabled) return;

    setCount((prev) => {
      const next = prev + 1;
      // se bateu ou passou do limite, trava input
      if (next >= limit) {
        setInputDisabled(true);
      }
      return next;
    });
  }, [inputDisabled, limit]);

  return useMemo(
    () => ({
      guestId,
      count,
      limit,
      reachedLimit,
      inputDisabled,
      registerUserInteraction,
    }),
    [guestId, count, limit, reachedLimit, inputDisabled, registerUserInteraction]
  );
}

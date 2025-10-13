import { useCallback, useEffect, useMemo, useState } from "react";

import { clearGuestId, getOrCreateGuestId } from "../api/guestIdentity";

const hasWindow = typeof window !== "undefined";

const LEGACY_STORAGE_KEYS = [
  "eco.guestId",
  "eco_guest_id",
  "eco.guest.id",
  "eco.guest.interactionCount",
  "eco.guest.inputDisabled",
  "eco.guest.gateTracked",
];

export function clearGuestStorage() {
  if (hasWindow) {
    try {
      LEGACY_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
    } catch {
      return;
    }
  }
  clearGuestId();
}

const DEFAULT_LIMIT = 6;

export function useGuestGate(isLogged: boolean) {
  const [guestId, setGuestId] = useState<string | null>(() => {
    if (isLogged || !hasWindow) return null;
    try {
      return getOrCreateGuestId();
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!hasWindow) return;

    if (isLogged) {
      clearGuestStorage();
      setGuestId(null);
    } else {
      setGuestId(getOrCreateGuestId());
    }
  }, [isLogged]);

  const registerUserInteraction = useCallback(() => {}, []);

  return useMemo(
    () => ({
      guestId,
      count: 0,
      limit: DEFAULT_LIMIT,
      reachedLimit: false,
      inputDisabled: false,
      registerUserInteraction,
    }),
    [guestId, registerUserInteraction],
  );
}

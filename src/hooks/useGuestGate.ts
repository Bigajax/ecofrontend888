import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';

import mixpanel from '../lib/mixpanel';

export const GUEST_ID_KEY = 'eco.guest.id';
export const GUEST_INTERACTION_COUNT_KEY = 'eco.guest.interactionCount';
export const GUEST_INPUT_DISABLED_KEY = 'eco.guest.inputDisabled';
const GUEST_GATE_TRACKED_KEY = 'eco.guest.gateTracked';
const LIMIT = 6;

const hasWindow = () => typeof window !== 'undefined';

const safeGetItem = (key: string) => {
  if (!hasWindow()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch (err) {
    console.warn('[GuestGate] Falha ao ler localStorage', err);
    return null;
  }
};

const safeSetItem = (key: string, value: string) => {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch (err) {
    console.warn('[GuestGate] Falha ao salvar localStorage', err);
  }
};

const safeRemoveItem = (key: string) => {
  if (!hasWindow()) return;
  try {
    window.localStorage.removeItem(key);
  } catch (err) {
    console.warn('[GuestGate] Falha ao remover localStorage', err);
  }
};

export function clearGuestStorage() {
  [
    GUEST_ID_KEY,
    GUEST_INTERACTION_COUNT_KEY,
    GUEST_INPUT_DISABLED_KEY,
    GUEST_GATE_TRACKED_KEY,
  ].forEach((key) => safeRemoveItem(key));
}

export function useGuestGate(enabled: boolean) {
  const [guestId, setGuestId] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [inputDisabled, setInputDisabled] = useState(false);

  const reachedLimit = count >= LIMIT;
  const guestIdRef = useRef<string | null>(null);
  const gateTrackedRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setGuestId(null);
      setCount(0);
      setInputDisabled(false);
      gateTrackedRef.current = false;
      return;
    }

    let id = safeGetItem(GUEST_ID_KEY);
    if (!id) {
      id = uuid();
      safeSetItem(GUEST_ID_KEY, id);
      mixpanel.track('guest_start', { guestId: id });
    }
    setGuestId(id);
    guestIdRef.current = id;

    const storedCountRaw = safeGetItem(GUEST_INTERACTION_COUNT_KEY);
    const storedCount = storedCountRaw ? Number(storedCountRaw) : 0;
    const validCount = Number.isFinite(storedCount) ? Math.max(0, Math.floor(storedCount)) : 0;
    setCount(validCount);

    const disabled = safeGetItem(GUEST_INPUT_DISABLED_KEY) === '1';
    setInputDisabled(disabled || validCount >= LIMIT);

    gateTrackedRef.current = safeGetItem(GUEST_GATE_TRACKED_KEY) === '1' || disabled || validCount >= LIMIT;
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    safeSetItem(GUEST_INTERACTION_COUNT_KEY, String(count));

    if (count >= LIMIT) {
      safeSetItem(GUEST_INPUT_DISABLED_KEY, '1');
      setInputDisabled(true);
      if (!gateTrackedRef.current && guestIdRef.current) {
        gateTrackedRef.current = true;
        safeSetItem(GUEST_GATE_TRACKED_KEY, '1');
        mixpanel.track('guest_gate_shown', {
          guestId: guestIdRef.current,
          count,
        });
      }
    } else {
      safeRemoveItem(GUEST_INPUT_DISABLED_KEY);
      safeRemoveItem(GUEST_GATE_TRACKED_KEY);
      gateTrackedRef.current = false;
      setInputDisabled(false);
    }
  }, [count, enabled]);

  const registerUserInteraction = useCallback(() => {
    if (!enabled) return;
    setCount((prev) => {
      if (prev >= LIMIT) return prev;
      const next = prev + 1;
      if (guestIdRef.current) {
        mixpanel.track('guest_message', {
          guestId: guestIdRef.current,
          count: next,
        });
      }
      return next;
    });
  }, [enabled]);

  const resetGuest = useCallback(() => {
    clearGuestStorage();
    guestIdRef.current = null;
    gateTrackedRef.current = false;
    setGuestId(null);
    setCount(0);
    setInputDisabled(false);
  }, []);

  return useMemo(
    () => ({
      guestId,
      count,
      limit: LIMIT,
      inputDisabled,
      reachedLimit,
      registerUserInteraction,
      resetGuest,
    }),
    [count, guestId, inputDisabled, reachedLimit, registerUserInteraction, resetGuest],
  );
}

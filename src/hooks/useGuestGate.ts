import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';

import { persistGuestId, removePersistedGuestId } from '../api/guestIdentity';
import mixpanel from '../lib/mixpanel';

export const GUEST_ID_KEY = 'eco_guest_id';
const LEGACY_GUEST_ID_KEY = 'eco.guest.id';
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
  removePersistedGuestId();
  [
    LEGACY_GUEST_ID_KEY,
    GUEST_INTERACTION_COUNT_KEY,
    GUEST_INPUT_DISABLED_KEY,
    GUEST_GATE_TRACKED_KEY,
  ].forEach((key) => safeRemoveItem(key));
}

/* ---------------- Normalização de guestId ---------------- */

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Converte qualquer variação para o canônico "guest_<uuid>" */
function toCanonicalGuestId(input: string | null | undefined): string | null {
  if (!input) return null;
  const raw = String(input).trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();

  // uuid puro → guest_uuid
  if (UUID_V4_REGEX.test(lower)) return `guest_${lower}`;

  // guest_ / guest: / guest- + uuid → guest_uuid
  const prefixes = ['guest_', 'guest:', 'guest-'];
  for (const p of prefixes) {
    if (lower.startsWith(p)) {
      const candidate = lower.slice(p.length);
      if (UUID_V4_REGEX.test(candidate)) return `guest_${candidate}`;
    }
  }

  return null;
}

/* ---------------- Hook ---------------- */

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

    // 1) ler eco_guest_id (ou legado) e normalizar
    let id = safeGetItem(GUEST_ID_KEY);
    if (!id) {
      const legacyId = safeGetItem(LEGACY_GUEST_ID_KEY);
      if (legacyId) {
        id = legacyId;
        safeRemoveItem(LEGACY_GUEST_ID_KEY);
      }
    }

    let canonical = toCanonicalGuestId(id);

    // gerar se ausente/ilegível
    if (!canonical) {
      canonical = `guest_${uuid()}`;
    }

    // persistir o canônico (corrige formatos antigos automaticamente)
    persistGuestId(canonical);

    setGuestId(canonical);
    guestIdRef.current = canonical;

    // 2) recuperar contadores/flags
    const storedCountRaw = safeGetItem(GUEST_INTERACTION_COUNT_KEY);
    const storedCount = storedCountRaw ? Number(storedCountRaw) : 0;
    const validCount = Number.isFinite(storedCount) ? Math.max(0, Math.floor(storedCount)) : 0;
    setCount(validCount);

    const disabled = safeGetItem(GUEST_INPUT_DISABLED_KEY) === '1';
    setInputDisabled(disabled || validCount >= LIMIT);

    gateTrackedRef.current =
      safeGetItem(GUEST_GATE_TRACKED_KEY) === '1' || disabled || validCount >= LIMIT;

    // evento de início apenas quando realmente criamos um novo
    if (!id) {
      mixpanel.track('guest_start', { guestId: canonical });
    }
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

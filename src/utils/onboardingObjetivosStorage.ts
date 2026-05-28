// src/utils/onboardingObjetivosStorage.ts

import type { GoalId } from "@/components/assinar/goalsData";

const ANSWERS_KEY = "eco.assinar.objetivos.v1";
const RESPONSE_ID_KEY = "eco.assinar.objetivos.responseId";

export interface StoredObjetivos {
  answers: GoalId[];
  skipped: boolean;
}

function safeStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

export function getStoredObjetivos(): StoredObjetivos | null {
  const store = safeStorage();
  if (!store) return null;
  const raw = store.getItem(ANSWERS_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.answers) || typeof parsed.skipped !== "boolean") {
      return null;
    }
    return parsed as StoredObjetivos;
  } catch {
    return null;
  }
}

export function setStoredObjetivos(value: StoredObjetivos): void {
  const store = safeStorage();
  if (!store) return;
  try {
    store.setItem(ANSWERS_KEY, JSON.stringify(value));
  } catch {
    /* quota / disabled — ignore */
  }
}

export function clearStoredObjetivos(): void {
  safeStorage()?.removeItem(ANSWERS_KEY);
}

export function getStoredResponseId(): string | null {
  return safeStorage()?.getItem(RESPONSE_ID_KEY) ?? null;
}

export function setStoredResponseId(id: string): void {
  safeStorage()?.setItem(RESPONSE_ID_KEY, id);
}

export function clearStoredResponseId(): void {
  safeStorage()?.removeItem(RESPONSE_ID_KEY);
}

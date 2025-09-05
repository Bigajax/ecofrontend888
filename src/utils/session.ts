// src/utils/session.ts

/** Gera (ou recupera) um ID de sessão/visitante persistente por navegador. */
export function getOrCreateSessionId(key = "eco_session_id"): string {
  const storage = safeStorage("local") ?? safeStorage("session") ?? memoryStorage();
  let id = storage.getItem(key);
  if (!id) {
    id = generateId();
    storage.setItem(key, id);
  }
  return id;
}

/** Opcional: reseta o ID (ex.: ao deslogar se você quiser um novo visitante). */
export function resetSessionId(key = "eco_session_id") {
  try {
    (window?.localStorage ?? window?.sessionStorage)?.removeItem(key);
  } catch { /* noop */ }
}

/* -------------------------- helpers internos -------------------------- */

function generateId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return `eco_${crypto.randomUUID()}`;
    }
    // fallback com bytes aleatórios
    const arr = new Uint8Array(16);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(arr);
    else for (let i = 0; i < 16; i++) arr[i] = Math.floor(Math.random() * 256);
    return "eco_" + Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
  } catch {
    // último fallback
    return "eco_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

function safeStorage(kind: "local" | "session") {
  try {
    const s = kind === "local" ? window.localStorage : window.sessionStorage;
    const test = "__eco_test__";
    s.setItem(test, "1"); s.removeItem(test);
    return s;
  } catch {
    return null;
  }
}

function memoryStorage() {
  const m: Record<string, string> = {};
  return {
    getItem: (k: string) => (k in m ? m[k] : null),
    setItem: (k: string, v: string) => { m[k] = v; },
    removeItem: (k: string) => { delete m[k]; },
  };
}

import { ensureHttpsUrl } from "../utils/ensureHttpsUrl";
import { stripTrailingApiSegments } from "../utils/stripTrailingApiSegments";

/* eslint-disable no-underscore-dangle */
declare const __API_BASE__: string | undefined; // pode não existir

// ---- leitura de envs em diferentes contextos -------------------------------

const readEnvApiUrl = (): string => {
  // 1) Vite (browser/build)
  const fromImportMeta =
    (import.meta as any)?.env?.VITE_API_URL ??
    (import.meta as any)?.env?.NEXT_PUBLIC_API_URL;

  if (typeof fromImportMeta === "string" && fromImportMeta.trim()) {
    return fromImportMeta.trim();
  }

  // 2) Macro injetado no build pelo Vite (vite.config define.__API_BASE__)
  if (typeof __API_BASE__ !== "undefined" && __API_BASE__?.trim()) {
    return __API_BASE__.trim();
  }

  // 3) Node/process (SSR/testes)
  const globalProcess =
    typeof globalThis !== "undefined" && (globalThis as any).process
      ? ((globalThis as any).process as { env?: Record<string, unknown> })
      : undefined;

  const fromProcess =
    (globalProcess?.env?.VITE_API_URL as string | undefined) ??
    (globalProcess?.env?.NEXT_PUBLIC_API_URL as string | undefined);

  if (typeof fromProcess === "string" && fromProcess.trim()) {
    return fromProcess.trim();
  }

  // Nada encontrado
  return "";
};

// ---- normalização ----------------------------------------------------------

const normalizeApiBase = (value: string): string => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return "";

  let candidate = trimmed;

  // suportar "//host" ou "host" → força https
  if (candidate.startsWith("//")) {
    candidate = `https:${candidate}`;
  } else if (!/^https?:/i.test(candidate)) {
    candidate = `https://${candidate.replace(/^\/+/, "")}`;
  }

  candidate = ensureHttpsUrl(candidate);

  try {
    const parsed = new URL(candidate);

    // Proteção contra host inválido "api"
    if (parsed.hostname === "api") {
      // invalid; devolve vazio para acionar fallback
      return "";
    }

    const sanitizedPath = stripTrailingApiSegments(parsed.pathname);
    const finalPath = sanitizedPath === "/" ? "" : sanitizedPath;
    return finalPath ? `${parsed.origin}${finalPath}` : parsed.origin;
  } catch {
    return "";
  }
};

// ---- resolução final + fallbacks -------------------------------------------

const rawEnvApiBase = readEnvApiUrl();
const normalizedEnvApiBase = normalizeApiBase(rawEnvApiBase);

export const RAW_API_BASE = rawEnvApiBase;

// Fallbacks (enquanto estabiliza as envs de deploy)
const REMOTE_API_BASE_FALLBACK = "https://ecobackend888.onrender.com";

// Se quiser separar local vs prod, troque aqui:
// const DEFAULT_BROWSER_API_BASE = window?.location?.hostname?.includes("localhost")
//   ? "http://localhost:3000"
//   : REMOTE_API_BASE_FALLBACK;

const DEFAULT_BROWSER_API_BASE = REMOTE_API_BASE_FALLBACK;
const DEFAULT_NON_BROWSER_API_BASE = REMOTE_API_BASE_FALLBACK;

export const DEFAULT_API_BASE =
  typeof window === "undefined" ? DEFAULT_NON_BROWSER_API_BASE : DEFAULT_BROWSER_API_BASE;

export const IS_API_BASE_EMPTY = normalizedEnvApiBase.length === 0;

// Valor efetivo a ser usado pelo app
export function getApiBase(): string {
  return normalizedEnvApiBase || DEFAULT_API_BASE;
}

export const API_BASE = getApiBase();

// Helper para montar URLs de API
export const apiUrl = (p: string): string =>
  `${API_BASE}${p.startsWith("/") ? p : `/${p}`}`;

// Aviso útil em dev local se estiver usando fallback
const isLocalhost = (() => {
  if (typeof location === "undefined") return false;
  const host = location.hostname;
  return host === "localhost" || host === "127.0.0.1";
})();

export const SHOW_API_BASE_WARNING = IS_API_BASE_EMPTY && isLocalhost;
if (SHOW_API_BASE_WARNING) {
  // log temporário
  // eslint-disable-next-line no-console
  console.warn("[ECO] API_BASE vazio nas envs; usando fallback:", API_BASE);
}

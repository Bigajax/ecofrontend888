import { ensureHttpsUrl } from "../utils/ensureHttpsUrl";
import { stripTrailingApiSegments } from "../utils/stripTrailingApiSegments";
import { API_BASE as SIMPLE_API_BASE } from "../api/config";

 
declare const __API_BASE__: string | undefined;

// ---------- utils ----------
const trimTrailingSlashes = (v: string) => v.replace(/\/+$/, "");

const normalizeHostPath = (candidate: string): string => {
  const trimmed = candidate.trim();
  if (!trimmed) return "";

  // Suportar "//host" ou "host" → força https
  const baseCandidate = trimmed.startsWith("//")
    ? `https:${trimmed}`
    : /^https?:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed.replace(/^\/+/, "")}`;

  try {
    const u = new URL(ensureHttpsUrl(baseCandidate));

    // ❌ Nunca aceitar host "api"
    if (u.hostname === "api") return "";

    const sanitizedPath = stripTrailingApiSegments(u.pathname);
    const finalPath = sanitizedPath === "/" ? "" : sanitizedPath;
    return finalPath ? `${u.origin}${finalPath}` : u.origin;
  } catch {
    // relativo (evite no browser)
    if (trimmed.startsWith("/")) {
      const collapsed = trimTrailingSlashes(trimmed) || "/";
      const normalized = stripTrailingApiSegments(collapsed);
      return normalized || "/";
    }
    return stripTrailingApiSegments(trimTrailingSlashes(trimmed) || trimmed) || "";
  }
};

// ---------- read envs ----------
const readEnvApiUrl = (): string => {
  // Vite
  const env = (import.meta as any)?.env ?? {};
  const fromImportMeta = env.VITE_API_URL || env.NEXT_PUBLIC_API_URL;
  if (typeof fromImportMeta === "string" && fromImportMeta.trim()) return fromImportMeta.trim();

  // Macro definida no build (vite.config define.__API_BASE__)
  if (typeof __API_BASE__ !== "undefined" && __API_BASE__?.trim()) return __API_BASE__.trim();

  // Process (SSR/testes)
  const gp = (globalThis as any)?.process?.env ?? {};
  const fromProcess = gp.VITE_API_URL || gp.NEXT_PUBLIC_API_URL;
  if (typeof fromProcess === "string" && fromProcess.trim()) return fromProcess.trim();

  // Config simples (se existir)
  if (typeof SIMPLE_API_BASE === "string" && SIMPLE_API_BASE.trim()) return SIMPLE_API_BASE.trim();

  return "";
};

// ---------- resolution ----------
const REMOTE_API_BASE_FALLBACK = "https://ecobackend888.onrender.com";

const rawEnv = readEnvApiUrl();
const normalizedEnv = normalizeHostPath(rawEnv);

// No browser, não use base vazia (evita caminhos relativos/CORS surpresa)
const DEFAULT_BROWSER_API_BASE = REMOTE_API_BASE_FALLBACK;
// Em Node/testes, pode ser o mesmo fallback (ou ajuste se quiser localhost)
const DEFAULT_NON_BROWSER_API_BASE = REMOTE_API_BASE_FALLBACK;

export const DEFAULT_API_BASE =
  typeof window === "undefined" ? DEFAULT_NON_BROWSER_API_BASE : DEFAULT_BROWSER_API_BASE;

export const RAW_API_BASE = rawEnv;
export const IS_API_BASE_EMPTY = normalizedEnv.length === 0;

// Valor efetivo final
export const API_BASE_URL = normalizedEnv || DEFAULT_API_BASE;

// Montador de URLs de API
const normalizePath = (p: string) => {
  if (!p) return "/";
  const hasQ = p.includes("?");
  const [rawPath, rawQuery] = hasQ ? p.split("?") : [p, undefined];
  const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  const collapsed = path.replace(/\/+$/, "").replace(/\/{2,}/g, "/");
  const finalPath = collapsed.length === 0 ? "/" : collapsed;
  return rawQuery ? `${finalPath}?${rawQuery}` : finalPath;
};

export const resolveApiUrl = (path = ""): string => {
  if (!path) return API_BASE_URL;
  const safePath = normalizePath(path);
  if (API_BASE_URL === "/" || API_BASE_URL === "") return safePath || "/";
  const url = `${API_BASE_URL}${safePath}`;
  return /^https?:/i.test(url) ? ensureHttpsUrl(url) : url;
};

// Alias histórico
export const buildApiUrl = resolveApiUrl;

// Debug helper (browser)
declare global {
  interface Window {
    __ecoApi?: any;
  }
}
if (typeof window !== "undefined") {
  window.__ecoApi = { API_BASE_URL, resolveApiUrl };
}

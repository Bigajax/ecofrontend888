import { API_BASE as SIMPLE_API_BASE } from "../api/config";
import { ensureHttpsUrl } from "../utils/ensureHttpsUrl";
import { stripTrailingApiSegments } from "../utils/stripTrailingApiSegments";

const readEnvApiUrl = (): string => {
  const envContainer = import.meta?.env;
  const candidates: Array<unknown> = [
    envContainer?.VITE_API_BASE,
    envContainer?.VITE_API_URL,
  ];

  const gp = typeof globalThis !== "undefined" && (globalThis as any).process
    ? ((globalThis as any).process as { env?: Record<string, unknown> })
    : undefined;
  const processEnv = gp?.env;
  if (processEnv) {
    candidates.push(processEnv.VITE_API_BASE, processEnv.VITE_API_URL);
  }

  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const trimmed = candidate.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  return "";
};

const normalizeApiBase = (value: string): string => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return "";

  let candidate = trimmed;
  if (candidate.startsWith("//")) candidate = `https:${candidate}`;
  else if (!/^https?:/i.test(candidate)) candidate = `https://${candidate.replace(/^\/+/, "")}`;

  candidate = ensureHttpsUrl(candidate);

  try {
    const u = new URL(candidate);
    const sanitizedPath = stripTrailingApiSegments(u.pathname);
    const finalPath = sanitizedPath === "/" ? "" : sanitizedPath;
    return finalPath ? `${u.origin}${finalPath}` : u.origin;
  } catch {
    return "";
  }
};

const simpleBaseRaw = typeof SIMPLE_API_BASE === "string" ? SIMPLE_API_BASE.trim() : "";
const normalizedSimpleBase = normalizeApiBase(simpleBaseRaw);

const rawEnvApiBase = readEnvApiUrl();
const normalizedEnvApiBase = normalizeApiBase(rawEnvApiBase);

const REMOTE_API_BASE_FALLBACK = "https://ecobackend888.onrender.com";

// ⚠️ Em ambientes de navegador preferimos usar um host configurado explicitamente
// (quando disponível) para evitar surpresas com CORS. Ainda permitimos rotas
// relativas quando nenhuma base for definida.
const DEFAULT_BROWSER_API_BASE = normalizedSimpleBase || "";

// ⚠️ Fallback explícito para ambientes sem `window` (ex: testes) onde não há
// reescrita disponível.
const DEFAULT_NON_BROWSER_API_BASE = normalizedSimpleBase || REMOTE_API_BASE_FALLBACK;

export const DEFAULT_API_BASE = typeof window === "undefined"
  ? DEFAULT_NON_BROWSER_API_BASE
  : DEFAULT_BROWSER_API_BASE;

export const RAW_API_BASE = rawEnvApiBase || simpleBaseRaw;
export const IS_API_BASE_EMPTY =
  normalizedEnvApiBase.length === 0 && normalizedSimpleBase.length === 0;

export function getApiBase(): string {
  // se env normalizado existir, usar; depois tenta base simples; senão, fallback DEFAULT_API_BASE
  return normalizedEnvApiBase || normalizedSimpleBase || DEFAULT_API_BASE;
}

const trimTrailingSlashes = (v: string) => v.replace(/\/+$/, "");

const normalizeBase = (candidate: string): string => {
  const trimmed = candidate.trim();
  if (!trimmed) return "";
  try {
    const baseCandidate = trimmed.startsWith("//")
      ? `https:${trimmed}`
      : /^https?:/i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const u = new URL(ensureHttpsUrl(baseCandidate));
    const sanitizedPath = stripTrailingApiSegments(u.pathname);
    return sanitizedPath ? `${u.origin}${sanitizedPath}` : u.origin;
  } catch {
    // relativo
    if (trimmed.startsWith("/")) {
      const collapsed = trimTrailingSlashes(trimmed) || "/";
      const normalized = stripTrailingApiSegments(collapsed);
      return normalized || "/";
    }
    return stripTrailingApiSegments(trimTrailingSlashes(trimmed) || trimmed) || "";
  }
};

export const EFFECTIVE_API_BASE = normalizeBase(getApiBase()) || DEFAULT_API_BASE;
export const API_BASE_URL = EFFECTIVE_API_BASE;

const normalizePath = (p: string) => {
  if (!p) return "/";
  const hasQ = p.includes("?");
  const [rawPath, rawQuery] = hasQ ? p.split("?") : [p, undefined];
  const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  const collapsed = path.replace(/\/+$/, "").replace(/\/{2,}/g, "/");
  const finalPath = collapsed.length === 0 ? "/" : collapsed;
  return rawQuery ? `${finalPath}?${rawQuery}` : finalPath;
};

export const resolveApiUrl = (path = "") => {
  if (!path) return API_BASE_URL;
  const safePath = normalizePath(path);
  if (API_BASE_URL === "/" || API_BASE_URL === "") return safePath || "/";
  const url = `${API_BASE_URL}${safePath}`;
  return /^https?:/i.test(url) ? ensureHttpsUrl(url) : url;
};

export const buildApiUrl = resolveApiUrl;

// Debug helper no navegador:
declare global {
  interface Window { __ecoApi?: any }
}
if (typeof window !== "undefined") {
  window.__ecoApi = { API_BASE_URL, resolveApiUrl };
}

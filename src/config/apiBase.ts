import { ensureHttpsUrl } from "../utils/ensureHttpsUrl";
import { stripTrailingApiSegments } from "../utils/stripTrailingApiSegments";

const readEnvApiUrl = (): string => {
  const fromImportMeta = import.meta?.env?.VITE_API_URL;
  if (typeof fromImportMeta === "string" && fromImportMeta.trim().length > 0) {
    return fromImportMeta.trim();
  }

  const globalProcess =
    typeof globalThis !== "undefined" && globalThis.process
      ? (globalThis.process as { env?: Record<string, unknown> })
      : undefined;
  const fromProcess = globalProcess?.env?.VITE_API_URL;

  if (typeof fromProcess === "string" && fromProcess.trim().length > 0) {
    return fromProcess.trim();
  }

  return "";
};

const normalizeApiBase = (value: string): string => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) {
    return "";
  }

  let candidate = trimmed;

  if (candidate.startsWith("//")) {
    candidate = `https:${candidate}`;
  } else if (!/^https?:/i.test(candidate)) {
    candidate = `https://${candidate.replace(/^\/+/, "")}`;
  }

  candidate = ensureHttpsUrl(candidate);

  try {
    const parsed = new URL(candidate);
    const sanitizedPath = stripTrailingApiSegments(parsed.pathname);
    const finalPath = sanitizedPath === "/" ? "" : sanitizedPath;
    return finalPath ? `${parsed.origin}${finalPath}` : parsed.origin;
  } catch {
    return "";
  }
};

const rawEnvApiBase = readEnvApiUrl();
const normalizedEnvApiBase = normalizeApiBase(rawEnvApiBase);

export const RAW_API_BASE = rawEnvApiBase;

const REMOTE_API_BASE_FALLBACK = "https://ecobackend888.onrender.com";

const DEFAULT_BROWSER_API_BASE = "";
const DEFAULT_NON_BROWSER_API_BASE = REMOTE_API_BASE_FALLBACK;

export const DEFAULT_API_BASE = typeof window === "undefined"
  ? DEFAULT_NON_BROWSER_API_BASE
  : DEFAULT_BROWSER_API_BASE;

export const IS_API_BASE_EMPTY = normalizedEnvApiBase.length === 0;

export function getApiBase(): string {
  return normalizedEnvApiBase || DEFAULT_API_BASE;
}

const isLocalhost = (() => {
  if (typeof location === "undefined") {
    return false;
  }
  const host = location.hostname;
  return host === "localhost" || host === "127.0.0.1";
})();

export const SHOW_API_BASE_WARNING = IS_API_BASE_EMPTY && isLocalhost;

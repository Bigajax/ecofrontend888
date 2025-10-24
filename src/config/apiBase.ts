import { ensureHttpsUrl } from "../utils/ensureHttpsUrl";

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
    const pathname = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/+$/, "");
    return `${parsed.origin}${pathname}`;
  } catch {
    return "";
  }
};

const rawEnvApiBase = readEnvApiUrl();
const normalizedEnvApiBase = normalizeApiBase(rawEnvApiBase);

export const RAW_API_BASE = rawEnvApiBase;

export const DEFAULT_API_BASE = "/api";

export const IS_API_BASE_EMPTY = normalizedEnvApiBase.length === 0;

export function getApiBase(): string {
  return normalizedEnvApiBase;
}

const isLocalhost = (() => {
  if (typeof location === "undefined") {
    return false;
  }
  const host = location.hostname;
  return host === "localhost" || host === "127.0.0.1";
})();

export const SHOW_API_BASE_WARNING = IS_API_BASE_EMPTY && isLocalhost;

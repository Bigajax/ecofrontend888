import {
  DEFAULT_API_BASE as BASE_DEFAULT,
  IS_API_BASE_EMPTY as BASE_EMPTY_FLAG,
  RAW_API_BASE,
  getApiBase,
} from "../config/apiBase";
import { ensureHttpsUrl } from "../utils/ensureHttpsUrl";
import { stripTrailingApiSegments } from "../utils/stripTrailingApiSegments";

export { RAW_API_BASE, getApiBase };

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, "");

export const DEFAULT_API_BASE = BASE_DEFAULT;
export const IS_API_BASE_EMPTY = BASE_EMPTY_FLAG;

const normalizeBase = (candidate: string): string => {
  const trimmed = candidate.trim();
  if (!trimmed) {
    return "";
  }

  const sanitizeAbsolute = (value: string): string => {
    try {
      const parsed = new URL(value);
      const sanitizedPath = stripTrailingApiSegments(parsed.pathname);
      return sanitizedPath ? `${parsed.origin}${sanitizedPath}` : parsed.origin;
    } catch {
      return "";
    }
  };

  if (trimmed.startsWith("//")) {
    const absolute = ensureHttpsUrl(`https:${trimmed}`);
    return sanitizeAbsolute(absolute) || "";
  }

  if (/^https?:/i.test(trimmed)) {
    const secure = ensureHttpsUrl(trimmed);
    return sanitizeAbsolute(secure) || "";
  }

  if (trimmed.startsWith("/")) {
    const collapsed = trimTrailingSlashes(trimmed);
    if (!collapsed) {
      return "/";
    }
    const normalized = stripTrailingApiSegments(collapsed);
    return normalized || "/";
  }

  try {
    const ensured = ensureHttpsUrl(`https://${trimmed}`);
    const sanitized = sanitizeAbsolute(ensured);
    if (sanitized) {
      return sanitized;
    }
  } catch {
    /* noop */
  }

  const fallback = stripTrailingApiSegments(trimTrailingSlashes(trimmed) || trimmed);
  return fallback || "";
};

const resolveEffectiveApiBase = () => {
  const candidate = getApiBase() || BASE_DEFAULT;
  const normalized = normalizeBase(candidate);
  if (!normalized) {
    return BASE_DEFAULT;
  }
  return normalized;
};

export const EFFECTIVE_API_BASE = resolveEffectiveApiBase();
export const API_BASE_URL = EFFECTIVE_API_BASE;

const normalizePath = (value: string) => {
  if (!value) return "/";
  const hasQuery = value.includes("?");
  const [rawPath, rawQuery] = hasQuery ? value.split("?") : [value, undefined];
  const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  const collapsed = path.replace(/\/+$/, "").replace(/\/{2,}/g, "/");
  const finalPath = collapsed.length === 0 ? "/" : collapsed;
  if (!rawQuery) return finalPath || "/";
  return `${finalPath}?${rawQuery}`;
};

export const buildApiUrl = (path: string, base?: string) => {
  const safePath = normalizePath(path);
  const baseCandidate =
    typeof base === "string" && base.trim().length > 0 ? base : getApiBase() || BASE_DEFAULT;
  const normalizedBase = normalizeBase(baseCandidate);

  if (!normalizedBase) {
    return safePath || "/";
  }

  if (normalizedBase === "/") {
    return safePath || "/";
  }

  return `${normalizedBase}${safePath}`;
};

export const resolveApiUrl = (path = "") => {
  if (!path) {
    const base = getApiBase() || BASE_DEFAULT;
    const normalized = normalizeBase(base);
    if (!normalized) {
      return BASE_DEFAULT;
    }
    return normalized;
  }
  const url = buildApiUrl(path);
  if (/^https?:/i.test(url)) {
    return ensureHttpsUrl(url);
  }
  return url;
};

if (typeof window !== "undefined") {
  try {
    Object.defineProperty(window as typeof window & { __ecoApi?: unknown }, "__ecoApi", {
      configurable: true,
      enumerable: false,
      writable: true,
      value: { API_BASE_URL, resolveApiUrl },
    });
  } catch {
    (window as typeof window & { __ecoApi?: unknown }).__ecoApi = {
      API_BASE_URL,
      resolveApiUrl,
    };
  }
}

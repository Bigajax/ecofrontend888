import {
  DEFAULT_API_BASE as BASE_DEFAULT,
  IS_API_BASE_EMPTY as BASE_EMPTY_FLAG,
  RAW_API_BASE,
  getApiBase,
} from "../config/apiBase";
import { ensureHttpsUrl } from "../utils/ensureHttpsUrl";

export { RAW_API_BASE };

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, "");

export const DEFAULT_API_BASE = BASE_DEFAULT;
export const IS_API_BASE_EMPTY = BASE_EMPTY_FLAG;

const resolveEffectiveApiBase = () => {
  const candidate = getApiBase() || BASE_DEFAULT;
  if (!candidate) {
    return BASE_DEFAULT;
  }

  try {
    const parsed = new URL(candidate);
    const pathname = parsed.pathname === "/" ? "" : trimTrailingSlashes(parsed.pathname);
    return `${parsed.origin}${pathname}`;
  } catch {
    return trimTrailingSlashes(candidate) || BASE_DEFAULT;
  }
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
  const baseToUse = typeof base === "string" && base.trim() ? base : getApiBase();
  if (!baseToUse) {
    return safePath || "/";
  }
  const normalizedBase = trimTrailingSlashes(baseToUse);
  const sanitizedBase = normalizedBase || DEFAULT_API_BASE;
  const secureBase = ensureHttpsUrl(sanitizedBase);
  return `${secureBase}${safePath}`;
};

export const resolveApiUrl = (path = "") => {
  if (!path) {
    return ensureHttpsUrl(getApiBase() || "");
  }
  return ensureHttpsUrl(buildApiUrl(path));
};

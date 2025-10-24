import {
  DEFAULT_API_BASE as BASE_DEFAULT,
  IS_API_BASE_EMPTY as BASE_EMPTY_FLAG,
  RAW_API_BASE,
  getApiBase,
} from "../config/apiBase";
import { ensureHttpsUrl } from "../utils/ensureHttpsUrl";

export { RAW_API_BASE, getApiBase };

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, "");

export const DEFAULT_API_BASE = BASE_DEFAULT;
export const IS_API_BASE_EMPTY = BASE_EMPTY_FLAG;

const normalizeBase = (candidate: string): string => {
  const trimmed = candidate.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("//")) {
    const absolute = ensureHttpsUrl(`https:${trimmed}`);
    return trimTrailingSlashes(absolute);
  }

  if (/^https?:/i.test(trimmed)) {
    const secure = ensureHttpsUrl(trimmed);
    return trimTrailingSlashes(secure);
  }

  if (trimmed.startsWith("/")) {
    const normalized = trimTrailingSlashes(trimmed);
    return normalized === "" ? "/" : normalized;
  }

  try {
    const parsed = new URL(ensureHttpsUrl(`https://${trimmed}`));
    const pathname = parsed.pathname === "/" ? "" : trimTrailingSlashes(parsed.pathname);
    return `${parsed.origin}${pathname}`;
  } catch {
    return trimTrailingSlashes(trimmed) || "";
  }
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

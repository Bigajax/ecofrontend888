import { API_BASE as RESOLVED_API_BASE, DEFAULT_API_BASE as BASE_DEFAULT, RAW_API_BASE } from '../api/base';

export { RAW_API_BASE };

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, '');

export const DEFAULT_API_BASE = BASE_DEFAULT;
export const API_BASE = RESOLVED_API_BASE;

const trimmedEnvApiBase = typeof RAW_API_BASE === 'string' ? RAW_API_BASE.trim() : '';
const trimmedResolvedApiBase =
  typeof RESOLVED_API_BASE === 'string' ? RESOLVED_API_BASE.trim() : '';

export const IS_API_BASE_EMPTY = trimmedEnvApiBase.length === 0;

const resolveEffectiveApiBase = () => {
  const candidate = trimmedResolvedApiBase || BASE_DEFAULT;
  if (!candidate) {
    return BASE_DEFAULT;
  }

  try {
    const parsed = new URL(candidate);
    const pathname = parsed.pathname === '/' ? '' : trimTrailingSlashes(parsed.pathname);
    return `${parsed.origin}${pathname}`;
  } catch {
    return trimTrailingSlashes(candidate) || BASE_DEFAULT;
  }
};

export const EFFECTIVE_API_BASE = resolveEffectiveApiBase();
export const API_BASE_URL = EFFECTIVE_API_BASE;

const normalizePath = (value: string) => {
  if (!value) return '/';
  const hasQuery = value.includes('?');
  const [rawPath, rawQuery] = hasQuery ? value.split('?') : [value, undefined];
  const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  const collapsed = path.replace(/\/+$/, '').replace(/\/{2,}/g, '/');
  const finalPath = collapsed.length === 0 ? '/' : collapsed;
  if (!rawQuery) return finalPath || '/';
  return `${finalPath}?${rawQuery}`;
};

export const buildApiUrl = (path: string, base = EFFECTIVE_API_BASE) => {
  const safePath = normalizePath(path);
  if (!base) {
    return safePath || '/';
  }
  const normalizedBase = trimTrailingSlashes(base);
  const sanitizedBase = normalizedBase || DEFAULT_API_BASE;
  return `${sanitizedBase}${safePath}`;
};

export const resolveApiUrl = (path = '') => {
  if (!path) {
    return EFFECTIVE_API_BASE || '';
  }
  return buildApiUrl(path);
};

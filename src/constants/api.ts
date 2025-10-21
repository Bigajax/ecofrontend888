const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, '');

const toAbsoluteUrl = (value: string, base?: string): URL | undefined => {
  try {
    if (value) {
      return base ? new URL(value, base) : new URL(value);
    }
  } catch {
    /* ignore */
  }
  return undefined;
};

const formatUrlWithoutTrailingSlash = (url: URL) => {
  const pathname = url.pathname === '/' ? '' : url.pathname.replace(/\/+$/, '');
  return `${url.origin}${pathname}`;
};

const DEFAULT_API_BASE_URL = 'https://ecobackend888.onrender.com';

const computeApiBaseUrl = () => {
  const rawEnv =
    (import.meta.env?.VITE_API_URL as string | undefined) ??
    (import.meta.env?.VITE_API_BASE_URL as string | undefined);
  const trimmedEnv = typeof rawEnv === 'string' ? rawEnv.trim() : '';
  const normalizedHint = trimmedEnv.toLowerCase();
  const treatAsSameOrigin =
    !trimmedEnv ||
    normalizedHint === 'same-origin' ||
    normalizedHint === 'origin' ||
    normalizedHint === 'self';

  if (treatAsSameOrigin) {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return trimTrailingSlashes(window.location.origin);
    }
    return DEFAULT_API_BASE_URL;
  }

  const hasWindow = typeof window !== 'undefined' && !!window.location?.origin;

  if (hasWindow) {
    const currentOrigin = trimTrailingSlashes(window.location.origin);
    const parsed = toAbsoluteUrl(trimmedEnv, currentOrigin) ?? undefined;
    if (!parsed) {
      return DEFAULT_API_BASE_URL;
    }
    const formatted = trimTrailingSlashes(formatUrlWithoutTrailingSlash(parsed));
    return formatted;
  }

  const parsed = toAbsoluteUrl(trimmedEnv);
  if (parsed) {
    return trimTrailingSlashes(formatUrlWithoutTrailingSlash(parsed));
  }

  return trimmedEnv ? trimTrailingSlashes(trimmedEnv) : DEFAULT_API_BASE_URL;
};

export const API_BASE_URL = computeApiBaseUrl();

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

export const buildApiUrl = (path: string, base = API_BASE_URL) => {
  const safePath = normalizePath(path);
  if (!base) {
    return safePath || '/';
  }
  const normalizedBase = base.replace(/\/+$/, '');
  return `${normalizedBase}${safePath}`;
};

export const resolveApiUrl = (path = '') => {
  if (!path) {
    return API_BASE_URL || '';
  }
  return buildApiUrl(path);
};

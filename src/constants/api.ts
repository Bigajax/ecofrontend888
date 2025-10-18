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
      return '';
    }
    return Boolean(import.meta.env?.DEV) ? 'http://localhost:3001' : '';
  }

  const hasWindow = typeof window !== 'undefined' && !!window.location?.origin;

  if (hasWindow) {
    const currentOrigin = trimTrailingSlashes(window.location.origin);
    const parsed = toAbsoluteUrl(trimmedEnv, currentOrigin) ?? undefined;
    if (!parsed) {
      return currentOrigin;
    }
    const formatted = trimTrailingSlashes(formatUrlWithoutTrailingSlash(parsed));
    return formatted;
  }

  const parsed = toAbsoluteUrl(trimmedEnv);
  if (parsed) {
    return trimTrailingSlashes(formatUrlWithoutTrailingSlash(parsed));
  }

  return trimTrailingSlashes(trimmedEnv);
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

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
  const rawEnv = import.meta.env?.VITE_API_BASE_URL as string | undefined;
  const trimmedEnv = typeof rawEnv === 'string' ? rawEnv.trim() : '';
  const normalizedHint = trimmedEnv.toLowerCase();
  const treatAsSameOrigin =
    normalizedHint === 'same-origin' || normalizedHint === 'origin' || normalizedHint === 'self';
  const envCandidate = treatAsSameOrigin ? '' : trimmedEnv;

  const isDev = Boolean(import.meta.env?.DEV);
  const devFallback = 'http://localhost:3001';

  if (isDev) {
    const devTarget = envCandidate || devFallback;
    const parsed = toAbsoluteUrl(devTarget, devFallback);
    return trimTrailingSlashes(parsed ? formatUrlWithoutTrailingSlash(parsed) : devTarget);
  }

  const hasWindow = typeof window !== 'undefined' && !!window.location?.origin;

  if (hasWindow) {
    const currentOrigin = trimTrailingSlashes(window.location.origin);
    if (!envCandidate) {
      return currentOrigin;
    }

    const parsed = toAbsoluteUrl(envCandidate, currentOrigin);
    if (!parsed) {
      return currentOrigin;
    }

    const formatted = formatUrlWithoutTrailingSlash(parsed);
    if (parsed.origin === currentOrigin) {
      return formatted;
    }
    return trimTrailingSlashes(formatted);
  }

  if (envCandidate) {
    const parsed = toAbsoluteUrl(envCandidate);
    if (parsed) {
      return trimTrailingSlashes(formatUrlWithoutTrailingSlash(parsed));
    }
  }

  return devFallback;
};

const computedBaseUrl = computeApiBaseUrl();

if (!computedBaseUrl) {
  throw new Error('API_BASE_URL não configurada.');
}

export const API_BASE_URL = computedBaseUrl;

export const resolveApiUrl = (path: string) => {
  const safePath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${safePath}`;
};

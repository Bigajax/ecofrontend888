const BASE = (import.meta.env.VITE_API_BASE_URL || '').trim();

const FALLBACK_ORIGIN =
  typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'http://localhost';

export const resolveApiUrl = (p: string) =>
  new URL(p, BASE || FALLBACK_ORIGIN).toString();

export const API_BASE_URL = BASE || FALLBACK_ORIGIN;

export const buildApiUrl = (path: string, base = API_BASE_URL) => {
  const safePath = path.startsWith('/') ? path : `/${path}`;
  const targetBase = base && base.trim().length > 0 ? base : FALLBACK_ORIGIN;
  return new URL(safePath, targetBase).toString();
};

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, '');

const rawEnv = (import.meta as any)?.env?.VITE_API_BASE_URL as string | undefined;
const trimmedEnv = typeof rawEnv === 'string' ? rawEnv.trim() : '';

const fallback = (import.meta as any)?.env?.DEV
  ? 'http://localhost:3001'
  : 'https://ecobackend888.onrender.com';

const normalized = trimTrailingSlashes(trimmedEnv || fallback || '');

if (!normalized) {
  throw new Error('API_BASE_URL não configurada.');
}

export const API_BASE_URL = normalized;

export const resolveApiUrl = (path: string) => {
  const safePath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${safePath}`;
};

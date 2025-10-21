const DEFAULT_API_BASE_VALUE = 'https://ecobackend888.onrender.com';

const rawEnvApiBase = import.meta.env?.VITE_API_BASE;

const normalizedEnvApiBase =
  typeof rawEnvApiBase === 'string' && rawEnvApiBase.trim().length > 0
    ? rawEnvApiBase.trim()
    : undefined;

const windowApiBase = (() => {
  if (typeof window === 'undefined') return undefined;
  const candidate = (window as any).__API_BASE__;
  if (typeof candidate !== 'string') return undefined;
  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : undefined;
})();

export const RAW_API_BASE = rawEnvApiBase;
export const DEFAULT_API_BASE = DEFAULT_API_BASE_VALUE;

function resolveApiBase() {
  return normalizedEnvApiBase ?? windowApiBase ?? DEFAULT_API_BASE_VALUE;
}

export const API_BASE = resolveApiBase();

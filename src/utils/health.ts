import { API_BASE, DEFAULT_API_BASE } from '../api/base';

export type HealthStatus = 'idle' | 'ok' | 'degraded' | 'down';

const sanitizeBase = (base: string) => base.replace(/\/+$/, '');

const resolveHealthUrl = () => {
  const fallback = DEFAULT_API_BASE;
  const candidate = typeof API_BASE === 'string' && API_BASE.trim().length > 0 ? API_BASE : fallback;
  try {
    const base = candidate.endsWith('/') ? candidate : `${candidate}/`;
    return new URL('api/health', base).toString();
  } catch {
    const sanitized = sanitizeBase(candidate || fallback);
    return `${sanitized}/api/health`;
  }
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function pingHealth(signal?: AbortSignal, timeoutMs = 5000): Promise<HealthStatus> {
  const ctl = new AbortController();
  const timeoutId = setTimeout(() => ctl.abort(), timeoutMs);
  const url = resolveHealthUrl();
  try {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
      signal: signal ?? ctl.signal,
    });

    if (!response.ok) {
      return 'degraded';
    }

    const data = await response.json().catch(() => ({}));
    return data && typeof data === 'object' && (data as any).ok ? 'ok' : 'degraded';
  } catch (error) {
    const isAbort = (error as DOMException)?.name === 'AbortError';
    if (signal && isAbort) {
      return 'degraded';
    }
    return 'down';
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function pingWithRetry(tries = 2, delayMs = 800): Promise<HealthStatus> {
  let status: HealthStatus = 'degraded';
  for (let attempt = 0; attempt < tries; attempt++) {
    const current = await pingHealth();
    if (current === 'ok') {
      return 'ok';
    }
    if (current === 'down') {
      status = 'down';
    } else if (status !== 'down') {
      status = current;
    }
    if (attempt < tries - 1) {
      await wait(delayMs);
    }
  }
  return status;
}

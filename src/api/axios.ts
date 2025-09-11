// src/api/api.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { supabase } from '../lib/supabaseClient';

/**
 * Defina no .env do front:
 * VITE_API_URL=https://ecobackend888.onrender.com/api
 * (sem barra no final)
 */
const RAW =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  'https://ecobackend888.onrender.com/api';

const API_BASE = RAW.replace(/\/+$/, '');

console.log('[API] baseURL =', API_BASE);

const api = axios.create({
  baseURL: API_BASE,
  timeout: 45000,
  withCredentials: false, // 👈 importante p/ CORS quando não há cookies/sessão
});

// Endpoints públicos (relativos ao baseURL)
const PUBLIC_PATHS = new Set<string>(['/health', '/status', '/']);

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  config.headers = config.headers ?? {};

  // Normaliza URL para checar se é público
  const urlForCheck = new URL(config.url ?? '', API_BASE + '/');
  const isPublic = Array.from(PUBLIC_PATHS).some((p) => urlForCheck.pathname.endsWith(p));

  if (!isPublic) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (token) {
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
  }

  if (config.data && !(config.headers as any)['Content-Type']) {
    (config.headers as any)['Content-Type'] = 'application/json';
  }
  (config.headers as any).Accept = 'application/json';
  (config.headers as any)['X-Requested-With'] = 'XMLHttpRequest';

  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;

    // Re-tentativa única em 401
    if (status === 401 && original && !original._retry) {
      original._retry = true;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (token) {
        original.headers = original.headers ?? {};
        (original.headers as any).Authorization = `Bearer ${token}`;
        return api.request(original);
      }
    }

    const details = (error.response?.data as any) ?? { message: error.message };
    const msg =
      typeof details === 'string'
        ? details
        : details?.error || details?.message || JSON.stringify(details);

    return Promise.reject(new Error(`API ${status ?? ''} ${error.response?.statusText ?? ''} – ${msg}`));
  }
);

export default api;

// src/api/api.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { supabase } from '../lib/supabaseClient';

/**
 * Base URL da API
 * - NÃO forçar "/api" aqui. Se o seu backend tiver esse prefixo,
 *   coloque-o diretamente no VITE_API_URL (ex.: https://host.com/api).
 */
const RAW = (import.meta.env.VITE_API_URL as string | undefined)
  || 'https://ecobackend888.onrender.com';

// Remove barras finais repetidas (vamos construir caminhos sempre com "/...")
const API_BASE = RAW.replace(/\/+$/, '');

console.log('[API] baseURL =', API_BASE);

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000, // ajuste se o Render estiver "cold start" (ex.: 45000)
});

// Endpoints públicos (se houver)
const PUBLIC_PATHS = new Set<string>(['/health', '/status']);

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  config.headers = config.headers ?? {};

  // Checagem do path para saber se é público
  // (usa URL para normalizar, considerando baseURL já sem barra final)
  const urlForCheck = new URL(config.url ?? '', API_BASE + '/');
  const isPublic = PUBLIC_PATHS.has(urlForCheck.pathname);

  if (!isPublic) {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (token) {
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
  }

  if (config.data && !(config.headers as any)['Content-Type']) {
    (config.headers as any)['Content-Type'] = 'application/json';
  }
  (config.headers as any).Accept = 'application/json';

  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;

    // Tentativa única de reenvio se for 401
    if (status === 401 && original && !original._retry) {
      original._retry = true;
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (token) {
        original.headers = original.headers ?? {};
        (original.headers as any).Authorization = `Bearer ${token}`;
        return api.request(original);
      }
    }

    // Mensagem de erro amigável
    const details = (error.response?.data as any) ?? { message: error.message };
    const msg =
      typeof details === 'string'
        ? details
        : details?.error || details?.message || JSON.stringify(details);

    return Promise.reject(
      new Error(`API ${status ?? ''} ${error.response?.statusText ?? ''} – ${msg}`)
    );
  }
);

export default api;

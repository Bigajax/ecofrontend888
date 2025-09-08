// src/api/api.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { supabase } from '../lib/supabaseClient';

const API_BASE =
  import.meta.env.VITE_API_URL ?? 'https://ecobackend888.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// Liste aqui endpoints que NÃO precisam de auth (se tiver)
const PUBLIC_PATHS = new Set<string>(['/health', '/status']);

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  // Garante objeto de headers
  config.headers = config.headers ?? {};

  // Descobre o path final p/ checar público/privado
  const url = new URL(config.url ?? '', API_BASE);
  const isPublic = PUBLIC_PATHS.has(url.pathname);

  if (!isPublic) {
    // Pega sempre o token mais recente (Supabase auto refresh)
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (token) {
      (config.headers as any)['Authorization'] = `Bearer ${token}`;
    }
    // Se quiser forçar auth em certas rotas, você pode validar aqui e redirecionar no app
    // mas evite throw no interceptor para não quebrar fluxos paralelos.
  }

  // JSON por padrão quando há body
  if (config.data && !(config.headers as any)['Content-Type']) {
    (config.headers as any)['Content-Type'] = 'application/json';
  }
  (config.headers as any)['Accept'] = 'application/json';

  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;

    // Se o token expirou/é inválido, tenta 1 vez com token atualizado
    if (status === 401 && original && !original._retry) {
      original._retry = true;
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (token) {
        original.headers = original.headers ?? {};
        (original.headers as any)['Authorization'] = `Bearer ${token}`;
        return api.request(original);
      }
    }

    // Normaliza mensagem de erro
    const details = (error.response?.data as any) ?? { message: error.message };
    const msg = typeof details === 'string' ? details : details?.error || details?.message || JSON.stringify(details);
    return Promise.reject(new Error(`API ${status ?? ''} ${error.response?.statusText ?? ''} – ${msg}`));
  }
);

export default api;

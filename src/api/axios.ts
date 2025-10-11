import axios, { AxiosHeaders } from "axios";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../lib/supabaseClient";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL || "https://ecobackend888.onrender.com",
  withCredentials: true,
  timeout: 60000,
});

const GUEST_STORAGE_KEY = "eco_guest_id";

function ensureGuestId(): string {
  try {
    const stored = localStorage.getItem(GUEST_STORAGE_KEY);
    if (stored) {
      return stored;
    }

    const generated = `guest_${uuidv4()}`;
    localStorage.setItem(GUEST_STORAGE_KEY, generated);
    return generated;
  } catch {
    return `guest_${uuidv4()}`;
  }
}

function formatRequestUrl(config: { baseURL?: string; url?: string }): string {
  const base = config.baseURL || api.defaults.baseURL || "";
  const url = config.url || "";

  if (/^https?:/i.test(url)) {
    return url;
  }

  if (!base) {
    return url;
  }

  if (!url) {
    return base;
  }

  const normalizedBase = String(base).replace(/\/+$/, "");
  const normalizedPath = String(url).replace(/^\/+/, "");
  return `${normalizedBase}/${normalizedPath}`;
}

api.interceptors.request.use(async (config) => {
  try {
    const headers =
      config.headers instanceof AxiosHeaders
        ? config.headers
        : new AxiosHeaders(config.headers ?? {});

    config.headers = headers;

    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
      headers.delete("X-Guest-Id");
    } else {
      headers.set("X-Guest-Id", ensureGuestId());
      headers.delete("Authorization");
    }

    const fullUrl = formatRequestUrl(config);

    console.log(
      `➡️ [Axios] ${config.method?.toUpperCase()} ${fullUrl} | Auth: ${
        token ? "Bearer" : "Guest"
      }`
    );
  } catch (err) {
    console.warn("⚠️ [Axios] Falha ao preparar cabeçalhos de autenticação:", err);
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    const fullUrl = formatRequestUrl(response.config);

    console.log(
      `✅ [Axios] ${response.config.method?.toUpperCase()} ${fullUrl} -> ${response.status}`
    );
    return response;
  },
  (error) => {
    const { config, response } = error;
    const fullUrl = config ? formatRequestUrl(config) : "<unknown>";
    console.error(
      `❌ [Axios] ${config?.method?.toUpperCase()} ${fullUrl} -> ${
        response?.status || "NO_RESPONSE"
      }`
    );
    return Promise.reject(error);
  }
);

export default api;

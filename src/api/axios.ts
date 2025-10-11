import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../lib/supabaseClient";
import { API_BASE_URL } from "../constants/api";

const api = axios.create({
  baseURL: API_BASE_URL,
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

api.interceptors.request.use(async (config) => {
  try {
    if (!config.headers) {
      config.headers = {};
    }

    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      delete config.headers["X-Guest-Id"];
    } else {
      config.headers["X-Guest-Id"] = ensureGuestId();
      delete config.headers.Authorization;
    }

    console.log(
      `➡️ [Axios] ${config.method?.toUpperCase()} ${config.baseURL}${config.url} | Auth: ${
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
    console.log(
      `✅ [Axios] ${response.config.method?.toUpperCase()} ${response.config.baseURL}${
        response.config.url
      } -> ${response.status}`
    );
    return response;
  },
  (error) => {
    const { config, response } = error;
    console.error(
      `❌ [Axios] ${config?.method?.toUpperCase()} ${config?.baseURL}${config?.url} -> ${
        response?.status || "NO_RESPONSE"
      }`
    );
    return Promise.reject(error);
  }
);

export default api;

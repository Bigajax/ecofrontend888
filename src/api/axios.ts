import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../lib/supabaseClient";
import { API_BASE_URL } from "../constants/api";
import { logHttpRequestDebug } from "../utils/httpDebug";

const api = axios.create({
  baseURL: API_BASE_URL,
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

    const headers = config.headers as Record<string, string>;

    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;

    if (token) {
      headers.Authorization = `Bearer ${token}`;
      delete headers["X-Guest-Id"];
      delete headers["x-guest-id"];
      config.withCredentials = true;
    } else {
      headers["X-Guest-Id"] = ensureGuestId();
      delete headers.Authorization;
      delete headers.authorization;
      config.withCredentials = false;
    }

    const hasJsonBody =
      config.data &&
      typeof config.data === "object" &&
      !(config.data instanceof FormData) &&
      !headers["Content-Type"] &&
      !headers["content-type"];

    if (hasJsonBody) {
      headers["Content-Type"] = "application/json";
    }

    const baseURL = typeof config.baseURL === "string" ? config.baseURL : "";
    const requestUrl = typeof config.url === "string" ? config.url : "";
    const fullUrl = /^https?:/i.test(requestUrl)
      ? requestUrl
      : `${baseURL.replace(/\/+$/, "")}/${requestUrl.replace(/^\/+/, "")}`.replace(/\/+$/, "");

    logHttpRequestDebug({
      method: config.method?.toUpperCase() || "GET",
      url: fullUrl || baseURL,
      credentials: config.withCredentials ? "include" : "omit",
      headers,
    });
  } catch (err) {
    console.warn("⚠️ [Axios] Falha ao preparar cabeçalhos de autenticação:", err);
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;

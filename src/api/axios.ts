// src/api/axios.ts
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../lib/supabaseClient"; // ajuste o path se preciso

// ==========================
// Resolve baseURL de forma segura
// ==========================
const apiBaseEnv =
  import.meta.env.VITE_API_URL ??
  import.meta.env.VITE_API_BASE ??
  import.meta.env.VITE_BACKEND_URL;

const normalizedBase =
  typeof apiBaseEnv === "string"
    ? apiBaseEnv.trim().replace(/\/+$/, "") // remove barra final
    : "";

const baseURL =
  normalizedBase || (typeof window !== "undefined" ? window.location.origin : "");

// ==========================
// Cria instância Axios
// ==========================
const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  // Importante: omit para evitar conflito de CORS
  withCredentials: false,
});

// ==========================
// Guest helpers
// ==========================
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

// ==========================
// Injeta credenciais automaticamente
// ==========================
api.interceptors.request.use(async (config) => {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;

    const headers = (config.headers ??= {} as Record<string, any>);

    if (token) {
      headers.Authorization = `Bearer ${token}`;
      delete headers["X-Guest-Id"];
    } else {
      const guestId = ensureGuestId();
      headers["X-Guest-Id"] = guestId;
      delete headers.Authorization;
    }
  } catch (err) {
    console.warn("⚠️ [Axios] Falha ao preparar cabeçalhos de autenticação:", err);
  }
  return config;
});

export default api;

// src/api/axios.ts
import axios from "axios";
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
// Injeta o token Supabase automaticamente
// ==========================
api.interceptors.request.use(async (config) => {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) {
      config.headers = config.headers || {};
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
  } catch (err) {
    console.warn("⚠️ [Axios] Falha ao obter sessão do Supabase:", err);
  }
  return config;
});

export default api;

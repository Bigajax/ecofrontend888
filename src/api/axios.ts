// src/api/axios.ts
import axios from "axios";
import { supabase } from "../lib/supabaseClient"; // ajuste o path se preciso

const envBase = import.meta.env.VITE_API_BASE;
const normalizedBase = typeof envBase === "string" ? envBase.replace(/\/+$/, "") : "";

const baseURL = normalizedBase ? `${normalizedBase}/api` : "/api";

const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// Injeta o Bearer do Supabase em toda request
api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

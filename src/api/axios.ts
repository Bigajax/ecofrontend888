// src/api/axios.ts
import axios from "axios";
import { supabase } from "../lib/supabase"; // ajuste o path se preciso

const API_BASE =
  import.meta.env.VITE_API_BASE?.replace(/\/+$/, "") ||
  "https://ecobackend888.onrender.com";

// baseURL termina em /api
const api = axios.create({
  baseURL: `${API_BASE}/api`,
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

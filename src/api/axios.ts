import axios from "axios";
import { v4 as uuidv4 } from "uuid";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  withCredentials: true,
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
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;

    if (token) {
      headers.Authorization = `Bearer ${token}`;
      delete headers["X-Guest-Id"];
    } else {

    }
  } catch (err) {
    console.warn("⚠️ [Axios] Falha ao preparar cabeçalhos de autenticação:", err);
  }

  return config;
});

export default api;

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


    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;

    if (token) {

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

    );
    return response;
  },
  (error) => {
    const { config, response } = error;

        response?.status || "NO_RESPONSE"
      }`
    );
    return Promise.reject(error);
  }
);

export default api;

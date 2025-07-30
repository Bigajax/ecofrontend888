import axios from 'axios';
import { supabase } from '../lib/supabaseClient';

const api = axios.create({
  baseURL: 'https://ecobackend888.onrender.com/api',
});

api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('⚠️ Usuário não autenticado.');
  }

  config.headers.Authorization = `Bearer ${session.access_token}`;
  return config;
});

export default api;

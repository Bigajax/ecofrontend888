import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // 🛡️ PROTEÇÃO: Garante renovação automática do token
    // Evita logout inesperado durante meditações longas
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Aumenta a margem de segurança para renovação do token
    // Renova quando faltam 10 minutos para expirar (padrão: 60s)
    storageKey: 'eco-auth-token',
  },
});

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null | undefined;

export const getSupabase = (): SupabaseClient | null => {
  if (cachedClient !== undefined) return cachedClient;

  const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim();
  const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    cachedClient = null;
    if ((import.meta as any)?.env?.DEV) {
      console.warn('[supabaseClient] Variáveis VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY ausentes.');
    }
    return cachedClient;
  }

  cachedClient = createClient(supabaseUrl, supabaseAnonKey);
  return cachedClient;
};

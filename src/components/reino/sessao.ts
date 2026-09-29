/**
 * Tem alguém logado neste navegador? Lê a sessão salva pelo Supabase
 * (storageKey 'eco-auth-token' em src/lib/supabaseClient.ts) de forma síncrona,
 * para decidir o carregamento antes do AuthContext responder.
 * Quem está logado vê sempre o carregamento do reino, em qualquer rota.
 */
export function temSessaoSalva(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage.getItem('eco-auth-token');
  } catch {
    return false;
  }
}

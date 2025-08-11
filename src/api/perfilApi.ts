import { supabase } from "../lib/supabaseClient";
import api from "./axios";

export interface PerfilEmocional {
  id: string;
  usuario_id: string;
  resumo_geral_ia: string | null;
  emocoes_frequentes: Record<string, number>;
  temas_recorrentes: Record<string, number>;
  ultima_interacao_sig: string | null;
  updated_at?: string;
}

async function getAuthHeaders() {
  // (opcional) manter para chamadas sem interceptor; com o interceptor já funciona
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("⚠️ Sessão inválida.");
  return { headers: { Authorization: `Bearer ${session.access_token}` } };
}

// preferido: endpoint que resolve pelo token -> GET /perfil-emocional
// fallback: backend legado -> GET /perfil-emocional/:userId
export const buscarPerfilEmocional = async (
  userId?: string
): Promise<PerfilEmocional | null> => {
  try {
    // 1) tenta sem :userId
    try {
      const { data } = await api.get<{ success?: boolean; perfil: PerfilEmocional | null }>(
        "/perfil-emocional"
      );
      return data?.perfil ?? null;
    } catch (e: any) {
      const status = e?.response?.status;
      const podeTentarFallback = status === 400 || status === 404 || status === 405;
      if (!podeTentarFallback) throw e;
    }

    // 2) fallback com :userId
    if (!userId) return null;
    const { data } = await api.get<{ success?: boolean; perfil: PerfilEmocional | null }>(
      `/perfil-emocional/${encodeURIComponent(userId)}`
    );
    return data?.perfil ?? null;
  } catch (err: any) {
    console.error("❌ Erro ao buscar perfil emocional:", err?.response?.data || err?.message || err);
    return null;
  }
};

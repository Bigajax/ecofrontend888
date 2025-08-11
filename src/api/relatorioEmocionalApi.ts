import api from "./axios";
import { supabase } from "../lib/supabaseClient";

export interface LinhaTempoItem {
  data: string;
  [dominioOuEmocao: string]: number | string;
}
export interface RelatorioEmocional {
  resumo_geral_ia?: string;
  emocoes_frequentes?: Record<string, number>;
  temas_recorrentes?: Record<string, number>;
  ultima_interacao_sig?: string | null;
  mapa_emocional?: { emocao: string; x: number; y: number }[];
  mapa_emocional_2d?: { emocao: string; valenciaNormalizada: number; excitacaoNormalizada: number; cor: string }[];
  emocoes_dominantes?: { emocao: string; valor: number; cor?: string }[];
  linha_tempo?: LinhaTempoItem[];
  linha_do_tempo_intensidade?: LinhaTempoItem[];
  dominios_dominantes?: { dominio: string; valor: number }[];
  tags_dominantes?: { tag: string; valor: number }[];
  total_memorias?: number;
}

async function ensureAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("⚠️ Sessão inválida.");
}

/** Busca o relatório emocional (tenta sem :userId, cai para /:userId se preciso) */
export const buscarRelatorioEmocional = async (
  userId?: string
): Promise<RelatorioEmocional | null> => {
  try {
    await ensureAuth();

    // 1) via token -> GET /relatorio-emocional
    try {
      const { data } = await api.get<{ perfil: RelatorioEmocional | null }>(
        "/relatorio-emocional"
      );
      return data?.perfil ?? null;
    } catch (e: any) {
      const status = e?.response?.status;
      const podeFallback = status === 400 || status === 404 || status === 405;
      if (!podeFallback) throw e;
    }

    // 2) fallback -> GET /relatorio-emocional/:userId
    if (!userId) return null;
    const { data } = await api.get<{ perfil: RelatorioEmocional | null }>(
      `/relatorio-emocional/${encodeURIComponent(userId)}`
    );
    return data?.perfil ?? null;
  } catch (err: any) {
    console.error("❌ Erro ao buscar relatório emocional:", err?.response?.data || err?.message || err);
    return null;
  }
};

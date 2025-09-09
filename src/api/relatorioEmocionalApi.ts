import api from "./axios";

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
  mapa_emocional_2d?: {
    emocao: string;
    valenciaNormalizada: number;
    excitacaoNormalizada: number;
    cor: string;
  }[];
  emocoes_dominantes?: { emocao: string; valor: number; cor?: string }[];
  linha_tempo?: LinhaTempoItem[];
  linha_do_tempo_intensidade?: LinhaTempoItem[];
  dominios_dominantes?: { dominio: string; valor: number }[];
  tags_dominantes?: { tag: string; valor: number }[];
  total_memorias?: number;
}

function unwrapRelatorio(d: any): RelatorioEmocional | null {
  // aceita { perfil: {...} } | { relatorio: {...} } | { data: {...} } | { ...obj }
  const obj = d?.perfil ?? d?.relatorio ?? d?.data ?? d;
  return obj && typeof obj === "object" ? (obj as RelatorioEmocional) : null;
}

/**
 * Busca o relatório emocional.
 * 1) Tenta GET /relatorio-emocional (RLS via token)
 * 2) Se 404/405/400, faz fallback para /relatorio-emocional/:userId
 */
export async function buscarRelatorioEmocional(
  userId?: string
): Promise<RelatorioEmocional | null> {
  try {
    // 1) via token
    try {
      const { data } = await api.get("/relatorio-emocional");
      return unwrapRelatorio(data);
    } catch (e: any) {
      const status = e?.response?.status;
      const podeFallback = status === 400 || status === 404 || status === 405;
      if (!podeFallback) throw e;
    }

    // 2) fallback via :userId
    if (!userId) return null;
    const { data } = await api.get(
      `/relatorio-emocional/${encodeURIComponent(userId)}`
    );
    return unwrapRelatorio(data);
  } catch (err: any) {
    console.error(
      "❌ Erro ao buscar relatório emocional:",
      err?.response?.data || err?.message || err
    );
    return null;
  }
}

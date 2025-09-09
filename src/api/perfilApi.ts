// src/api/perfilApi.ts
import api from "./axios";

export interface PerfilEmocional {
  id?: string;
  usuario_id?: string;
  resumo_geral_ia?: string | null;
  emocoes_frequentes?: Record<string, number>;
  temas_recorrentes?: Record<string, number>;
  ultima_interacao_sig?: string | null;
  updated_at?: string;
}

/** Aceita { perfil: {...} } | { data: {...} } | { ...obj } */
function unwrapPerfil(payload: any): PerfilEmocional | null {
  const raw = payload?.perfil ?? payload?.data ?? payload;
  if (!raw || typeof raw !== "object") return null;

  return {
    id: raw.id,
    usuario_id: raw.usuario_id ?? raw.user_id,
    resumo_geral_ia: raw.resumo_geral_ia ?? null,
    emocoes_frequentes: raw.emocoes_frequentes ?? {},
    temas_recorrentes: raw.temas_recorrentes ?? {},
    ultima_interacao_sig: raw.ultima_interacao_sig ?? null,
    updated_at: raw.updated_at,
  };
}

/**
 * Busca o perfil emocional.
 * 1) Tenta GET /perfil-emocional (autenticado via Bearer no interceptor)
 * 2) Se 400/404/405, faz fallback para /perfil-emocional/:userId
 */
export async function buscarPerfilEmocional(
  userId?: string
): Promise<PerfilEmocional | null> {
  try {
    // 1) via token (RLS no backend)
    try {
      const { data } = await api.get("/perfil-emocional");
      return unwrapPerfil(data);
    } catch (e: any) {
      const status = e?.response?.status;
      const podeFallback = status === 400 || status === 404 || status === 405;
      if (!podeFallback) throw e;
    }

    // 2) fallback via :userId (para backend legado)
    if (!userId) return null;
    const { data } = await api.get(`/perfil-emocional/${encodeURIComponent(userId)}`);
    return unwrapPerfil(data);
  } catch (err: any) {
    console.error(
      "❌ Erro ao buscar perfil emocional:",
      err?.response?.data || err?.message || err
    );
    return null;
  }
}

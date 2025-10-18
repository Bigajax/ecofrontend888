// src/api/perfilApi.ts
import { ApiFetchError, apiFetchJson } from "./apiFetch";
import { MissingUserIdError } from "./errors";

export interface PerfilEmocional {
  id?: string;
  usuario_id?: string;
  resumo_geral_ia?: string | null;
  emocoes_frequentes?: Record<string, number>;
  temas_recorrentes?: Record<string, number>;
  ultima_interacao_sig?: string | null;
  updated_at?: string;
}

/** Aceita { perfil: {...} } | { data: {...} } | objeto cru */
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

// cache leve em memória para evitar re-bater várias vezes em curto prazo
type CacheItem = { data: PerfilEmocional | null; ts: number };
const cache = new Map<string, CacheItem>();
const CACHE_TTL = 60_000; // 60s

function getCache(key: string): PerfilEmocional | null | undefined {
  const item = cache.get(key);
  if (!item) return undefined;
  if (Date.now() - item.ts > CACHE_TTL) {
    cache.delete(key);
    return undefined;
  }
  return item.data;
}

function setCache(key: string, data: PerfilEmocional | null) {
  cache.set(key, { data, ts: Date.now() });
}

/** Monta a lista de rotas candidatas (considera baseURL com '/api') */
const PERFIL_ENDPOINT = '/api/perfil-emocional';

const buildPerfilUrl = (userId: string) => {
  const params = new URLSearchParams({ usuario_id: userId });
  return `${PERFIL_ENDPOINT}?${params.toString()}`;
};

/* ---------------- API principal ---------------- */
export async function buscarPerfilEmocional(
  userId?: string,
  opts?: { timeoutMs?: number; retries?: number; retryDelayMs?: number }
): Promise<PerfilEmocional | null> {
  if (!userId) {
    throw new MissingUserIdError(PERFIL_ENDPOINT);
  }

  const timeoutMs = opts?.timeoutMs ?? 12_000;

  const cacheKey = `perfil:${userId}`;
  const cached = getCache(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const url = buildPerfilUrl(userId);
    const payload = await apiFetchJson<any>(url, { method: 'GET', timeoutMs });
    const parsed = unwrapPerfil(payload);
    setCache(cacheKey, parsed);
    return parsed;
  } catch (error) {
    if (error instanceof ApiFetchError && (error.status === 404 || error.status === 400)) {
      setCache(cacheKey, null);
      throw error;
    }

    console.error(
      '❌ Erro ao buscar perfil emocional:',
      (error as any)?.response?.data || (error as Error)?.message || error
    );
    setCache(cacheKey, null);
    throw error;
  }
}

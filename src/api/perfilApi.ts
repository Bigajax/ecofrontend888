// src/api/perfilApi.ts
import { apiFetchJson } from "../lib/apiFetch";
import type { ApiFetchJsonResult } from "../lib/apiFetch";
import { buildIdentityHeaders, syncGuestId } from "../lib/guestId";
import { resolveApiUrl } from "../constants/api";
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

  const cacheKey = `perfil:${userId}`;
  const cached = getCache(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const url = buildPerfilUrl(userId);

    // Preparar headers com identidade
    const identityHeaders = buildIdentityHeaders();
    const headers = new Headers({
      ...identityHeaders,
      Accept: 'application/json',
    });

    const result = await apiFetchJson<any>(url, {
      method: 'GET',
      headers,
      timeoutMs: opts?.timeoutMs ?? 12_000,
    });

    // Sincronizar guest ID se recebido
    if (result.ok && result.headers) {
      const guestId = result.headers.get('x-eco-guest-id') ?? result.headers.get('x-guest-id');
      if (guestId) {
        syncGuestId(guestId);
      }
    }

    // Verificar se a requisição foi bem-sucedida
    if (!result.ok) {
      const errorMsg = result.status === 0
        ? result.message
        : `HTTP ${result.status}`;

      console.error(
        '❌ Erro ao buscar perfil emocional:',
        { status: result.status, data: result.data, message: errorMsg }
      );

      if (result.status === 404 || result.status === 400) {
        setCache(cacheKey, null);
      }

      throw new Error(errorMsg);
    }

    const parsed = unwrapPerfil(result.data);
    setCache(cacheKey, parsed);
    return parsed;
  } catch (error) {
    console.error(
      '❌ Erro ao buscar perfil emocional:',
      (error as Error)?.message || error
    );
    setCache(cacheKey, null);
    throw error;
  }
}

// src/api/perfilApi.ts
import { ApiFetchError, apiFetchJson } from "./apiFetch";

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
const FALLBACK_STATUSES = new Set([400, 404, 405]);

const PERFIL_PATHS = [
  '/api/perfil-emocional',
  '/perfil-emocional',
  '/api/v1/perfil-emocional',
  '/v1/perfil-emocional',
  '/api/perfil_emocional',
  '/perfil_emocional',
  '/api/perfil',
  '/perfil',
];

const buildPerfilCandidates = (userId?: string) => {
  const unique = new Set<string>();
  const items: string[] = [];

  const add = (path: string) => {
    if (!unique.has(path)) {
      unique.add(path);
      items.push(path);
    }
  };

  PERFIL_PATHS.forEach(add);

  if (userId) {
    const id = encodeURIComponent(userId);
    PERFIL_PATHS.forEach((path) => add(`${path}?usuario_id=${id}`));
    PERFIL_PATHS.forEach((path) => add(`${path}/${id}`));
  }

  return items;
};

async function getPerfilFromCandidates(candidates: string[], timeoutMs: number) {
  let lastError: unknown;

  for (const path of candidates) {
    try {
      const payload = await apiFetchJson<any>(path, { method: 'GET', timeoutMs });
      const parsed = unwrapPerfil(payload);
      if (parsed) {
        return { perfil: parsed, lastError: undefined } as const;
      }
    } catch (error) {
      lastError = error;
      if (error instanceof ApiFetchError && FALLBACK_STATUSES.has(error.status ?? 0)) {
        continue;
      }
      throw error;
    }
  }

  return { perfil: null, lastError } as const;
}

/* ---------------- API principal com retry + fallback ---------------- */
export async function buscarPerfilEmocional(
  userId?: string,
  opts?: { timeoutMs?: number; retries?: number; retryDelayMs?: number }
): Promise<PerfilEmocional | null> {
  const timeoutMs = opts?.timeoutMs ?? 10_000;

  const cacheKey = userId ? `perfil:${userId}` : "perfil:self";
  const cached = getCache(cacheKey);
  if (cached !== undefined) return cached;

  const candidates = buildPerfilCandidates(userId);
  let lastError: unknown;

  try {
    const { perfil, lastError: candidateError } = await getPerfilFromCandidates(candidates, timeoutMs);
    if (perfil) {
      setCache(cacheKey, perfil);
      return perfil;
    }
    lastError = candidateError;
  } catch (error) {
    lastError = error;
  }

  if (lastError instanceof ApiFetchError && FALLBACK_STATUSES.has(lastError.status ?? 0)) {
    setCache(cacheKey, null);
    return null;
  }

  if (lastError) {
    console.error(
      '❌ Erro ao buscar perfil emocional:',
      (lastError as any)?.response?.data || (lastError as Error)?.message || lastError
    );
    setCache(cacheKey, null);
    throw lastError;
  }

  setCache(cacheKey, null);
  return null;
}

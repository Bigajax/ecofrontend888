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

/* ---------------- helpers ---------------- */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const isTimeout = (err: any) => {
  const code = err?.code || err?.response?.code;
  const msg = String(err?.message || "");
  return (
    code === "ECONNABORTED" ||
    code === "ETIMEDOUT" ||
    msg.includes("timeout") ||
    msg.includes("aborted")
  );
};

const isFallbackStatus = (err: any) => {
  const s = err?.response?.status;
  // rotas não encontradas/sem suporte -> tentamos a próxima
  return s === 400 || s === 404 || s === 405;
};

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
function buildCandidates(base: string, withUserId?: string): string[] {
  // Rotas “normais”
  const bases = [
    "perfil-emocional",
    "/perfil-emocional",
    "v1/perfil-emocional",
    "/v1/perfil-emocional",
    "perfil_emocional",
    "/perfil_emocional",
    "perfil",
    "/perfil",
  ];

  // Rotas que “sobem” um nível (caso a baseURL tenha /api e o servidor exponha sem /api)
  const upOne = [
    "../perfil-emocional",
    "../v1/perfil-emocional",
    "../perfil_emocional",
    "../perfil",
  ];

  const all = [...bases, ...upOne];

  if (!withUserId) return all;

  const id = encodeURIComponent(withUserId);
  // anexa o id corretamente (evita //)
  return all.map((p) => (p.endsWith("/") ? `${p}${id}` : `${p}/${id}`));
}

/** Tenta uma sequência de rotas até uma responder com 2xx. */
async function getFirstOK(
  candidates: string[],
  timeoutMs: number
): Promise<PerfilEmocional | null> {
  for (const path of candidates) {
    try {
      const { data } = await api.get(path, { timeout: timeoutMs });
      const parsed = unwrapPerfil(data);
      if (parsed) return parsed;
    } catch (err: any) {
      if (isFallbackStatus(err) || isTimeout(err)) {
        // tenta a próxima rota em silêncio
        continue;
      }
      // falha “real” (401/5xx/rede): propaga p/ retry
      throw err;
    }
  }
  return null;
}

/* ---------------- API principal com retry + fallback ---------------- */
export async function buscarPerfilEmocional(
  userId?: string,
  opts?: { timeoutMs?: number; retries?: number; retryDelayMs?: number }
): Promise<PerfilEmocional | null> {
  const timeoutMs = opts?.timeoutMs ?? 12_000; // menor que 30s pra não travar a UI
  const retries = Math.max(0, opts?.retries ?? 2);
  const retryDelayMs = Math.max(100, opts?.retryDelayMs ?? 700);

  // cache key difere se passarmos userId
  const cacheKey = userId ? `perfil:${userId}` : "perfil:self";
  const cached = getCache(cacheKey);
  if (cached !== undefined) return cached;

  let attempt = 0;
  let lastError: any;

  // baseURL atual (pode terminar com /api ou não)
  const base = (api.defaults?.baseURL as string) || "";

  while (attempt <= retries) {
    try {
      // 1) tentar rotas autenticadas (RLS)
      const primary = buildCandidates(base);
      const perfil = await getFirstOK(primary, timeoutMs);
      if (perfil !== null) {
        setCache(cacheKey, perfil);
        return perfil;
      }

      // 2) fallback via :userId (backend legado ou quando RLS não suportado)
      if (userId) {
        const withId = buildCandidates(base, userId);
        const perfilById = await getFirstOK(withId, timeoutMs);
        setCache(cacheKey, perfilById);
        return perfilById;
      }

      // se chegou aqui, não temos userId para fallback
      setCache(cacheKey, null);
      return null;
    } catch (err) {
      lastError = err;
      if (attempt === retries) break;
      // backoff exponencial
      await sleep(retryDelayMs * Math.pow(2, attempt));
      attempt++;
    }
  }

  console.error(
    "❌ Erro ao buscar perfil emocional:",
    lastError?.response?.data || lastError?.message || lastError
  );
  setCache(cacheKey, null);
  return null;
}

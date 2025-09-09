// src/api/relatorioEmocionalApi.ts
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

/* ------------ normalização (aceita vários formatos) ------------ */
function unwrapRelatorio(d: any): RelatorioEmocional | null {
  const obj = d?.perfil ?? d?.relatorio ?? d?.data ?? d;
  return obj && typeof obj === "object" ? (obj as RelatorioEmocional) : null;
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
  return s === 400 || s === 404 || s === 405;
};

// cache leve em memória por 60s
type CacheItem = { data: RelatorioEmocional | null; ts: number };
const cache = new Map<string, CacheItem>();
const CACHE_TTL = 60_000;

function getCache(key: string): RelatorioEmocional | null | undefined {
  const c = cache.get(key);
  if (!c) return undefined;
  if (Date.now() - c.ts > CACHE_TTL) {
    cache.delete(key);
    return undefined;
  }
  return c.data;
}
function setCache(key: string, data: RelatorioEmocional | null) {
  cache.set(key, { data, ts: Date.now() });
}

/* ---------------- função principal com retry + fallback ---------------- */

export async function buscarRelatorioEmocional(
  userId?: string,
  opts?: { timeoutMs?: number; retries?: number; retryDelayMs?: number }
): Promise<RelatorioEmocional | null> {
  const timeoutMs = opts?.timeoutMs ?? 12_000; // menor que 30s
  const retries = Math.max(0, opts?.retries ?? 2); // 2 tentativas extras
  const retryDelayMs = Math.max(100, opts?.retryDelayMs ?? 700);

  const cacheKey = userId ? `relatorio:${userId}` : "relatorio:self";
  const cached = getCache(cacheKey);
  if (cached !== undefined) return cached;

  let attempt = 0;
  let lastError: any;

  const tryGet = async (url: string) => {
    const { data } = await api.get(url, { timeout: timeoutMs });
    return unwrapRelatorio(data);
  };

  while (attempt <= retries) {
    try {
      // 1) rota autenticada (via Bearer do interceptor)
      try {
        const r = await tryGet("/relatorio-emocional");
        setCache(cacheKey, r);
        return r;
      } catch (err: any) {
        lastError = err;
        // se não for caso de fallback ou timeout, propaga para retry
        if (!isFallbackStatus(err) && !isTimeout(err)) {
          throw err;
        }
      }

      // 2) fallback via :userId (backend legado)
      if (userId) {
        const r = await tryGet(`/relatorio-emocional/${encodeURIComponent(userId)}`);
        setCache(cacheKey, r);
        return r;
      }

      // sem userId, não há como fazer fallback
      setCache(cacheKey, null);
      return null;
    } catch (err) {
      lastError = err;
      if (attempt === retries) break;
      await sleep(retryDelayMs * Math.pow(2, attempt)); // backoff exponencial
      attempt++;
    }
  }

  console.error(
    "❌ Erro ao buscar relatório emocional:",
    lastError?.response?.data || lastError?.message || lastError
  );
  setCache(cacheKey, null);
  return null;
}

// src/api/relatorioEmocionalApi.ts
import { ApiFetchError, apiFetchJson } from "./apiFetch";

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

const RELATORIO_PATHS = [
  '/api/relatorio-emocional',
  '/relatorio-emocional',
  '/api/v1/relatorio-emocional',
  '/v1/relatorio-emocional',
  '/api/relatorio_emocional',
  '/relatorio_emocional',
  '/api/relatorio',
  '/relatorio',
];

const FALLBACK_STATUS = new Set([400, 404, 405]);

const buildReportCandidates = (userId?: string) => {
  const unique = new Set<string>();
  const items: string[] = [];

  const add = (path: string) => {
    if (!unique.has(path)) {
      unique.add(path);
      items.push(path);
    }
  };

  RELATORIO_PATHS.forEach(add);

  if (userId) {
    const id = encodeURIComponent(userId);
    RELATORIO_PATHS.forEach((path) => add(`${path}?usuario_id=${id}`));
    RELATORIO_PATHS.forEach((path) => add(`${path}/${id}`));
  }

  return items;
};

export async function buscarRelatorioEmocional(
  userId?: string,
  opts?: { timeoutMs?: number; retries?: number; retryDelayMs?: number }
): Promise<RelatorioEmocional | null> {
  const timeoutMs = opts?.timeoutMs ?? 10_000;

  const cacheKey = userId ? `relatorio:${userId}` : 'relatorio:self';
  const cached = getCache(cacheKey);
  if (cached !== undefined) return cached;

  const candidates = buildReportCandidates(userId);
  let lastError: unknown;

  for (const path of candidates) {
    try {
      const payload = await apiFetchJson<any>(path, { method: 'GET', timeoutMs });
      const parsed = unwrapRelatorio(payload);
      if (parsed) {
        setCache(cacheKey, parsed);
        return parsed;
      }
    } catch (error) {
      lastError = error;
      if (error instanceof ApiFetchError && FALLBACK_STATUS.has(error.status ?? 0)) {
        continue;
      }
      console.error(
        '❌ Erro ao buscar relatório emocional:',
        (error as any)?.response?.data || (error as Error)?.message || error
      );
      setCache(cacheKey, null);
      throw error;
    }
  }

  if (lastError instanceof ApiFetchError && FALLBACK_STATUS.has(lastError.status ?? 0)) {
    setCache(cacheKey, null);
    return null;
  }

  if (lastError) {
    console.error(
      '❌ Erro ao buscar relatório emocional:',
      (lastError as any)?.response?.data || (lastError as Error)?.message || lastError
    );
    setCache(cacheKey, null);
    throw lastError;
  }

  setCache(cacheKey, null);
  return null;
}

// src/api/relatorioEmocionalApi.ts
import { ApiFetchError, apiFetchJson } from "./apiFetch";
import { MissingUserIdError } from "./errors";

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

const RELATORIO_ENDPOINT = '/api/relatorio-emocional';

const buildRelatorioUrl = (userId: string) => {
  const params = new URLSearchParams({ usuario_id: userId });
  return `${RELATORIO_ENDPOINT}?${params.toString()}`;
};

export async function buscarRelatorioEmocional(
  userId?: string,
  opts?: { timeoutMs?: number; retries?: number; retryDelayMs?: number }
): Promise<RelatorioEmocional | null> {
  if (!userId) {
    throw new MissingUserIdError(RELATORIO_ENDPOINT);
  }

  const timeoutMs = opts?.timeoutMs ?? 12_000;

  const cacheKey = `relatorio:${userId}`;
  const cached = getCache(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const url = buildRelatorioUrl(userId);
    const payload = await apiFetchJson<any>(url, { method: 'GET', timeoutMs });
    const parsed = unwrapRelatorio(payload);
    setCache(cacheKey, parsed);
    return parsed;
  } catch (error) {
    if (error instanceof ApiFetchError && (error.status === 404 || error.status === 400)) {
      setCache(cacheKey, null);
      throw error;
    }

    console.error(
      '❌ Erro ao buscar relatório emocional:',
      (error as any)?.response?.data || (error as Error)?.message || error
    );
    setCache(cacheKey, null);
    throw error;
  }
}

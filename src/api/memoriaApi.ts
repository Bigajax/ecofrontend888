/* src/api/memoriaApi.ts — funções de acesso ao backend de memórias */

import axios, { AxiosError } from 'axios';
import api from './axios';

/* -------------------------------------------------------------------------- */
/*  Tipagens                                                                  */
/* -------------------------------------------------------------------------- */
export interface Memoria {
  id: string;
  usuario_id: string;
  mensagem_id: string | null;
  resumo_eco: string;
  created_at?: string | null;
  emocao_principal?: string | null;
  intensidade?: number | null;
  contexto?: string | null;
  dominio_vida?: string | null;
  padrao_comportamental?: string | null;
  categoria?: string | null;
  salvar_memoria?: boolean | 'true' | 'false' | 0 | 1;
  nivel_abertura?: number | null;
  analise_resumo?: string | null;
  tags?: string[];
}

export interface MemoriaSimilar {
  id: string;
  contexto: string;
  resumo_eco: string;
  created_at?: string | null;
  tags?: string[];
  /** 0–1 (normalizado). Mantemos similaridade para compat. */
  similarity: number;
  similaridade?: number;
}

/* -------------------------------------------------------------------------- */
/*  Utilitários                                                               */
/* -------------------------------------------------------------------------- */

/** 404/405 permitem fallback para outra rota */
const isFallbackStatus = (err: any) => {
  const s = err?.response?.status;
  return s === 404 || s === 405;
};

/** Normaliza uma memória crua do backend para o shape da interface */
function normalizeMemoria(raw: any): Memoria {
  const tags: string[] = Array.isArray(raw?.tags)
    ? raw.tags
    : typeof raw?.tags === 'string'
      ? raw.tags.split(/[;,]/).map((t: string) => t.trim()).filter(Boolean)
      : [];

  // aliases
  const padrao =
    raw?.padrao_comportamental ??
    raw?.padrao_comportamento ??
    raw?.padrao ??
    null;

  return {
    id: String(raw?.id ?? ''),
    usuario_id: String(raw?.usuario_id ?? raw?.user_id ?? ''),
    mensagem_id: raw?.mensagem_id ?? null,
    resumo_eco: String(raw?.resumo_eco ?? raw?.analise_resumo ?? ''),
    created_at: raw?.created_at ?? null,
    emocao_principal: raw?.emocao_principal ?? null,
    intensidade:
      typeof raw?.intensidade === 'number'
        ? raw.intensidade
        : (typeof raw?.intensity === 'number' ? raw.intensity : null),
    contexto: raw?.contexto ?? null,
    dominio_vida: raw?.dominio_vida ?? raw?.dominio ?? raw?.domain ?? null,
    padrao_comportamental: padrao,
    categoria: raw?.categoria ?? null,
    salvar_memoria: raw?.salvar_memoria,
    nivel_abertura: raw?.nivel_abertura ?? null,
    analise_resumo: raw?.analise_resumo ?? raw?.resumo_eco ?? null,
    tags,
  };
}

/** aceita success/sucesso/ok === true (mas não é obrigatório) */
function isSuccessPayload(d: any): boolean {
  return Boolean(
    (typeof d?.success === 'boolean' && d.success) ||
      (typeof d?.sucesso === 'boolean' && d.sucesso) ||
      (typeof d?.ok === 'boolean' && d.ok)
  );
}

/** tenta achar um array útil no payload (também aceita array "puro") */
function pickArray<T = any>(d: any, keys: string[] = []): T[] | null {
  if (Array.isArray(d)) return d as T[];
  for (const k of ['memories', 'memorias', 'items', 'data', 'rows', 'records', ...keys]) {
    const v = d?.[k];
    if (Array.isArray(v)) return v as T[];
  }
  if (Array.isArray(d?.data?.data)) return d.data.data as T[];
  if (Array.isArray(d?.data)) return d.data as T[];
  return null;
}

/** Serializer para múltiplas tags + limit/limite */
function serializeTagsAndLimit(tags: string[], limite: number): string {
  const params = new URLSearchParams();
  tags.forEach((t) => params.append('tags', t));
  params.set('limite', String(limite));
  params.set('limit', String(limite)); // compat
  return params.toString();
}

/** Normaliza campo de similaridade: aceita similarity/similaridade/score/distancia */
function normalizeSimilarity(raw: any): number {
  // tentamos 0–1 primeiro
  let s =
    raw?.similarity ??
    raw?.similaridade ??
    raw?.score ??
    null;

  if (s == null && typeof raw?.distancia === 'number') {
    // alguns backends retornam distância (quanto menor melhor). Converte para ~similaridade.
    const d = raw.distancia;
    s = d <= 0 ? 1 : 1 / (1 + d);
  }

  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  // se veio >1 (p.ex. score cosine * 100), normaliza para 0–1
  return n > 1 ? Math.min(1, n / 100) : Math.max(0, n);
}

/* -------------------------------------------------------------------------- */
/*  Tratamento de erro padrão                                                 */
/* -------------------------------------------------------------------------- */
function tratarErro(err: unknown, acao: string): never {
  if (axios.isAxiosError(err)) {
    const e = err as AxiosError<any>;
    const status = e.response?.status;
    const statusText = e.response?.statusText ?? '';
    const body = e.response?.data;

    const serverMsg =
      (typeof body === 'string' && body) ||
      body?.error ||
      body?.message ||
      body?.details ||
      null;

    if (serverMsg) throw new Error(`Erro do servidor ao ${acao}: ${serverMsg}`);
    if (status) throw new Error(`Erro HTTP ${status} ao ${acao}: ${statusText || 'Falha na requisição'}`);
    if (e.request) throw new Error(`Erro de rede ao ${acao}: nenhuma resposta recebida`);
    throw new Error(`Erro ao ${acao}: ${e.message}`);
  }
  throw new Error(`Erro inesperado ao ${acao}: ${(err as any)?.message || String(err)}`);
}

/* -------------------------------------------------------------------------- */
/*  Helpers de domínio                                                        */
/* -------------------------------------------------------------------------- */
export const memoriaEhSalva = (m: Partial<Memoria>) => {
  const v: any = m?.salvar_memoria;
  if (v === undefined || v === null) return true;
  if (typeof v === 'string') return v.toLowerCase() === 'true' || v === '1';
  if (typeof v === 'number') return v === 1;
  return !!v;
};

/* -------------------------------------------------------------------------- */
/*  Fallback de rotas                                                         */
/* -------------------------------------------------------------------------- */
async function getWithFallback(pathA: string, pathB: string | null, config?: any) {
  try {
    return await api.get(pathA, config);
  } catch (e: any) {
    if (pathB && isFallbackStatus(e)) {
      return await api.get(pathB, config);
    }
    throw e;
  }
}

async function postWithFallback(pathA: string, pathB: string | null, body?: any, config?: any) {
  try {
    return await api.post(pathA, body, config);
  } catch (e: any) {
    if (pathB && isFallbackStatus(e)) {
      return await api.post(pathB, body, config);
    }
    throw e;
  }
}

/* -------------------------------------------------------------------------- */
/*  API Pública                                                               */
/* -------------------------------------------------------------------------- */

/**
 * 🔍 Busca as últimas memórias do usuário que possuam *alguma* das tags pedidas.
 */
export async function buscarUltimasMemoriasComTags(
  userId: string,
  tags: string[],
  limite = 5
): Promise<Memoria[]> {
  try {
    if (!tags.length) return [];

    const config = {
      params: { tags, limite, limit: limite, usuario_id: userId },
      paramsSerializer: () => serializeTagsAndLimit(tags, limite),
      timeout: 12000,
    };

    const { data } = await getWithFallback('/memorias', '/memories', config);

    const raw = pickArray<any>(data) ?? [];
    if (raw.length) {
      return raw
        .map(normalizeMemoria)
        .filter((m) => Array.isArray(m.tags) && m.tags.length > 0)
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        .slice(0, limite);
    }

    if (isSuccessPayload(data)) return [];
    if (import.meta.env.DEV) console.warn('[memoriaApi] Resposta inesperada em buscarUltimasMemoriasComTags:', data);
    return [];
  } catch (err) {
    tratarErro(err, 'buscar memórias com tags');
  }
}

/**
 * 📥 Lista todas as memórias do usuário (RLS via JWT; `usuario_id` é opcional).
 */
export async function buscarMemoriasPorUsuario(userId?: string): Promise<Memoria[]> {
  try {
    const config = {
      params: userId ? { usuario_id: userId } : undefined,
      timeout: 12000,
    };

    const { data } = await getWithFallback('/memorias', '/memories', config);

    const raw = pickArray<any>(data) ?? [];
    if (raw.length) {
      return raw
        .map(normalizeMemoria)
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    }

    if (isSuccessPayload(data)) return [];
    if (import.meta.env.DEV) console.warn('[memoriaApi] Resposta inesperada em buscarMemoriasPorUsuario:', data);
    return [];
  } catch (err) {
    tratarErro(err, 'buscar memórias');
  }
}

/**
 * 🧠 v2 preferencial — memórias semanticamente parecidas (suporta k/threshold/usuario_id).
 * Tenta /memorias/similares_v2 e cai para v1 se necessário.
 */
export async function buscarMemoriasSemelhantesV2(
  texto: string,
  {
    k = 3,
    threshold = 0.12,
    usuario_id,
  }: { k?: number; threshold?: number; usuario_id?: string } = {}
): Promise<MemoriaSimilar[]> {
  try {
    // tenta v2
    try {
      const bodyV2 = { texto, query: texto, k, limit: k, limite: k, threshold, usuario_id };
      const { data } = await postWithFallback('/memorias/similares_v2', '/memories/similar_v2', bodyV2, { timeout: 12000 });
      const raw = pickArray<any>(data) ?? [];
      if (raw.length) {
        return raw.map((r) => {
          const n = normalizeMemoria(r);
          const sim = normalizeSimilarity(r);
          return {
            id: n.id,
            contexto: n.contexto ?? '',
            resumo_eco: n.resumo_eco ?? '',
            created_at: n.created_at ?? null,
            tags: n.tags ?? [],
            similarity: sim,
            similaridade: sim, // compat
          };
        });
      }
      if (isSuccessPayload(data)) return [];
    } catch (e) {
      // se não existir, cai para v1
      if (!isFallbackStatus(e)) throw e;
    }

    // v1 (compat)
    const bodyV1 = { texto, query: texto, limite: k, limit: k };
    const { data } = await postWithFallback('/memorias/similares', '/memories/similar', bodyV1, { timeout: 12000 });
    const raw = pickArray<any>(data) ?? [];
    if (raw.length) {
      return raw.map((r) => {
        const n = normalizeMemoria(r);
        const sim = normalizeSimilarity(r);
        return {
          id: n.id,
          contexto: n.contexto ?? '',
          resumo_eco: n.resumo_eco ?? '',
          created_at: n.created_at ?? null,
          tags: n.tags ?? [],
          similarity: sim,
          similaridade: sim,
        };
      });
    }

    if (isSuccessPayload(data)) return [];
    if (import.meta.env.DEV) console.warn('[memoriaApi] Resposta inesperada de similares:', data);
    return [];
  } catch (err) {
    tratarErro(err, 'buscar memórias semelhantes');
  }
}

/**
 * 📄 Lista básica para gráficos locais (campos mínimos).
 */
export async function listarMemoriasBasico(limit = 500): Promise<Memoria[]> {
  try {
    const { data } = await getWithFallback('/memorias', '/memories', {
      params: {
        limit,
        limite: limit,
        fields: 'id,created_at,emocao_principal,tags,categoria,dominio_vida,resumo_eco',
      },
      timeout: 12000,
    });

    const raw = pickArray<any>(data) ?? [];
    return raw.map(normalizeMemoria);
  } catch (err) {
    tratarErro(err, 'listar memórias (básico)');
  }
}

/* src/api/memoriaApi.ts
   — funções de acesso ao backend de memórias — */

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
  similaridade: number;
}

/* -------------------------------------------------------------------------- */
/*  Utilitários                                                               */
/* -------------------------------------------------------------------------- */
function serializeTagsAndLimit(tags: string[], limite: number): string {
  const search = new URLSearchParams();
  tags.forEach((t) => search.append('tags', t));
  search.set('limite', String(limite));
  search.set('limit', String(limite)); // compat
  return search.toString();
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
  return null;
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
  if (v === undefined || v === null) return true; // sem flag -> considera salva
  if (typeof v === 'string') return v.toLowerCase() === 'true' || v === '1';
  if (typeof v === 'number') return v === 1;
  return !!v;
};

/* -------------------------------------------------------------------------- */
/*  API Pública                                                               */
/* -------------------------------------------------------------------------- */

/**
 * 🔍 Busca as últimas memórias do usuário que possuam *alguma* das tags pedidas.
 * Backend aceito: GET /memorias?tags=...&tags=...&limite=5 (ou limit=5)
 */
export async function buscarUltimasMemoriasComTags(
  userId: string,
  tags: string[],
  limite = 5
): Promise<Memoria[]> {
  try {
    if (!tags.length) return [];

    const { data } = await api.get('/memorias', {
      params: { tags, limite, limit: limite, usuario_id: userId },
      paramsSerializer: () => serializeTagsAndLimit(tags, limite),
    });

    const list = pickArray<Memoria>(data) ?? [];
    const ok = isSuccessPayload(data);

    // Se tem lista, retornamos — independente de "ok" existir
    if (list.length) {
      return list
        .filter((m) => Array.isArray(m.tags) && m.tags.length > 0)
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        .slice(0, limite);
    }

    // Sem lista, mas payload diz success => apenas [].
    if (ok) return [];

    if (import.meta.env.DEV) {
      console.warn('[memoriaApi] Resposta inesperada em buscarUltimasMemoriasComTags:', data);
    }
    return [];
  } catch (err) {
    tratarErro(err, 'buscar memórias com tags');
  }
}

/**
 * 📥 Busca todas as memórias do usuário (RLS via JWT; `usuario_id` é opcional).
 * Backend: GET /memorias?usuario_id=...
 */
export async function buscarMemoriasPorUsuario(userId?: string): Promise<Memoria[]> {
  try {
    const { data } = await api.get('/memorias', {
      params: userId ? { usuario_id: userId } : undefined,
    });

    const list = pickArray<Memoria>(data) ?? [];
    if (list.length) return list;

    // Mesmo sem array, se o servidor sinaliza OK, devolve []
    if (isSuccessPayload(data)) return [];

    if (import.meta.env.DEV) {
      console.warn('[memoriaApi] Resposta inesperada em buscarMemoriasPorUsuario:', data);
    }
    return [];
  } catch (err) {
    tratarErro(err, 'buscar memórias');
  }
}

/**
 * 🧠 Busca memórias semanticamente parecidas com um texto.
 * Backend: POST /memorias/similares
 * Aceita payload { texto, limite } OU { query, limit } (ambos enviados).
 */
export async function buscarMemoriasSimilares(
  texto: string,
  limite = 3
): Promise<MemoriaSimilar[]> {
  try {
    const { data } = await api.post('/memorias/similares', {
      texto,
      query: texto,    // compat
      limite,
      limit: limite,   // compat
    });

    const list = pickArray<MemoriaSimilar>(data) ?? [];
    if (list.length) return list;

    if (isSuccessPayload(data)) return [];

    if (import.meta.env.DEV) {
      console.warn('[memoriaApi] Resposta inesperada de similares:', data);
    }
    return [];
  } catch (err) {
    tratarErro(err, 'buscar memórias semelhantes');
  }
}

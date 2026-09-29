// src/api/emocional.ts
import { apiFetchJson } from '@/lib/apiFetch';

/**
 * Memórias, retrato e relatório emocional (set/2026). O servidor sabe de quem
 * são pelo token (apiFetchJson manda o Bearer da sessão); nada de usuario_id
 * na URL, que deixava qualquer um ler os dados de outra pessoa.
 */

export interface Memoria {
  id: string;
  created_at: string | null;
  emocao_principal: string | null;
  intensidade: number | null;
  resumo_eco: string | null;
  analise_resumo: string | null;
  dominio_vida: string | null;
  categoria: string | null;
  tags: string[];
}

export interface Retrato {
  resumo_geral_ia: string | null;
  emocoes_frequentes: Record<string, number>;
  temas_recorrentes: Record<string, number>;
  ultima_interacao_sig: string | null;
  updated_at: string | null;
}

export type Clima = 'leve' | 'pesado' | 'misto';

export interface Relatorio {
  periodo_dias: number;
  total_memorias: number;
  dias: { data: string; memorias: number; intensidade_media: number; clima: Clima }[];
  clima: Record<Clima, number>;
  emocoes: { emocao: string; vezes: number }[];
  temas: { tema: string; vezes: number }[];
  tags: { tag: string; vezes: number }[];
  atualizado_em: string;
}

const TTL = 60_000;
const cache = new Map<string, { em: number; valor: unknown }>();

async function buscar<T>(chave: string, url: string, ler: (d: unknown) => T): Promise<T> {
  const c = cache.get(chave);
  if (c && Date.now() - c.em < TTL) return c.valor as T;
  const r = await apiFetchJson<unknown>(url, { method: 'GET', timeoutMs: 15_000 });
  if (!r.ok) throw new Error(r.status === 0 ? 'Sem conexão com a Casa.' : `Erro ${r.status}`);
  const valor = ler(r.data);
  cache.set(chave, { em: Date.now(), valor });
  return valor;
}

/** Uma conversa virou memória: a próxima visita busca de novo. */
export function esquecerCacheEmocional() {
  cache.clear();
}

export function buscarMemorias(): Promise<Memoria[]> {
  return buscar('memorias', '/api/memorias?limite=500', (d) => (Array.isArray(d) ? (d as Memoria[]) : []));
}

export function buscarRetrato(): Promise<Retrato | null> {
  return buscar('retrato', '/api/perfil-emocional', (d) => {
    const p = (d as { perfil?: Partial<Retrato> | null } | null)?.perfil;
    if (!p || typeof p !== 'object') return null;
    return {
      resumo_geral_ia: p.resumo_geral_ia ?? null,
      emocoes_frequentes: p.emocoes_frequentes ?? {},
      temas_recorrentes: p.temas_recorrentes ?? {},
      ultima_interacao_sig: p.ultima_interacao_sig ?? null,
      updated_at: p.updated_at ?? null,
    };
  });
}

/** null quando o servidor ainda está na versão antiga (sem `dias`). */
export function buscarRelatorio(dias: number): Promise<Relatorio | null> {
  return buscar(`relatorio:${dias}`, `/api/relatorio-emocional?dias=${dias}`, (d) => {
    const r = (d as { relatorio?: Relatorio } | null)?.relatorio;
    return r && Array.isArray(r.dias) ? r : null;
  });
}

/** Nome de exibição do tema (o servidor guarda chaves como "familia", "saude_mental"). */
const NOMES_DE_TEMA: Record<string, string> = {
  familia: 'Família',
  saude: 'Saúde',
  saude_mental: 'Saúde mental',
  financeiro: 'Dinheiro',
  proposito: 'Propósito',
  autoestima: 'Autoestima',
  autocuidado: 'Autocuidado',
  espiritualidade: 'Espiritualidade',
  estudos: 'Estudos',
  lazer: 'Lazer',
  comunidade: 'Comunidade',
  relacionamentos: 'Relacionamentos',
  trabalho: 'Trabalho',
  bem_estar: 'Bem-estar',
  outros: 'Outros',
};

export function nomeDoTema(chave: string): string {
  const k = chave.trim().toLowerCase().replace(/\s+/g, '_');
  if (NOMES_DE_TEMA[k]) return NOMES_DE_TEMA[k];
  const t = chave.replace(/_/g, ' ').trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

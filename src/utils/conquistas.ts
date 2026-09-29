/**
 * O que a pessoa já fez em cada programa, lido do aparelho (set/2026). Usado
 * pela Porta do reino ("Seu caminho até aqui") e pelas Estatísticas de Sua
 * conta, para as duas contarem igual. Só entra o que é maior que zero.
 */

export interface Conquista {
  texto: string;
}

function lerJson<T>(chave: string, padrao: T): T {
  try {
    const bruto = localStorage.getItem(chave);
    return bruto ? (JSON.parse(bruto) as T) : padrao;
  } catch {
    return padrao;
  }
}

/** O que a pessoa já fez, lido do aparelho. Só entra o que é maior que zero. */
export function conquistas(uid: string | null): Conquista[] {
  const lista: Conquista[] = [];

  const aneis = lerJson<Array<{ status?: string; date?: string }>>(`eco.rings.v1.rituals.${uid || 'anon'}`, []);
  const diasAneis = new Set(aneis.filter((r) => r?.status === 'completed').map((r) => r.date)).size;
  if (diasAneis > 0) lista.push({ texto: `${diasAneis} ${diasAneis === 1 ? 'dia' : 'dias'} nos Cinco Anéis` });

  const intro = lerJson<Array<{ completed?: boolean }>>(`eco.introducao.meditations.v2.${uid || 'guest'}`, []);
  const introFeitas = Array.isArray(intro) ? intro.filter((m) => m?.completed).length : 0;
  if (introFeitas > 0) lista.push({ texto: `${introFeitas} de 5 pedras dos Primeiros passos` });

  const sono = lerJson<{ completedNights?: number[] }>(`eco.sono.protocol.v1.${uid || 'guest'}`, {});
  const noites = Array.isArray(sono.completedNights) ? sono.completedNights.length : 0;
  if (noites > 0) lista.push({ texto: `${noites} de 7 noites do Protocolo do Sono` });

  const drJoe = lerJson<Array<{ completed?: boolean }>>(`eco.drJoe.meditations.v1.${uid || 'guest'}`, []);
  const drJoeFeitas = Array.isArray(drJoe) ? drJoe.filter((m) => m?.completed).length : 0;
  if (drJoeFeitas > 0) lista.push({ texto: `${drJoeFeitas} de 5 dias de Desperte seu potencial` });

  return lista;
}


import type { DailyRitual, RingType } from '@/types/rings';

/**
 * A jornada dos Cinco Anéis (set/2026): 30 dias em 5 estágios de 6 dias, um
 * anel por estágio, na ordem de Musashi (Terra, Água, Fogo, Vento, Vazio).
 *
 * Cada dia são duas perguntas: a do anel da vez (muda a cada dia do estágio,
 * então todo dia tem algo novo) e a de fechamento, sempre a mesma. Antes eram
 * as mesmas 5 perguntas todos os dias, sem começo nem fim.
 *
 * O dia avança por prática, não por calendário: faltar um dia não zera nada.
 * Um dia por data: quem fecha o dia de hoje abre o próximo amanhã.
 */

export const DIAS_DA_JORNADA = 30;
export const DIAS_POR_ANEL = 6;

/**
 * Sem assinatura (set/2026): o Anel da Terra inteiro. Um anel completo, com
 * o Selo no fim, antes do pedido; a assinatura abre do Anel da Água em diante.
 * Visitante sem conta faz o dia 1; a conta grátis libera o resto da Terra.
 */
export const DIAS_GRATIS = DIAS_POR_ANEL;

export const ORDEM_DOS_ANEIS: RingType[] = ['earth', 'water', 'fire', 'wind', 'void'];

export const PERGUNTA_DE_FECHAMENTO = 'Em uma frase: qual é o seu passo de amanhã?';

export const PERGUNTAS: Record<RingType, string[]> = {
  earth: [
    'O que tirou o seu foco hoje?',
    'Em que momento do dia você esteve mais presente?',
    'O que você fez hoje só por hábito, sem escolher?',
    'Que tarefa você adiou? O que estava por trás?',
    'O que você viu hoje como ele é, sem enfeitar?',
    'Olhando estes dias: que distração se repete?',
  ],
  water: [
    'Qual o menor ajuste que você pode fazer amanhã?',
    'O que saiu diferente do plano hoje, e como você se adaptou?',
    'Onde você insistiu quando era hora de mudar de caminho?',
    'Que parte da sua rotina pede menos esforço e mais fluxo?',
    'O que você pode soltar amanhã para caber o que importa?',
    'Qual ajuste destes dias já virou costume?',
  ],
  fire: [
    'Que emoção forte você sentiu hoje?',
    'Em que ação uma emoção de hoje pode virar?',
    'O que te irritou hoje, e o que isso diz do que você valoriza?',
    'Quando você reagiu rápido demais? O que faria diferente?',
    'Que medo apareceu hoje disfarçado de outra coisa?',
    'Qual emoção você aprendeu a usar a seu favor nestes dias?',
  ],
  wind: [
    'O que você aprendeu hoje?',
    'Com quem você pode aprender algo nesta semana?',
    'Que erro de hoje te ensinou alguma coisa?',
    'Que jeito de fazer, diferente do seu, você observou hoje?',
    'O que você ainda faz como iniciante e quer praticar?',
    'O que mudou no seu jeito de aprender nestes dias?',
  ],
  void: [
    'Quem você está se tornando ao praticar todo dia?',
    'O que você fez hoje sem precisar de força de vontade?',
    'Que parte de você ficou mais quieta nestes dias?',
    'O que você faria mesmo se ninguém visse?',
    'Qual das cinco lições pesa mais para você hoje?',
    'Depois de 30 dias: o que fica com você?',
  ],
};

/** Um jeito de responder, no tom de cada anel (fica sob a pergunta). */
export const DICA_DO_ANEL: Record<RingType, string> = {
  earth: 'Sem enfeitar. O que foi, foi.',
  water: 'Pequeno de propósito. O menor ajuste é o que acontece.',
  fire: 'Dê nome à emoção antes de julgar se ela é boa ou ruim.',
  wind: 'Aprendizado pequeno também conta.',
  void: 'Escreva como quem vai reler daqui a um ano.',
};

/** Dias distintos com ritual concluído (um por data). */
export function diasConcluidos(rituais: DailyRitual[]): string[] {
  return Array.from(new Set(rituais.filter((r) => r.status === 'completed').map((r) => r.date))).sort();
}

export interface PontoDaJornada {
  /** dias já feitos neste ciclo (0 a 30) */
  feitos: number;
  /** o dia a fazer (1 a 30); 30 também quando o ciclo acabou */
  dia: number;
  /** anel do dia a fazer */
  anel: RingType;
  /** posição do dia dentro do anel (1 a 6) */
  diaNoAnel: number;
  /** a pergunta do anel para o dia a fazer */
  pergunta: string;
  /** os 30 dias deste ciclo já foram feitos */
  completo: boolean;
}

export function anelDoDia(dia: number): RingType {
  const i = Math.min(ORDEM_DOS_ANEIS.length - 1, Math.floor((Math.max(1, dia) - 1) / DIAS_POR_ANEL));
  return ORDEM_DOS_ANEIS[i];
}

export function perguntaDoDia(dia: number): string {
  const anel = anelDoDia(dia);
  return PERGUNTAS[anel][(Math.max(1, dia) - 1) % DIAS_POR_ANEL];
}

/**
 * Onde a pessoa está. `inicioDoCiclo` é quantos dias já tinham sido feitos
 * quando este ciclo começou (0 no primeiro; ao percorrer de novo, vira o total).
 */
export function pontoDaJornada(totalFeitos: number, inicioDoCiclo = 0): PontoDaJornada {
  const feitos = Math.max(0, Math.min(DIAS_DA_JORNADA, totalFeitos - inicioDoCiclo));
  const completo = feitos >= DIAS_DA_JORNADA;
  const dia = completo ? DIAS_DA_JORNADA : feitos + 1;
  return {
    feitos,
    dia,
    anel: anelDoDia(dia),
    diaNoAnel: ((dia - 1) % DIAS_POR_ANEL) + 1,
    pergunta: perguntaDoDia(dia),
    completo,
  };
}

/** Dias (1 a 30) que pertencem a um anel. */
export function diasDoAnel(anel: RingType): [number, number] {
  const i = ORDEM_DOS_ANEIS.indexOf(anel);
  return [i * DIAS_POR_ANEL + 1, (i + 1) * DIAS_POR_ANEL];
}

/** Estado de um anel na jornada: já atravessado, o de agora, ou ainda fechado. */
export function estadoDoAnel(anel: RingType, ponto: PontoDaJornada): 'feito' | 'agora' | 'fechado' {
  const [, fim] = diasDoAnel(anel);
  const [inicio] = diasDoAnel(anel);
  if (ponto.feitos >= fim) return 'feito';
  if (ponto.dia >= inicio) return 'agora';
  return 'fechado';
}

// Início do ciclo guardado por pessoa (percorrer de novo depois dos 30 dias).
const chaveCiclo = (uid?: string | null) => `eco.rings.v1.ciclo.${uid || 'anon'}`;

export function lerInicioDoCiclo(uid?: string | null): number {
  try {
    return Number(localStorage.getItem(chaveCiclo(uid))) || 0;
  } catch {
    return 0;
  }
}

export function comecarNovoCiclo(uid: string | null | undefined, totalFeitos: number): void {
  try {
    localStorage.setItem(chaveCiclo(uid), String(totalFeitos));
  } catch {
    // sem storage: o ciclo novo não persiste, mas nada quebra
  }
}

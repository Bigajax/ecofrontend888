import { getTodayDate } from '@/utils/dataLocal';

/**
 * O caminho no reino (set/2026): a progressão de todo o app numa medida só,
 * dias de prática. Conta o dia em que a pessoa fez qualquer prática: uma
 * meditação ouvida até o fim (80%), uma noite do sono, o dia dos Cinco Anéis,
 * uma página do Diário, um passo da Riqueza Mental. Dias, não pontos: faltar
 * não tira nada, e cada dia a mais aproxima o próximo marco.
 *
 * Fica no aparelho, por pessoa (chave com o id). Trocar de aparelho ainda não
 * leva junto: quando houver endpoint, é daqui que se sincroniza.
 */

export interface Marco {
  dias: number;
  nome: string;
  /** uma linha para a folha de quando o marco é alcançado */
  frase: string;
}

export const MARCOS: Marco[] = [
  { dias: 1, nome: 'Chegou ao reino', frase: 'O primeiro dia de prática. O caminho começa pequeno.' },
  { dias: 7, nome: 'Conhece o caminho', frase: 'Uma semana de dias. O reino já sabe o seu nome.' },
  { dias: 21, nome: 'Tem casa aqui', frase: 'Vinte e um dias. Voltar já é parte da sua rotina.' },
  { dias: 40, nome: 'Guarda o fogo', frase: 'Quarenta dias. A prática se sustenta sem esforço.' },
  { dias: 90, nome: 'Faz parte do reino', frase: 'Noventa dias. O reino é seu também.' },
];

export type OrigemDaPratica = 'meditacao' | 'sono' | 'aneis' | 'diario' | 'riqueza' | 'abundancia';

export const EVENTO_CAMINHO = 'eco:caminho';
export interface DetalheEventoCaminho {
  dias: number;
  /** marco alcançado agora, se este dia cruzou um */
  marcoNovo: Marco | null;
}

const chave = (uid?: string | null) => `eco.caminho.v1.${uid || 'guest'}`;
const CHAVE_MARCO_PENDENTE = 'eco.caminho.marco-pendente';

export function lerDiasDePratica(uid?: string | null): string[] {
  try {
    const bruto = JSON.parse(localStorage.getItem(chave(uid)) || '[]');
    return Array.isArray(bruto) ? bruto.filter((d) => typeof d === 'string') : [];
  } catch {
    return [];
  }
}

function gravar(uid: string | null | undefined, dias: string[]) {
  try {
    localStorage.setItem(chave(uid), JSON.stringify(dias));
  } catch {
    // sem storage: o caminho não avança neste aparelho, nada quebra
  }
}

/**
 * Soma dias vindos de outro lugar (ex.: dias dos Cinco Anéis já feitos antes
 * do caminho existir) sem disparar marco.
 */
export function juntarDiasDePratica(uid: string | null | undefined, datas: string[]) {
  const atual = new Set(lerDiasDePratica(uid));
  let mudou = false;
  for (const d of datas) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d) && !atual.has(d)) {
      atual.add(d);
      mudou = true;
    }
  }
  if (mudou) gravar(uid, Array.from(atual).sort());
}

/** Registra que hoje houve prática. Um registro por dia; os seguintes não fazem nada. */
export function registrarPratica(uid: string | null | undefined, origem: OrigemDaPratica): void {
  const hoje = getTodayDate();
  const dias = lerDiasDePratica(uid);
  if (dias.includes(hoje)) return;

  const antes = dias.length;
  const depois = antes + 1;
  gravar(uid, [...dias, hoje].sort());

  const marcoNovo = MARCOS.find((m) => m.dias > antes && m.dias <= depois) ?? null;
  if (marcoNovo) {
    try {
      sessionStorage.setItem(CHAVE_MARCO_PENDENTE, String(marcoNovo.dias));
    } catch {
      // sem sessionStorage: a folha do marco só aparece se a tela estiver aberta
    }
  }

  try {
    window.dispatchEvent(
      new CustomEvent<DetalheEventoCaminho>(EVENTO_CAMINHO, { detail: { dias: depois, marcoNovo } })
    );
  } catch {
    // ambiente sem window
  }

  void import('@/lib/mixpanel')
    .then(({ default: mixpanel }) => {
      mixpanel.track('Caminho · Dia de prática', { dias: depois, origem, marco: marcoNovo?.nome ?? null });
    })
    .catch(() => undefined);
}

/** Marco alcançado que ainda não foi mostrado (sobrevive a uma troca de página). */
export function tirarMarcoPendente(): Marco | null {
  try {
    const dias = Number(sessionStorage.getItem(CHAVE_MARCO_PENDENTE));
    sessionStorage.removeItem(CHAVE_MARCO_PENDENTE);
    return MARCOS.find((m) => m.dias === dias) ?? null;
  } catch {
    return null;
  }
}

export interface EstadoDoCaminho {
  dias: number;
  /** último marco alcançado (null antes do primeiro dia) */
  marco: Marco | null;
  /** próximo marco (null depois do último) */
  proximo: Marco | null;
  faltam: number;
  /** avanço de 0 a 1 do marco atual até o próximo */
  valor: number;
}

export function estadoDoCaminho(dias: number): EstadoDoCaminho {
  const alcancados = MARCOS.filter((m) => m.dias <= dias);
  const marco = alcancados[alcancados.length - 1] ?? null;
  const proximo = MARCOS.find((m) => m.dias > dias) ?? null;
  const base = marco?.dias ?? 0;
  const valor = proximo ? (dias - base) / (proximo.dias - base) : 1;
  return { dias, marco, proximo, faltam: proximo ? proximo.dias - dias : 0, valor: Math.max(0, Math.min(1, valor)) };
}

/** A linha do caminho, em linguagem de gente. */
export function fraseDoCaminho(e: EstadoDoCaminho): string {
  if (e.dias === 0) return 'O seu caminho no reino começa com a primeira prática.';
  const dia = `Dia ${e.dias} no reino.`;
  if (!e.proximo) return `${dia} Você faz parte do reino.`;
  return `${dia} ${e.faltam === 1 ? 'Falta 1 dia' : `Faltam ${e.faltam} dias`} para ${e.proximo.nome}.`;
}

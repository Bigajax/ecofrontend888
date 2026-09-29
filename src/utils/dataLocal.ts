/**
 * Datas "do dia" no fuso de quem usa (set/2026). toISOString() dá o dia em UTC:
 * no Brasil, depois das 21h, já é "amanhã", e new Date('YYYY-MM-DD') é
 * meia-noite UTC, o que mostra o dia anterior.
 */

export function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Hoje em YYYY-MM-DD, no fuso local. */
export function getTodayDate(): string {
  return toLocalDateKey(new Date());
}

/** 'YYYY-MM-DD' como data local. */
export function parseLocalDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

const DIA_MS = 1000 * 60 * 60 * 24;

/** Dias de calendário entre duas chaves (a - b). */
export function diasEntre(a: string, b: string): number {
  return Math.round((parseLocalDate(a).getTime() - parseLocalDate(b).getTime()) / DIA_MS);
}

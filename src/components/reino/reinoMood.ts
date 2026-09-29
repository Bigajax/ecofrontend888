/**
 * Humor da home no redesign "reino": a paisagem, a pergunta e a região
 * predominante mudam com a hora de Brasília.
 *   amanhecer 5h–12h  → Pórtico (Diário Estoico)
 *   entardecer 12h–20h → Casa da Eco (conversa)
 *   noite 20h–5h       → Vale do Sono (Ritual Boa Noite)
 */
export type ReinoMood = 'amanhecer' | 'entardecer' | 'noite';

export function getBrasiliaHour(now: Date = new Date()): number {
  const hour = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    hour: 'numeric',
    hourCycle: 'h23',
  }).format(now);
  return Number(hour);
}

export function getReinoMood(now: Date = new Date()): ReinoMood {
  const hour = getBrasiliaHour(now);
  if (hour >= 5 && hour < 12) return 'amanhecer';
  if (hour >= 12 && hour < 20) return 'entardecer';
  return 'noite';
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "Hoje · 28 set", no fuso de Brasília. */
export function formatHojeLabel(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    day: 'numeric',
    month: 'numeric',
  }).formatToParts(now);
  const day = parts.find((p) => p.type === 'day')?.value ?? '';
  const month = Number(parts.find((p) => p.type === 'month')?.value ?? '1');
  return `Hoje · ${day} ${MESES[month - 1]}`;
}

/** Primeiro nome capitalizado, ou null quando não há nome (convidado). */
export function getFirstName(fullName?: string | null): string | null {
  const first = (fullName ?? '').trim().split(/\s+/)[0];
  if (!first) return null;
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

import { analyzeBiasSignals } from '../prompt/heuristics/signalizer';
import type { HeuristicSignalName } from '../prompt/types';

type BiasAnalyzableMessage = { role?: string | null; content?: string | null };

const MIN_SCORE = 0.2;
const MAX_HINTS = 4;

const clampScore = (score: number | undefined): number => {
  if (!Number.isFinite(score)) return 0;
  if (score < 0) return 0;
  if (score > 1) return 1;
  return score;
};

const formatHint = (signal: HeuristicSignalName, score: number): string | null => {
  const normalized = clampScore(score);
  if (normalized <= 0) return null;
  const percentage = Math.round(normalized * 100);
  if (percentage <= 0) {
    return signal;
  }
  return `${signal}:${percentage}`;
};

export function computeBiasHintFromText(text: string | null | undefined): string | null {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  const signals = analyzeBiasSignals(trimmed);
  const scored = Object.entries(signals)
    .map(([name, value]) => ({
      name: name as HeuristicSignalName,
      score: clampScore(value?.score as number | undefined),
    }))
    .filter((entry) => entry.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_HINTS);

  const parts = scored
    .map(({ name, score }) => formatHint(name, score))
    .filter((value): value is string => Boolean(value));

  if (parts.length === 0) return null;

  const serialized = parts.join(',');
  return serialized.length > 256 ? serialized.slice(0, 256) : serialized;
}

export function computeBiasHintFromMessages(
  messages: BiasAnalyzableMessage[] | null | undefined,
): string | null {
  if (!Array.isArray(messages) || messages.length === 0) {
    return null;
  }

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const candidate = messages[index];
    if (!candidate) continue;
    const role = typeof candidate.role === 'string' ? candidate.role.toLowerCase() : 'user';
    if (role !== 'user') continue;
    const text = typeof candidate.content === 'string' ? candidate.content : null;
    const hint = computeBiasHintFromText(text);
    if (hint) {
      return hint;
    }
  }

  return null;
}

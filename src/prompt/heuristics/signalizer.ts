import {
  BiasSignal,
  HeuristicSignalName,
  HEURISTIC_SIGNAL_NAMES,
} from '../types';
import { HEURISTICS_SIGNAL_TTL_DEFAULT_S } from './constants';

const clamp01 = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
};

const normalizeText = (text: string): string => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s!?%]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
};

type PatternDefinition = {
  regex: RegExp;
  weight: number;
};

type SignalPatternMap = Record<HeuristicSignalName, PatternDefinition[]>;

const PATTERNS: SignalPatternMap = {
  negation: [
    { regex: /\bnao\b/giu, weight: 0.35 },
    { regex: /\bnunca\b/giu, weight: 0.4 },
    { regex: /\bjamais\b/giu, weight: 0.4 },
  ],
  uncertainty: [
    { regex: /\btalvez\b/giu, weight: 0.45 },
    { regex: /\bacho que\b/giu, weight: 0.35 },
    { regex: /\bn[aã]o sei\b/giu, weight: 0.5 },
  ],
  urgency: [
    { regex: /\bpreciso\b/giu, weight: 0.45 },
    { regex: /\bimediat[oa]\b/giu, weight: 0.5 },
    { regex: /\bagora mesmo\b/giu, weight: 0.4 },
  ],
  self_blame: [
    { regex: /\bé minha culpa\b/giu, weight: 0.6 },
    { regex: /\bculpa minha\b/giu, weight: 0.55 },
    { regex: /\bfui eu que estraguei\b/giu, weight: 0.6 },
    { regex: /\bculp[ao]\b/giu, weight: 0.35 },
  ],
  catastrophizing: [
    { regex: /\bnunca vai dar certo\b/giu, weight: 0.7 },
    { regex: /\bnada vai melhorar\b/giu, weight: 0.65 },
    { regex: /\bé o fim\b/giu, weight: 0.55 },
    { regex: /\bcat[aá]strof[ea]/giu, weight: 0.45 },
  ],
  rumination: [
    { regex: /\b(nao consigo|nao posso) parar de pensar\b/giu, weight: 0.65 },
    { regex: /\bfico pensando\b/giu, weight: 0.45 },
    { regex: /\bvolto sempre\b/giu, weight: 0.35 },
  ],
  people_pleasing: [
    { regex: /\bnao quero decepcionar\b/giu, weight: 0.65 },
    { regex: /\bquero agradar todo mundo\b/giu, weight: 0.65 },
    { regex: /\bagradar os outros\b/giu, weight: 0.55 },
  ],
  perfectionism: [
    { regex: /\bnao posso errar\b/giu, weight: 0.65 },
    { regex: /\bpreciso ser perfeito\b/giu, weight: 0.65 },
    { regex: /\bperfei[cç][aã]o\b/giu, weight: 0.45 },
  ],
  avoidance: [
    { regex: /\bdepois eu vejo\b/giu, weight: 0.5 },
    { regex: /\badi[ae]r\b/giu, weight: 0.45 },
    { regex: /\bestou fugindo\b/giu, weight: 0.55 },
  ],
};

const accumulateScore = (text: string, patterns: PatternDefinition[]): number => {
  let total = 0;
  for (const { regex, weight } of patterns) {
    regex.lastIndex = 0;
    const matches = text.match(regex);
    if (!matches) continue;
    total += matches.length * weight;
  }
  return clamp01(total);
};

export interface AnalyzeSignalsOptions {
  now?: Date;
}

export const analyzeBiasSignals = (
  text: string,
  options: AnalyzeSignalsOptions = {},
): Partial<Record<HeuristicSignalName, BiasSignal>> => {
  if (typeof text !== 'string' || text.trim().length === 0) {
    return {};
  }

  const normalized = normalizeText(text);
  const now = options.now ?? new Date();
  const nowIso = now.toISOString();

  const results: Partial<Record<HeuristicSignalName, BiasSignal>> = {};

  for (const signal of HEURISTIC_SIGNAL_NAMES) {
    const patterns = PATTERNS[signal];
    if (!patterns || patterns.length === 0) continue;
    const score = accumulateScore(normalized, patterns);
    if (score <= 0) continue;
    results[signal] = {
      score,
      source: 'pattern',
      last_seen_at: nowIso,
      ttl_s: HEURISTICS_SIGNAL_TTL_DEFAULT_S,
    };
  }

  return results;
};

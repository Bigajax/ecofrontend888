import type {
  BiasSignalState,
  DerivedEcoDecision,
  EcoDecision,
  HeuristicSignalName,
  HeuristicsConfig,
  HeuristicsRolloutMode,
} from './types';
import {
  HEURISTIC_SIGNAL_NAMES,
  HeuristicsState,
  HeuristicsLogEntry,
} from './types';
import {
  HEURISTICS_COOLDOWN_TURNS_DEFAULT,
  HEURISTICS_HALF_LIFE_DEFAULT_S,
  HEURISTICS_MIN_SCORE_DEFAULT,
  HEURISTICS_ROLLOUT_DEFAULT,
} from './heuristics';

const clamp01 = (value: number | null | undefined): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
};

const toPositive = (value: unknown): number | undefined => {
  if (typeof value !== 'number') return undefined;
  if (!Number.isFinite(value)) return undefined;
  if (value <= 0) return undefined;
  return value;
};

const sanitizeCooldowns = (
  cooldowns: HeuristicsConfig['cooldowns'],
): Record<string, number> => {
  const result: Record<string, number> = {};
  if (!cooldowns) return result;
  for (const [key, value] of Object.entries(cooldowns)) {
    if (typeof value !== 'number') continue;
    if (!Number.isFinite(value)) continue;
    if (value <= 0) continue;
    result[key] = Math.round(value);
  }
  return result;
};

const sanitizeHalfLifeOverrides = (
  overrides: HeuristicsConfig['signal_half_life_s'],
): Partial<Record<HeuristicSignalName, number>> => {
  const result: Partial<Record<HeuristicSignalName, number>> = {};
  if (!overrides) return result;
  for (const [key, value] of Object.entries(overrides)) {
    const name = key as HeuristicSignalName;
    if (!HEURISTIC_SIGNAL_NAMES.includes(name)) continue;
    const positive = toPositive(value);
    if (!positive) continue;
    result[name] = positive;
  }
  return result;
};

const normalizeRolloutMode = (mode: HeuristicsRolloutMode | null | undefined): HeuristicsRolloutMode => {
  if (mode === 'disabled' || mode === 'shadow' || mode === 'enabled' || mode === 'pilot') {
    return mode;
  }
  return HEURISTICS_ROLLOUT_DEFAULT;
};

const parseTimestamp = (value: unknown): number | null => {
  if (typeof value !== 'string') return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return timestamp;
};

const normalizeSignal = (
  signalName: HeuristicSignalName,
  raw: unknown,
  fallbackTimestampMs: number,
  fallbackIso: string,
): BiasSignalState => {
  let score = 0;
  let source: BiasSignalState['source'] = 'pattern';
  let lastSeenMs: number | null = fallbackTimestampMs;
  let ttl: number | null = null;

  if (typeof raw === 'number') {
    score = clamp01(raw);
  } else if (raw && typeof raw === 'object') {
    const candidateScore = (raw as { score?: unknown }).score;
    if (candidateScore !== undefined) {
      score = clamp01(candidateScore as number);
    }
    const candidateSource = (raw as { source?: unknown }).source;
    if (
      candidateSource === 'nlp' ||
      candidateSource === 'pattern' ||
      candidateSource === 'behavior'
    ) {
      source = candidateSource;
    }
    const candidateLastSeen = parseTimestamp((raw as { last_seen_at?: unknown }).last_seen_at);
    if (candidateLastSeen != null) {
      lastSeenMs = candidateLastSeen;
    }
    const candidateTtl = toPositive((raw as { ttl_s?: unknown }).ttl_s as number | undefined);
    if (candidateTtl) {
      ttl = candidateTtl;
    }
  }

  if (!Number.isFinite(lastSeenMs)) {
    lastSeenMs = null;
  }

  return {
    score,
    source,
    last_seen_at: lastSeenMs != null ? new Date(lastSeenMs).toISOString() : fallbackIso,
    last_seen_ms: lastSeenMs,
    ttl_s: ttl ?? null,
  };
};

const buildBiasSignals = (
  signals: EcoDecision['signals'],
  fallbackTimestampMs: number,
  fallbackIso: string,
): Record<HeuristicSignalName, BiasSignalState> => {
  const map: Record<HeuristicSignalName, BiasSignalState> = {} as Record<HeuristicSignalName, BiasSignalState>;
  for (const signal of HEURISTIC_SIGNAL_NAMES) {
    const raw = signals?.[signal];
    map[signal] = normalizeSignal(signal, raw, fallbackTimestampMs, fallbackIso);
  }
  return map;
};

const buildHeuristicsState = (
  heuristics: HeuristicsConfig | null | undefined,
  nowMs: number,
): HeuristicsState => {
  const defaultMin = clamp01(heuristics?.default_min ?? HEURISTICS_MIN_SCORE_DEFAULT);
  const defaultHalfLife =
    toPositive(heuristics?.default_half_life_s ?? undefined) ?? HEURISTICS_HALF_LIFE_DEFAULT_S;
  const defaultCooldownTurns = Math.max(
    0,
    Math.round(heuristics?.default_cooldown_turns ?? HEURISTICS_COOLDOWN_TURNS_DEFAULT),
  );

  return {
    now: nowMs,
    defaultMin,
    defaultHalfLife,
    defaultCooldownTurns,
    signalHalfLives: sanitizeHalfLifeOverrides(heuristics?.signal_half_life_s ?? null),
    cooldowns: sanitizeCooldowns(heuristics?.cooldowns ?? null),
    mode: normalizeRolloutMode(heuristics?.mode ?? null),
  };
};

function formatVivaSteps(steps: string[]): string {
  if (!steps.length) return '';
  return steps.map((step, index) => `${index + 1}. ${step}`).join('\n');
}

function opennessMessage(openness: EcoDecision['openness']): string {
  switch (openness) {
    case 'fechado':
      return 'A pessoa demonstra pouca abertura. Ofereça acolhimento e convide gentilmente para explorar com segurança.';
    case 'moderado':
      return 'A pessoa está moderadamente aberta. Mantenha equilíbrio entre acolhimento e direcionamento.';
    case 'aberto':
    default:
      return 'A pessoa demonstra alta abertura. Você pode aprofundar com perguntas reflexivas e convites diretos.';
  }
}

export function deriveDecision(decision: EcoDecision): DerivedEcoDecision {
  const heuristicsConfig = decision.heuristics ?? null;
  const evaluatedAtMs =
    parseTimestamp(heuristicsConfig?.evaluated_at) ?? Date.now();
  const evaluatedAtIso = new Date(evaluatedAtMs).toISOString();

  const tags = Array.from(new Set([
    ...decision.tags,
    decision.hasTechBlock ? 'tech_block' : undefined,
    decision.saveMemory ? 'save_memory' : undefined,
    decision.domain ? `domain:${decision.domain}` : undefined,
  ].filter(Boolean) as string[]));

  const biasSignals = buildBiasSignals(decision.signals ?? null, evaluatedAtMs, evaluatedAtIso);
  const heuristicsState = buildHeuristicsState(heuristicsConfig, evaluatedAtMs);

  return {
    ...decision,
    tags,
    vivaStepsText: formatVivaSteps(decision.vivaSteps ?? []),
    vivaStepsCount: decision.vivaSteps?.length ?? 0,
    opennessAdvice: opennessMessage(decision.openness),
    biasSignals,
    heuristicsState,
    heuristicsLog: [] as HeuristicsLogEntry[],
  };
}

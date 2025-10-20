import {
  BiasSignalState,
  HeuristicGateMeta,
  HeuristicSignalName,
  HeuristicsLogEntry,
  HeuristicsRolloutMode,
  DerivedEcoDecision,
} from '../types';
import {
  HEURISTICS_COOLDOWN_TURNS_DEFAULT,
  HEURISTICS_HALF_LIFE_DEFAULT_S,
  HEURISTICS_MIN_SCORE_DEFAULT,
  LN2,
  HEURISTICS_ROLLOUT_DEFAULT,
} from './constants';

const clamp01 = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
};

const toPositive = (value: number | undefined): number | undefined => {
  if (typeof value !== 'number') return undefined;
  if (!Number.isFinite(value)) return undefined;
  if (value <= 0) return undefined;
  return value;
};

export interface HeuristicsContext {
  now: number;
  defaultMin: number;
  defaultHalfLife: number;
  defaultCooldownTurns: number;
  signalHalfLives: Partial<Record<HeuristicSignalName, number>>;
  cooldowns: Record<string, number>;
  signals: Record<HeuristicSignalName, BiasSignalState>;
  mode: HeuristicsRolloutMode;
  cache: Map<HeuristicSignalName, number>;
  log: Map<
    HeuristicSignalName,
    {
      signal: HeuristicSignalName;
      raw_score: number;
      source: BiasSignalState['source'];
      effective_score: number;
      opened: Set<string>;
      suppressed: Set<'cooldown' | 'low_score'>;
    }
  >;
}

export const createHeuristicsContext = (
  dec: DerivedEcoDecision,
): HeuristicsContext => {
  return {
    now: dec.heuristicsState.now,
    defaultMin: dec.heuristicsState.defaultMin,
    defaultHalfLife: dec.heuristicsState.defaultHalfLife,
    defaultCooldownTurns: dec.heuristicsState.defaultCooldownTurns,
    signalHalfLives: dec.heuristicsState.signalHalfLives,
    cooldowns: dec.heuristicsState.cooldowns,
    signals: dec.biasSignals,
    mode: dec.heuristicsState.mode ?? HEURISTICS_ROLLOUT_DEFAULT,
    cache: new Map(),
    log: new Map(),
  };
};

const ensureLogEntry = (
  context: HeuristicsContext,
  signal: HeuristicSignalName,
  effectiveScore: number,
): HeuristicsContext['log'] extends Map<any, infer TValue> ? TValue : never => {
  const current = context.log.get(signal);
  if (current) {
    current.effective_score = effectiveScore;
    return current as any;
  }
  const state = context.signals[signal];
  const entry = {
    signal,
    raw_score: state?.score ?? 0,
    source: state?.source ?? 'pattern',
    effective_score: effectiveScore,
    opened: new Set<string>(),
    suppressed: new Set<'cooldown' | 'low_score'>(),
  } as const;
  context.log.set(signal, entry as any);
  return entry as any;
};

const computeEffectiveScore = (
  context: HeuristicsContext,
  signalName: HeuristicSignalName,
  halfLifeSeconds: number,
): number => {
  if (context.cache.has(signalName)) {
    return context.cache.get(signalName)!;
  }

  const signal = context.signals[signalName];
  if (!signal) {
    context.cache.set(signalName, 0);
    return 0;
  }

  const baseScore = clamp01(signal.score ?? 0);
  const lastSeen = signal.last_seen_ms;
  const ttl = signal.ttl_s ?? null;

  if (baseScore <= 0) {
    context.cache.set(signalName, 0);
    return 0;
  }

  if (lastSeen == null) {
    context.cache.set(signalName, 0);
    return 0;
  }

  const ageSeconds = Math.max(0, (context.now - lastSeen) / 1000);

  if (ttl != null && ttl > 0 && ageSeconds > ttl) {
    context.cache.set(signalName, 0);
    return 0;
  }

  const halfLife = toPositive(halfLifeSeconds) ?? HEURISTICS_HALF_LIFE_DEFAULT_S;
  if (!halfLife || !Number.isFinite(halfLife) || halfLife <= 0) {
    context.cache.set(signalName, baseScore);
    return baseScore;
  }

  const decayFactor = Math.exp((-LN2 * ageSeconds) / halfLife);
  const effective = clamp01(baseScore * decayFactor);
  context.cache.set(signalName, effective);
  return effective;
};

export interface GateEvaluationResult {
  allowed: boolean;
  suppressedBy: Array<'cooldown' | 'low_score'>;
  score: number;
  threshold: number;
}

export const evaluateHeuristicGate = (
  context: HeuristicsContext,
  moduleId: string,
  gate: HeuristicGateMeta,
): GateEvaluationResult => {
  const signalName = gate.signal;
  const signal = context.signals[signalName];
  const halfLifeOverride =
    toPositive(gate.half_life_s) ??
    toPositive(context.signalHalfLives[signalName]) ??
    context.defaultHalfLife ??
    HEURISTICS_HALF_LIFE_DEFAULT_S;

  const effectiveScore = computeEffectiveScore(context, signalName, halfLifeOverride);

  let threshold = gate.min ?? context.defaultMin ?? HEURISTICS_MIN_SCORE_DEFAULT;
  if (!Number.isFinite(threshold) || threshold < 0) {
    threshold = HEURISTICS_MIN_SCORE_DEFAULT;
  }

  if (context.mode === 'shadow') {
    threshold = Number.POSITIVE_INFINITY;
  } else if (context.mode === 'disabled') {
    threshold = 0;
  }

  const suppressedBy = new Set<'cooldown' | 'low_score'>();

  if (effectiveScore < threshold) {
    suppressedBy.add('low_score');
  }

  const cooldownTurns = Math.max(
    0,
    Math.round(gate.cooldown_turns ?? context.defaultCooldownTurns ?? HEURISTICS_COOLDOWN_TURNS_DEFAULT),
  );
  const remainingCooldown = context.cooldowns[moduleId];
  if (cooldownTurns > 0 && typeof remainingCooldown === 'number' && remainingCooldown > 0) {
    suppressedBy.add('cooldown');
  }

  const allowed = suppressedBy.size === 0;
  const entry = ensureLogEntry(context, signalName, effectiveScore);
  suppressedBy.forEach((reason) => entry.suppressed.add(reason));
  if (allowed) {
    entry.opened.add(moduleId);
  }

  return {
    allowed,
    suppressedBy: Array.from(suppressedBy),
    score: effectiveScore,
    threshold,
  };
};

export const finalizeHeuristicsLog = (
  context: HeuristicsContext,
): HeuristicsLogEntry[] => {
  return Array.from(context.log.values()).map((entry) => ({
    signal: entry.signal,
    effective_score: entry.effective_score,
    raw_score: entry.raw_score,
    source: entry.source,
    opened_arms: Array.from(entry.opened),
    suppressed_by: Array.from(entry.suppressed),
  }));
};

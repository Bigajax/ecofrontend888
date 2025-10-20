import { describe, expect, it } from 'vitest';

import { analyzeBiasSignals } from '../heuristics';
import { deriveDecision } from '../decision';
import { createHeuristicsContext, evaluateHeuristicGate } from '../heuristics';
import type { EcoDecision, HeuristicGateMeta } from '../types';

const baseDecision: EcoDecision = {
  intensity: 5,
  openness: 'moderado',
  isVulnerable: false,
  vivaSteps: [],
  saveMemory: false,
  hasTechBlock: false,
  tags: [],
};

describe('heuristics signalizer', () => {
  it('maps text patterns to bias signals with metadata', () => {
    const now = new Date('2024-01-02T10:00:00.000Z');
    const result = analyzeBiasSignals(
      'Não consigo parar de pensar nisso. Talvez eu esteja exagerando, mas preciso resolver agora.',
      { now },
    );

    expect(Object.keys(result)).toContain('rumination');
    expect(Object.keys(result)).toContain('uncertainty');
    expect(Object.keys(result)).toContain('urgency');

    const rumination = result.rumination;
    expect(rumination?.source).toBe('pattern');
    expect(rumination?.last_seen_at).toBe(now.toISOString());
    expect(rumination?.score).toBeGreaterThan(0);
    expect(rumination?.ttl_s).toBeGreaterThan(0);
  });
});

describe('heuristics decay and cooldown', () => {
  const gate: HeuristicGateMeta = { signal: 'rumination', min: 0.4 };

  it('applies exponential decay to signals', () => {
    const evaluatedAt = new Date('2024-01-02T12:00:00.000Z');
    const lastSeen = new Date(evaluatedAt.getTime() - 10 * 60 * 1000);

    const decision: EcoDecision = {
      ...baseDecision,
      signals: {
        rumination: {
          score: 0.8,
          source: 'nlp',
          last_seen_at: lastSeen.toISOString(),
          ttl_s: 3600,
        },
      },
      heuristics: {
        evaluated_at: evaluatedAt.toISOString(),
      },
    };

    const dec = deriveDecision(decision);
    const context = createHeuristicsContext(dec);
    const result = evaluateHeuristicGate(context, 'eco_heuristica_rumination', gate);

    // Expect significant decay but still above threshold
    expect(result.score).toBeGreaterThan(0.5 * gate.min!);
    expect(result.score).toBeGreaterThan(0.4);
    expect(result.allowed).toBe(true);
  });

  it('suppresses modules when cooldown is active', () => {
    const evaluatedAt = new Date('2024-01-02T12:00:00.000Z');
    const lastSeen = new Date(evaluatedAt.getTime() - 2 * 60 * 1000);

    const decision: EcoDecision = {
      ...baseDecision,
      signals: {
        rumination: {
          score: 0.9,
          source: 'nlp',
          last_seen_at: lastSeen.toISOString(),
          ttl_s: 3600,
        },
      },
      heuristics: {
        evaluated_at: evaluatedAt.toISOString(),
        cooldowns: {
          eco_heuristica_rumination: 1,
        },
      },
    };

    const dec = deriveDecision(decision);
    const context = createHeuristicsContext(dec);
    const result = evaluateHeuristicGate(context, 'eco_heuristica_rumination', gate);

    expect(result.allowed).toBe(false);
    expect(result.suppressedBy).toContain('cooldown');
  });
});

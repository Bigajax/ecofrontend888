import { describe, expect, it } from 'vitest';
import { composePrompt } from '../selector';
import type { EcoDecision, PromptModule } from '../types';

const baseDecision: EcoDecision = {
  intensity: 5,
  openness: 'moderado',
  isVulnerable: true,
  vivaSteps: ['Validar', 'Investigar', 'Valorizar', 'Agir'],
  saveMemory: true,
  hasTechBlock: false,
  tags: [],
  domain: 'nv1',
};

describe('composePrompt selector', () => {
  it('seleciona módulos específicos para NV1, NV2 e NV3', () => {
    const nv1 = composePrompt({ ...baseDecision, tags: ['nv1'], domain: 'nv1' });
    expect(nv1.debug.selected_modules).toContain('NV1_CORE');
    expect(nv1.debug.selected_modules).not.toContain('NV2_CORE');
    expect(nv1.debug.selected_modules).not.toContain('NV3_CORE');

    const nv2 = composePrompt({ ...baseDecision, tags: ['nv2'], domain: 'nv2' });
    expect(nv2.debug.selected_modules).toContain('NV2_CORE');
    expect(nv2.debug.selected_modules).not.toContain('NV1_CORE');
    expect(nv2.debug.selected_modules).not.toContain('NV3_CORE');

    const nv3 = composePrompt({ ...baseDecision, tags: ['nv3'], domain: 'nv3' });
    expect(nv3.debug.selected_modules).toContain('NV3_CORE');
    expect(nv3.debug.selected_modules).not.toContain('NV1_CORE');
    expect(nv3.debug.selected_modules).not.toContain('NV2_CORE');
  });

  it('inclui bloco técnico de memória quando intensidade >=7 e hasTechBlock=true', () => {
    const result = composePrompt({
      ...baseDecision,
      intensity: 8,
      hasTechBlock: true,
      tags: ['nv1'],
    });

    expect(result.debug.selected_modules).toContain('BLOCO_TECNICO_MEMORIA');
    expect(result.modules.at(-1)?.id).toBe('BLOCO_TECNICO_MEMORIA');

    const withoutTechBlock = composePrompt({
      ...baseDecision,
      intensity: 9,
      hasTechBlock: false,
      tags: ['nv1'],
    });

    expect(withoutTechBlock.debug.selected_modules).not.toContain('BLOCO_TECNICO_MEMORIA');
    const candidate = withoutTechBlock.debug.module_candidates.find((c) => c.id === 'BLOCO_TECNICO_MEMORIA');
    expect(candidate?.reason).toContain('requires_tech_block');
  });

  it('ativa detecção de crise quando tag crisis presente', () => {
    const result = composePrompt({
      ...baseDecision,
      tags: ['crisis'],
    });

    expect(result.debug.selected_modules).toContain('DETECCAOCRISE');
  });

  it('interpolates DEC placeholders no texto final', () => {
    const result = composePrompt({
      ...baseDecision,
      intensity: 6,
      openness: 'aberto',
      vivaSteps: ['Validar', 'Investigar', 'Valorizar'],
    });

    expect(result.prompt).toContain('intensidade emocional percebida é 6');
    expect(result.prompt).not.toContain('{{DEC');
    expect(result.prompt).toContain('método VIVA enxuto em 3 etapas');
  });

  it('aplica gate de heurísticas com decay e cooldown', () => {
    const evaluatedAt = new Date('2024-01-02T12:00:00.000Z');
    const lastSeen = new Date(evaluatedAt.getTime() - 5 * 60 * 1000);

    const heurModule: PromptModule = {
      id: 'eco_heuristica_rumination',
      content: 'rumination guidance',
      meta: {
        id: 'eco_heuristica_rumination',
        order: 10,
        dedupe_key: 'eco_heuristica_rumination',
        inject_as: 'body',
        gate: {
          signal: 'rumination',
          min: 0.35,
        },
      },
    } as PromptModule;

    const decision: EcoDecision = {
      ...baseDecision,
      signals: {
        rumination: {
          score: 0.7,
          source: 'nlp',
          last_seen_at: lastSeen.toISOString(),
          ttl_s: 3600,
        },
      },
      heuristics: {
        evaluated_at: evaluatedAt.toISOString(),
      },
    };

    const result = composePrompt(decision, { modules: [heurModule] });
    expect(result.debug.selected_modules).toContain('eco_heuristica_rumination');
    expect(result.debug.heuristics_eval?.[0]?.opened_arms).toContain('eco_heuristica_rumination');

    const lowScoreResult = composePrompt(
      {
        ...decision,
        signals: {
          rumination: {
            score: 0.1,
            source: 'nlp',
            last_seen_at: evaluatedAt.toISOString(),
            ttl_s: 3600,
          },
        },
      },
      { modules: [heurModule] },
    );
    expect(lowScoreResult.debug.selected_modules).not.toContain('eco_heuristica_rumination');
    const candidate = lowScoreResult.debug.module_candidates.find(
      (c) => c.id === 'eco_heuristica_rumination',
    );
    expect(candidate?.reason).toContain('gate:low_score');
    expect(lowScoreResult.debug.heuristics_eval?.[0]?.suppressed_by).toContain('low_score');

    const cooldownResult = composePrompt(
      {
        ...decision,
        heuristics: {
          evaluated_at: evaluatedAt.toISOString(),
          cooldowns: {
            eco_heuristica_rumination: 1,
          },
        },
      },
      { modules: [heurModule] },
    );
    expect(cooldownResult.debug.selected_modules).not.toContain('eco_heuristica_rumination');
    const cooldownCandidate = cooldownResult.debug.module_candidates.find(
      (c) => c.id === 'eco_heuristica_rumination',
    );
    expect(cooldownCandidate?.reason).toContain('gate:cooldown');
    expect(cooldownResult.debug.heuristics_eval?.[0]?.suppressed_by).toContain('cooldown');
  });
});

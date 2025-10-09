import { describe, expect, it } from 'vitest';
import { composePrompt } from '../selector';
import type { EcoDecision } from '../types';

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
});

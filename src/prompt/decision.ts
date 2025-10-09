import type { DerivedEcoDecision, EcoDecision } from './types';

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
  const tags = Array.from(new Set([
    ...decision.tags,
    decision.hasTechBlock ? 'tech_block' : undefined,
    decision.saveMemory ? 'save_memory' : undefined,
    decision.domain ? `domain:${decision.domain}` : undefined,
  ].filter(Boolean) as string[]));

  return {
    ...decision,
    tags,
    vivaStepsText: formatVivaSteps(decision.vivaSteps ?? []),
    vivaStepsCount: decision.vivaSteps?.length ?? 0,
    opennessAdvice: opennessMessage(decision.openness),
  };
}

// src/constants/upgradeContextCopy.ts
// Copy contextual para o UpgradeModal baseado em source

export type UpgradeSource =
  | 'voice_premium'
  | 'rings_free_blocked'
  | 'dr_joe_premium_locked'
  | 'relatorio_emocional'
  | 'meditation_premium_locked'
  | 'generic';

export interface UpgradeContextContent {
  title: string;
  subtitle: string;
  bullets: string[];
  cta: string;
}

export const UPGRADE_CONTEXT_COPY: Record<UpgradeSource, UpgradeContextContent> = {
  voice_premium: {
    title: 'A Voz da Eco é Premium',
    subtitle: 'Converse com fluidez total, sem limites.',
    bullets: [
      'Modo Voz completo',
      'Respostas com áudio',
      'Memória avançada',
      'Todas as meditações premium',
      'Cancele em 1 clique',
    ],
    cta: 'DESBLOQUEAR VOZ + PREMIUM',
  },

  rings_free_blocked: {
    title: 'Desbloqueie os 5 Anéis completos',
    subtitle: 'O ritual diário faz parte do plano Premium.',
    bullets: [
      'Ritual diário completo',
      'Sequência de progresso de 30 dias',
      'Todas as meditações premium',
      'Diário Estoico completo',
      'Cancele em 1 clique',
    ],
    cta: 'DESBLOQUEAR RITUAL + PREMIUM',
  },

  dr_joe_premium_locked: {
    title: 'Continue o programa completo',
    subtitle: 'A primeira meditação é gratuita. O restante é Premium.',
    bullets: [
      'Coleção completa do programa',
      'Meditações avançadas desbloqueadas',
      'Sessões longas sem limites',
      'Relatório emocional completo',
      'Cancele em 1 clique',
    ],
    cta: 'DESBLOQUEAR PROGRAMA COMPLETO',
  },

  relatorio_emocional: {
    title: 'Seu Relatório Emocional é Premium',
    subtitle: 'Veja padrões, progresso e insights avançados.',
    bullets: [
      'Mapa emocional completo',
      'Linha do tempo emocional',
      'Análises com IA',
      'Histórico completo',
      'Cancele em 1 clique',
    ],
    cta: 'DESBLOQUEAR RELATÓRIO',
  },

  meditation_premium_locked: {
    title: 'Esta meditação é Premium',
    subtitle: 'Desbloqueie todas as sessões sem limites de duração.',
    bullets: [
      'Todas as meditações desbloqueadas',
      'Sessões longas incluídas',
      'Modo Voz incluso',
      '5 Anéis completos',
      'Cancele em 1 clique',
    ],
    cta: 'DESBLOQUEAR TUDO',
  },

  generic: {
    title: 'O seu desconto de 50% está pronto',
    subtitle: 'Você já iniciou sua jornada na Ecotopia. Garanta agora o acesso completo com condição especial.',
    bullets: [
      'Conversas ilimitadas com ECO',
      'Todas as meditações premium',
      'Five Rings diário completo',
      'Diário Estoico — arquivo completo',
      'Relatório emocional',
      'Cancelamento em 1 clique',
    ],
    cta: 'GARANTIR 50% AGORA',
  },
};

/**
 * Normaliza qualquer source string para um UpgradeSource válido.
 * Sources não mapeados caem em 'generic'.
 */
export function resolveUpgradeSource(source: string): UpgradeSource {
  if (source in UPGRADE_CONTEXT_COPY) {
    return source as UpgradeSource;
  }
  // Mapeamentos de aliases (sources antigos)
  if (source.startsWith('dr_joe') || source.startsWith('programas_blessing')) return 'dr_joe_premium_locked';
  if (source.startsWith('meditation') || source.startsWith('programas_')) return 'meditation_premium_locked';
  if (source.startsWith('rings')) return 'rings_free_blocked';
  if (source.startsWith('voice')) return 'voice_premium';
  if (source.startsWith('relatorio')) return 'relatorio_emocional';
  return 'generic';
}

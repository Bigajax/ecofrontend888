// src/constants/meditationTiers.ts
// Configuração de tiers para biblioteca de meditações

/**
 * Estrutura de Tiers:
 *
 * FREE TIER:
 * - Meditações básicas e curtas (5-8 min)
 * - Introdução à prática
 * - 6 meditações disponíveis
 *
 * ESSENTIALS TIER (R$ 14,90/mês):
 * - Todas as meditações FREE
 * - Meditações intermediárias (até 15 min)
 * - Total: ~7-8 meditações
 *
 * PREMIUM TIER (R$ 29,90/mês):
 * - Todas as meditações (ilimitado)
 * - Meditações avançadas e longas (15min+)
 * - Programas completos (22-25 min)
 */

export type MeditationTier = 'free' | 'essentials' | 'premium';

export interface TierConfig {
  name: string;
  description: string;
  maxDuration: number; // em minutos (Infinity para ilimitado)
  features: string[];
}

export const MEDITATION_TIERS: Record<MeditationTier, TierConfig> = {
  free: {
    name: 'Gratuito',
    description: 'Meditações básicas para começar sua jornada',
    maxDuration: 8, // Até 8 minutos
    features: [
      'Bênção dos Centros de Energia (7 min)',
      'Sintonizar Novos Potenciais (7 min)',
      'Recondicionar o Corpo (7 min)',
      'Meditação Caminhando (5 min)',
      'Espaço-Tempo (5 min)',
      'Introdução à Meditação (8 min)',
    ],
  },
  essentials: {
    name: 'Essentials',
    description: 'Meditações intermediárias até 15 minutos',
    maxDuration: 14, // Até 14 minutos (bloqueia 15+)
    features: [
      'Todas as meditações FREE',
      'Meditações até 15 minutos',
      'Progresso salvo',
    ],
  },
  premium: {
    name: 'Premium',
    description: 'Acesso completo a todas as meditações',
    maxDuration: Infinity, // Ilimitado
    features: [
      'Todas as meditações (ilimitado)',
      'Meditação do Sono (15 min)',
      'Caleidoscópio Mind Movie (22 min)',
      'Quem Pensa Enriquece (25 min)',
      'Programas completos',
      'Novas meditações em breve',
    ],
  },
};

/**
 * Define quais meditações são FREE, ESSENTIALS ou PREMIUM
 */
export const MEDITATION_TIER_MAP: Record<string, MeditationTier> = {
  // FREE TIER (5-8 min)
  blessing_1: 'free', // Bênção dos centros de energia (7 min)
  blessing_2: 'free', // Sintonizar novos potenciais (7 min)
  blessing_3: 'free', // Recondicionar o corpo (7 min)
  blessing_5: 'free', // Meditação caminhando (5 min)
  blessing_6: 'free', // Espaço-tempo (5 min)
  blessing_7: 'free', // Introdução à Meditação (8 min)
  blessing_10: 'free', // Acolhendo sua respiração (7 min)

  // PREMIUM TIER (15min+)
  blessing_8: 'premium', // Meditação do Sono (15 min)
  blessing_4: 'premium', // Caleidoscópio Mind Movie (22 min)
  blessing_9: 'premium', // Quem Pensa Enriquece (25 min)
};

/**
 * Helper: Verifica se user tem acesso a uma meditação específica
 */
export function canAccessMeditation(
  meditationId: string,
  userTier: 'free' | 'essentials' | 'premium' | 'vip'
): boolean {
  const meditationTier = MEDITATION_TIER_MAP[meditationId];

  // VIP tem acesso a tudo
  if (userTier === 'vip') return true;

  // Premium tem acesso a tudo
  if (userTier === 'premium') return true;

  // Essentials tem acesso a FREE + ESSENTIALS
  if (userTier === 'essentials') {
    return meditationTier === 'free' || meditationTier === 'essentials';
  }

  // Free tier só acessa FREE
  if (userTier === 'free') {
    return meditationTier === 'free';
  }

  return false;
}

/**
 * Helper: Retorna tier requerido para uma meditação
 */
export function getRequiredTier(meditationId: string): MeditationTier {
  return MEDITATION_TIER_MAP[meditationId] || 'free';
}

/**
 * Helper: Retorna mensagem de upgrade contextual
 */
export function getUpgradeMessage(
  meditationTier: MeditationTier,
  userTier: 'free' | 'essentials' | 'premium' | 'vip'
): string {
  if (userTier === 'free') {
    if (meditationTier === 'essentials') {
      return 'Desbloqueie com o plano Essentials (R$ 14,90/mês)';
    }
    if (meditationTier === 'premium') {
      return 'Desbloqueie com o plano Premium (R$ 29,90/mês)';
    }
  }

  if (userTier === 'essentials' && meditationTier === 'premium') {
    return 'Faça upgrade para Premium para acessar meditações longas (15min+)';
  }

  return 'Faça upgrade para acessar';
}

/**
 * Copy para contextos de conversão de meditações
 */
export const MEDITATION_CONVERSION_COPY = {
  meditation_premium_locked: {
    title: 'Meditações Avançadas',
    message:
      'Desbloqueie meditações longas e programas completos para aprofundar sua prática.',
    primaryCta: 'Ver Planos',
    secondaryCta: 'Voltar',
    subtitle: '7 dias grátis • Cancele quando quiser',
  },
  meditation_essentials_upgrade: {
    title: 'Meditações Intermediárias',
    message:
      'Comece com o Essentials e tenha acesso a meditações de até 15 minutos.',
    primaryCta: 'Começar por R$ 14,90',
    secondaryCta: 'Voltar',
    subtitle: '7 dias grátis',
  },
};

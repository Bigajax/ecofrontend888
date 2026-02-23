// src/constants/meditationTiers.ts
// Configuração de tiers para biblioteca de meditações

/**
 * Estrutura de Tiers:
 *
 * FREE TIER:
 * - Inicie Sua Jornada completo (5 meditações)
 * - 1ª meditação Dr. Joe Dispenza (teaser)
 * - Meditações standalone ≤7 min (Acolhendo respiração)
 * - 1 meditação de sono básica
 * - Eco AI: 10 mensagens/dia
 * - Diário Estoico: Jan + Fev
 *
 * PREMIUM TIER (R$ 29,90/mês):
 * - Todas as features sem limites
 * - Dr. Joe Dispenza completo
 * - Todos os programas e meditações
 * - 5 Anéis da Disciplina
 * - Voz da Eco
 * - Relatório Emocional
 * - Diário Estoico completo
 *
 * ESSENTIALS (futuro):
 * - Planejado como tier intermediário
 * - Atualmente tratado como Premium
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
    description: 'Primeiros passos na prática meditativa',
    maxDuration: 9, // Até 9 minutos (sono básica = 9 min)
    features: [
      'Inicie Sua Jornada completo (5 meditações)',
      '1ª meditação Dr. Joe Dispenza',
      'Acolhendo sua respiração (7 min)',
      '1 meditação de sono básica',
      'Eco AI: 10 mensagens/dia',
      'Diário Estoico: Janeiro e Fevereiro',
    ],
  },
  essentials: {
    name: 'Essentials',
    description: 'Meditações intermediárias até 15 minutos',
    maxDuration: 14,
    features: [
      'Todas as meditações FREE',
      'Meditações até 15 minutos',
      'Progresso salvo',
    ],
  },
  premium: {
    name: 'Premium',
    description: 'Transformação completa sem limites',
    maxDuration: Infinity,
    features: [
      'Dr. Joe Dispenza completo',
      'Todas as meditações sem limite de duração',
      '5 Anéis da Disciplina diário',
      'Voz da Eco',
      'Relatório Emocional',
      'Diário Estoico completo (12 meses)',
      'Eco AI ilimitado',
    ],
  },
};

/**
 * Define quais meditações são FREE, ESSENTIALS ou PREMIUM.
 *
 * Regras:
 * - Inicie Sua Jornada (intro_*): todas FREE
 * - Dr. Joe Dispenza: apenas 1ª (blessing_1) FREE como teaser; resto PREMIUM
 * - Standalone ≤7 min não-Dr.Joe: FREE
 * - Sono básica (sono_1): FREE; avançada (sono_2+): PREMIUM
 * - Recondicionar (blessing_3) e Espaço-Tempo (blessing_6): PREMIUM por nome
 */
export const MEDITATION_TIER_MAP: Record<string, MeditationTier> = {
  // === INICIE SUA JORNADA — completo grátis ===
  intro_1: 'free',
  intro_2: 'free',
  intro_3: 'free',
  intro_4: 'free',
  intro_5: 'free',

  // === DR. JOE DISPENZA — 1ª grátis (teaser), resto premium ===
  blessing_1: 'free',     // Bênção dos centros de energia (7 min) — teaser
  blessing_2: 'premium',  // Sintonizar novos potenciais (7 min)
  blessing_3: 'premium',  // Recondicionar o corpo e mente (7 min)
  blessing_5: 'premium',  // Meditação caminhando (5 min)
  blessing_6: 'premium',  // Espaço-Tempo (5 min)

  // === STANDALONE — não Dr. Joe, curtas ===
  blessing_7: 'free',   // Introdução à Meditação (8 min)
  blessing_10: 'free',  // Acolhendo sua respiração (7 min)
  blessing_11: 'free',  // Liberando o Estresse (7 min)

  // === SONO ===
  sono_1: 'free',     // Sono básica (9 min)
  sono_2: 'premium',  // Sono avançada (15 min)

  // === PREMIUM — longa duração e programas ===
  blessing_4: 'premium',  // Caleidoscópio Mind Movie (22 min)
  blessing_8: 'premium',  // Meditação do Sono premium (15 min)
  blessing_9: 'premium',  // Quem Pensa Enriquece (25 min)
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

// ─────────────────────────────────────────────────────────
// FEATURE GATE — acesso a features além de meditações
// ─────────────────────────────────────────────────────────

/**
 * Keys de features controladas por tier.
 * Usar com canAccess(feature, tier).
 */
export type FeatureKey =
  | 'voice'               // Voz da Eco — 0 para free
  | 'rings_daily'         // 5 Anéis da Disciplina — bloqueado para free
  | 'diario_full'         // Diário Estoico completo (Mar–Dez)
  | 'relatorio_emocional' // Relatório emocional
  | 'eco_ai_unlimited'    // Eco AI ilimitado
  | 'meditation_advanced';// Meditações avançadas (Dr. Joe completo, etc.)

/**
 * Função central de acesso a features.
 * Free = acesso negado. Essentials/Premium/VIP = acesso total.
 *
 * Uso:
 *   const tier = useSubscriptionTier();
 *   if (!canAccess('voice', tier)) { requestUpgrade('voice_premium'); return; }
 */
export function canAccess(
  feature: FeatureKey,
  tier: 'free' | 'essentials' | 'premium' | 'vip'
): boolean {
  // Premium e acima: acesso total
  if (tier === 'vip' || tier === 'premium' || tier === 'essentials') return true;

  // Free: tudo bloqueado
  return false;
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

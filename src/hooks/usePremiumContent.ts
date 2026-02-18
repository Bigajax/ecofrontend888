// src/hooks/usePremiumContent.ts
// Hook para validar acesso a conteúdo premium e gerenciar modal de upgrade

import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import mixpanel from '../lib/mixpanel';
import type { AccessValidation } from '../types/subscription';

/**
 * Lista VIP de emails com acesso premium gratuito
 * Essas contas têm acesso total sem precisar de assinatura
 */
const VIP_EMAILS = [
  'rafaelrazeira@hotmail.com',
  // Adicione mais emails VIP aqui conforme necessário
];

/**
 * Hook para gerenciar acesso a conteúdo premium
 *
 * Fornece:
 * - Validação de acesso baseada em subscription state
 * - Controle do modal de upgrade
 * - Analytics automático de bloqueios
 *
 * @example
 * ```typescript
 * const { checkAccess, requestUpgrade, showUpgradeModal, setShowUpgradeModal } = usePremiumContent();
 *
 * const handleMeditationClick = (meditation) => {
 *   if (meditation.isPremium) {
 *     const { hasAccess } = checkAccess(true);
 *     if (!hasAccess) {
 *       requestUpgrade(); // Abre modal
 *       return;
 *     }
 *   }
 *   // ... continua para player
 * };
 * ```
 */
export function usePremiumContent() {
  const auth = useAuth();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Extrair dados de subscription do AuthContext
  // NOTA: Esses campos serão adicionados ao AuthContext na próxima etapa
  const subscription = (auth as any).subscription;
  const isPremiumUser = (auth as any).isPremiumUser ?? false;
  const isTrialActive = (auth as any).isTrialActive ?? false;
  const trialDaysRemaining = (auth as any).trialDaysRemaining ?? 0;
  const user = auth.user;

  /**
   * Valida se o usuário tem acesso a conteúdo premium
   *
   * @param isPremium - Se o conteúdo é premium ou não
   * @returns Objeto com hasAccess e razão de bloqueio (se aplicável)
   */
  const checkAccess = useCallback(
    (isPremium: boolean): AccessValidation => {
      // Conteúdo free: sempre libera
      if (!isPremium) {
        return { hasAccess: true };
      }

      // ⭐ VIP CHECK: Verificar se o email está na lista VIP
      const userEmail = user?.email?.toLowerCase();
      if (userEmail && VIP_EMAILS.includes(userEmail)) {
        return {
          hasAccess: true,
          plan: 'vip',
          isVip: true,
        };
      }

      // Verificar se tem acesso premium
      const hasAccess = isPremiumUser || isTrialActive;

      if (!hasAccess) {
        // Determinar razão do bloqueio
        let reason: AccessValidation['reason'] = 'premium_required';

        if (subscription) {
          if (subscription.plan === 'trial' && subscription.status === 'expired') {
            reason = 'trial_expired';
          } else if (subscription.status === 'cancelled') {
            reason = 'subscription_cancelled';
          }
        }

        return {
          hasAccess: false,
          reason,
          plan: subscription?.plan || 'free',
          trialDaysRemaining: isTrialActive ? trialDaysRemaining : 0,
        };
      }

      return {
        hasAccess: true,
        plan: subscription?.plan || 'free',
        trialDaysRemaining: isTrialActive ? trialDaysRemaining : 0,
      };
    },
    [isPremiumUser, isTrialActive, subscription, trialDaysRemaining]
  );

  /**
   * Solicita upgrade (abre modal e registra analytics)
   *
   * @param source - Origem da solicitação (para analytics)
   */
  const requestUpgrade = useCallback(
    (source?: string) => {
      setShowUpgradeModal(true);

      // Registrar evento no Mixpanel
      mixpanel.track('Upgrade Modal Shown', {
        source: source || 'premium_gate',
        user_id: user?.id,
        current_plan: subscription?.plan || 'free',
        is_trial_active: isTrialActive,
        trial_days_remaining: trialDaysRemaining,
      });
    },
    [user, subscription, isTrialActive, trialDaysRemaining]
  );

  /**
   * Fecha o modal de upgrade
   */
  const closeUpgradeModal = useCallback(() => {
    setShowUpgradeModal(false);

    // Registrar fechamento no Mixpanel
    mixpanel.track('Upgrade Modal Closed', {
      user_id: user?.id,
    });
  }, [user]);

  return {
    // Estado
    showUpgradeModal,
    setShowUpgradeModal,

    // Dados de subscription
    subscription,
    isPremiumUser,
    isTrialActive,
    trialDaysRemaining,

    // Métodos
    checkAccess,
    requestUpgrade,
    closeUpgradeModal,
  };
}

/**
 * Tier type - nível de acesso do usuário
 */
export type SubscriptionTier = 'free' | 'essentials' | 'premium' | 'vip';

/**
 * Hook para obter o tier atual do usuário
 *
 * @returns Tier atual ('free' | 'essentials' | 'premium' | 'vip')
 */
export function useSubscriptionTier(): SubscriptionTier {
  const auth = useAuth();
  const subscription = (auth as any).subscription;
  const isPremiumUser = (auth as any).isPremiumUser ?? false;
  const isTrialActive = (auth as any).isTrialActive ?? false;
  const user = auth.user;

  // VIP CHECK
  const userEmail = user?.email?.toLowerCase();
  const isVip = userEmail ? VIP_EMAILS.includes(userEmail) : false;
  if (isVip) return 'vip';

  // Trial ativo = premium temporário
  if (isTrialActive) return 'premium';

  // Premium pago
  if (isPremiumUser) {
    const plan = subscription?.plan;
    if (plan === 'premium_monthly' || plan === 'premium_annual') {
      return 'premium';
    }
    if (plan === 'essentials_monthly') {
      return 'essentials';
    }
  }

  // Autenticado mas sem subscription = free
  return 'free';
}

/**
 * Features disponíveis por tier
 */
const TIER_FEATURES = {
  free: {
    chat_messages_daily: 30,
    meditation_advanced: false,
    memory_advanced: false,
    rings_daily: false,
    diario_full_archive: false,
    voice_messages_daily: 5,
  },
  essentials: {
    chat_messages_daily: 100,
    meditation_advanced: false, // Só meditações básicas até 15min
    memory_advanced: false, // Apenas Standard (90 dias)
    rings_daily: true, // Diário
    diario_full_archive: false, // Últimos 30 dias
    voice_messages_daily: 20,
  },
  premium: {
    chat_messages_daily: Infinity,
    meditation_advanced: true,
    memory_advanced: true,
    rings_daily: true,
    diario_full_archive: true,
    voice_messages_daily: Infinity,
  },
  vip: {
    chat_messages_daily: Infinity,
    meditation_advanced: true,
    memory_advanced: true,
    rings_daily: true,
    diario_full_archive: true,
    voice_messages_daily: Infinity,
  },
} as const;

/**
 * Hook para verificar acesso a uma feature específica
 *
 * @param feature - Nome da feature
 * @returns Valor do limite/acesso da feature no tier atual
 */
export function useFeatureAccess<K extends keyof typeof TIER_FEATURES['free']>(
  feature: K
): typeof TIER_FEATURES['free'][K] {
  const tier = useSubscriptionTier();
  return TIER_FEATURES[tier][feature];
}

/**
 * Hook simples para verificar se usuário é premium
 * (sem lógica de modal)
 *
 * @example
 * ```typescript
 * const isPremium = useIsPremium();
 * if (!isPremium) return <UpgradePrompt />;
 * ```
 */
export function useIsPremium(): boolean {
  const tier = useSubscriptionTier();
  return tier === 'premium' || tier === 'vip';
}

/**
 * Hook para obter dias restantes do trial
 *
 * @returns Número de dias restantes (0 se não estiver em trial)
 */
export function useTrialDaysRemaining(): number {
  const auth = useAuth();
  return (auth as any).trialDaysRemaining ?? 0;
}

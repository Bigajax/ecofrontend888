// src/hooks/useDynamicPricing.ts
// Hook para oferecer descontos personalizados baseado em comportamento do usuário

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useIsPremium } from './usePremiumContent';
import mixpanel from '../lib/mixpanel';

/**
 * Tipos de ofertas personalizadas
 */
export type OfferType = 'discount' | 'free_month' | 'extended_trial' | 'bundle';

/**
 * Razões para oferta personalizada (triggers)
 */
export type OfferReason =
  | 'heavy_usage'           // Bateu 3+ limites em 1 semana
  | 'committed_user'        // 10+ reflexões lidas
  | 'frequent_visitor'      // 5+ visitas como free user
  | 'abandoned_checkout'    // Abandonou checkout
  | 'trial_ending'          // Trial termina em < 2 dias
  | 'welcome_back';         // Retornou após inatividade

/**
 * Estrutura de uma oferta personalizada
 */
export interface PricingOffer {
  /** Tipo da oferta */
  type: OfferType;

  /** Valor do desconto (0-1 para %) ou meses grátis */
  amount: number;

  /** Razão/trigger da oferta */
  reason: OfferReason;

  /** Mensagem personalizada */
  message: string;

  /** Submessagem com detalhes */
  subtitle?: string;

  /** Expira em (timestamp) */
  expiresAt: number;

  /** Código de cupom (se aplicável) */
  couponCode?: string;

  /** Plano recomendado para a oferta */
  recommendedPlan?: 'essentials' | 'monthly' | 'annual';
}

/**
 * Configuração de triggers e ofertas
 */
const OFFER_CONFIG = {
  heavy_usage: {
    type: 'discount' as OfferType,
    amount: 0.2, // 20% off
    message: 'Você está usando intensamente. Upgrade por 20% de desconto!',
    subtitle: 'Oferta válida por 24 horas',
    expirationHours: 24,
    recommendedPlan: 'monthly' as const,
  },
  committed_user: {
    type: 'free_month' as OfferType,
    amount: 1, // 1 mês grátis
    message: 'Você está comprometido. Ganhe 1 mês grátis ao fazer upgrade!',
    subtitle: '30 dias extras no seu plano Premium',
    expirationHours: 48,
    recommendedPlan: 'monthly' as const,
  },
  frequent_visitor: {
    type: 'discount' as OfferType,
    amount: 0.3, // 30% off
    message: 'Welcome back! 30% de desconto no plano anual',
    subtitle: 'Economia de R$ 107,64 no primeiro ano',
    expirationHours: 72,
    recommendedPlan: 'annual' as const,
  },
  trial_ending: {
    type: 'extended_trial' as OfferType,
    amount: 7, // +7 dias
    message: 'Seu trial termina em breve. Ganhe +7 dias extras!',
    subtitle: 'Continue explorando antes de decidir',
    expirationHours: 24,
    recommendedPlan: 'monthly' as const,
  },
} as const;

/**
 * Helper: Calcula timestamp de expiração
 */
const getExpiresAt = (hours: number): number => {
  return Date.now() + (hours * 60 * 60 * 1000);
};

/**
 * Helper: Formata tempo restante
 */
export const formatTimeRemaining = (expiresAt: number): string => {
  const remaining = expiresAt - Date.now();
  if (remaining <= 0) return 'Expirado';

  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days} ${days === 1 ? 'dia' : 'dias'}`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
};

/**
 * Hook para gerenciar ofertas personalizadas dinâmicas
 *
 * Detecta comportamentos do usuário e oferece descontos/bônus personalizados:
 * - Heavy usage (3+ limites batidos)
 * - Committed user (10+ reflexões)
 * - Frequent visitor (5+ visitas)
 * - Trial ending (< 2 dias restantes)
 *
 * @returns Oferta ativa (se houver) e funções de gerenciamento
 *
 * @example
 * ```typescript
 * const { offer, dismissOffer, acceptOffer } = useDynamicPricing();
 *
 * if (offer) {
 *   return (
 *     <OfferBanner
 *       offer={offer}
 *       onDismiss={dismissOffer}
 *       onAccept={acceptOffer}
 *     />
 *   );
 * }
 * ```
 */
export function useDynamicPricing() {
  const { user } = useAuth();
  const isPremium = useIsPremium();
  const [offer, setOffer] = useState<PricingOffer | null>(null);

  // Não mostrar ofertas para premium users
  if (isPremium) {
    return {
      offer: null,
      dismissOffer: () => {},
      acceptOffer: () => {},
    };
  }

  /**
   * Verifica elegibilidade e cria ofertas
   */
  useEffect(() => {
    if (!user?.id) return;

    const checkEligibility = () => {
      const userId = user.id;
      const storageKey = `eco.dynamicOffer.v1.${userId}`;

      // Verificar se já tem oferta ativa não expirada
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          const savedOffer: PricingOffer = JSON.parse(stored);
          if (savedOffer.expiresAt > Date.now()) {
            setOffer(savedOffer);
            return; // Já tem oferta ativa
          }
        } catch {
          // Limpar se corrompido
          localStorage.removeItem(storageKey);
        }
      }

      // TRIGGER 1: Heavy Usage (3+ limites batidos em 1 semana)
      const limitsHit = getFreeTierLimitsHit(userId);
      if (limitsHit >= 3) {
        const config = OFFER_CONFIG.heavy_usage;
        const newOffer: PricingOffer = {
          type: config.type,
          amount: config.amount,
          reason: 'heavy_usage',
          message: config.message,
          subtitle: config.subtitle,
          expiresAt: getExpiresAt(config.expirationHours),
          recommendedPlan: config.recommendedPlan,
        };

        setOffer(newOffer);
        localStorage.setItem(storageKey, JSON.stringify(newOffer));

        mixpanel.track('Dynamic Offer Created', {
          offer_type: newOffer.type,
          offer_reason: newOffer.reason,
          offer_amount: newOffer.amount,
          user_id: userId,
        });

        return;
      }

      // TRIGGER 2: Committed User (10+ reflexões lidas)
      const reflectionsRead = getReflectionsRead(userId);
      if (reflectionsRead >= 10) {
        const config = OFFER_CONFIG.committed_user;
        const newOffer: PricingOffer = {
          type: config.type,
          amount: config.amount,
          reason: 'committed_user',
          message: config.message,
          subtitle: config.subtitle,
          expiresAt: getExpiresAt(config.expirationHours),
          recommendedPlan: config.recommendedPlan,
        };

        setOffer(newOffer);
        localStorage.setItem(storageKey, JSON.stringify(newOffer));

        mixpanel.track('Dynamic Offer Created', {
          offer_type: newOffer.type,
          offer_reason: newOffer.reason,
          offer_amount: newOffer.amount,
          user_id: userId,
        });

        return;
      }

      // TRIGGER 3: Frequent Visitor (5+ visitas)
      const visitCount = getVisitCount(userId);
      if (visitCount >= 5) {
        const config = OFFER_CONFIG.frequent_visitor;
        const newOffer: PricingOffer = {
          type: config.type,
          amount: config.amount,
          reason: 'frequent_visitor',
          message: config.message,
          subtitle: config.subtitle,
          expiresAt: getExpiresAt(config.expirationHours),
          recommendedPlan: config.recommendedPlan,
        };

        setOffer(newOffer);
        localStorage.setItem(storageKey, JSON.stringify(newOffer));

        mixpanel.track('Dynamic Offer Created', {
          offer_type: newOffer.type,
          offer_reason: newOffer.reason,
          offer_amount: newOffer.amount,
          user_id: userId,
        });

        return;
      }

      // TRIGGER 4: Trial Ending (implementar quando trial estiver ativo)
      // const { isTrialActive, trialDaysRemaining } = useAuth();
      // if (isTrialActive && trialDaysRemaining <= 2) { ... }
    };

    checkEligibility();
  }, [user]);

  /**
   * Dispensa a oferta (não mostrar novamente)
   */
  const dismissOffer = useCallback(() => {
    if (!user?.id || !offer) return;

    const storageKey = `eco.dynamicOffer.v1.${user.id}`;
    localStorage.removeItem(storageKey);
    setOffer(null);

    mixpanel.track('Dynamic Offer Dismissed', {
      offer_type: offer.type,
      offer_reason: offer.reason,
      user_id: user.id,
    });
  }, [user, offer]);

  /**
   * Aceita a oferta (redireciona para checkout com desconto)
   */
  const acceptOffer = useCallback(() => {
    if (!user?.id || !offer) return;

    mixpanel.track('Dynamic Offer Accepted', {
      offer_type: offer.type,
      offer_reason: offer.reason,
      offer_amount: offer.amount,
      recommended_plan: offer.recommendedPlan,
      user_id: user.id,
    });

    // Disparar evento para UpgradeModal ouvir
    window.dispatchEvent(new CustomEvent('eco:offer-accepted', {
      detail: {
        offer,
        plan: offer.recommendedPlan || 'monthly',
      },
    }));
  }, [user, offer]);

  return {
    /** Oferta ativa (null se não houver) */
    offer,

    /** Dispensa a oferta */
    dismissOffer,

    /** Aceita a oferta e abre checkout */
    acceptOffer,
  };
}

/**
 * Helper: Conta quantos limites foram batidos nos últimos 7 dias
 */
function getFreeTierLimitsHit(userId: string): number {
  const keys = [
    `eco.freeUser.dailyMessages.v1.${userId}`,
    `eco.voiceMessages.v1.${userId}`,
    `eco.rings.v1.${userId}`,
  ];

  let limitsHit = 0;
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

  for (const key of keys) {
    const stored = localStorage.getItem(key);
    if (!stored) continue;

    try {
      const data = JSON.parse(stored);
      const timestamp = new Date(data.date).getTime();

      // Se bateu limite nos últimos 7 dias
      if (timestamp >= sevenDaysAgo && data.count >= (data.limit || 30)) {
        limitsHit++;
      }
    } catch {
      // Ignorar se corrompido
    }
  }

  return limitsHit;
}

/**
 * Helper: Conta quantas reflexões foram lidas (últimos 30 dias)
 */
function getReflectionsRead(userId: string): number {
  const key = `eco.diario.reflectionsRead.${userId}`;
  const stored = localStorage.getItem(key);

  if (!stored) return 0;

  try {
    const data = JSON.parse(stored);
    return Array.isArray(data) ? data.length : 0;
  } catch {
    return 0;
  }
}

/**
 * Helper: Conta quantas vezes o usuário visitou o app (últimos 30 dias)
 */
function getVisitCount(userId: string): number {
  const key = `eco.visitCount.v1.${userId}`;
  const stored = localStorage.getItem(key);

  if (!stored) {
    // Primeira visita, inicializar contador
    localStorage.setItem(key, JSON.stringify({ count: 1, lastVisit: Date.now() }));
    return 1;
  }

  try {
    const data = JSON.parse(stored);
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    // Resetar se última visita foi há mais de 30 dias
    if (data.lastVisit < thirtyDaysAgo) {
      localStorage.setItem(key, JSON.stringify({ count: 1, lastVisit: Date.now() }));
      return 1;
    }

    // Incrementar se visita nova (> 1 hora desde última)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    if (data.lastVisit < oneHourAgo) {
      const newCount = data.count + 1;
      localStorage.setItem(key, JSON.stringify({ count: newCount, lastVisit: Date.now() }));
      return newCount;
    }

    return data.count;
  } catch {
    return 0;
  }
}

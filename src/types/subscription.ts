// src/types/subscription.ts
// Tipos para o sistema de assinatura ECOTOPIA

/**
 * Tipos de plano disponíveis
 */
export type SubscriptionPlan = 'free' | 'trial' | 'premium_monthly' | 'premium_annual';

/**
 * Status da assinatura
 */
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'pending';

/**
 * Provider de pagamento
 */
export type PaymentProvider = 'mercadopago' | 'stripe';

/**
 * Tipo de plano (mensal ou anual)
 */
export type PlanType = 'monthly' | 'annual';

/**
 * Estado completo da assinatura do usuário
 */
export interface SubscriptionState {
  /** Plano atual do usuário */
  plan: SubscriptionPlan;

  /** Status da assinatura */
  status: SubscriptionStatus;

  /** Data de início do trial (se aplicável) */
  trialStartDate: string | null;

  /** Data de término do trial (se aplicável) */
  trialEndDate: string | null;

  /** ID da assinatura no provider (preapproval_id para recorrência) */
  subscriptionId: string | null;

  /** Provider de pagamento utilizado */
  provider: PaymentProvider;

  /** ID do preapproval (recorrência mensal) no Mercado Pago */
  providerPreapprovalId: string | null;

  /** ID do pagamento pontual (anual) no Mercado Pago */
  providerPaymentId: string | null;

  /** Tipo do plano contratado */
  planType: PlanType | null;

  /** Data de fim do período atual (próxima renovação) */
  currentPeriodEnd: string | null;

  /** Data até quando o usuário tem acesso (FONTE DA VERDADE) */
  accessUntil: string | null;

  /** Data da próxima cobrança */
  nextBillingDate: string | null;
}

/**
 * Resposta da API de status de assinatura
 */
export interface SubscriptionStatusResponse {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  trialStartDate: string | null;
  trialEndDate: string | null;
  accessUntil: string | null;
  currentPeriodEnd: string | null;
  planType: PlanType | null;
  trialDaysRemaining: number;
  isPremium: boolean;
  isTrialActive: boolean;
}

/**
 * Request para criar assinatura
 */
export interface CreateSubscriptionRequest {
  plan: PlanType;
  userId: string;
}

/**
 * Resposta ao criar assinatura (retorna URL do checkout)
 */
export interface CreateSubscriptionResponse {
  /** URL do checkout do Mercado Pago */
  initPoint: string;

  /** ID da preference (anual) ou preapproval (mensal) */
  id: string;

  /** Tipo da subscription criada */
  type: 'preapproval' | 'preference';
}

/**
 * Dados de um plano de preço
 */
export interface PricingPlan {
  id: PlanType;
  name: string;
  price: number;
  originalPrice?: number;
  billingPeriod: 'month' | 'year';
  trialDays: number;
  isPopular?: boolean;
  features: string[];
}

/**
 * Evento de analytics de assinatura
 */
export interface SubscriptionEvent {
  eventType: 'upgrade_modal_viewed' | 'plan_selected' | 'checkout_initiated' |
             'payment_success' | 'trial_started' | 'trial_converted' | 'subscription_cancelled';
  plan?: PlanType;
  price?: number;
  source?: string;
  reason?: string;
  metadata?: Record<string, any>;
}

/**
 * Histórico de pagamento
 */
export interface PaymentHistory {
  id: string;
  date: string;
  amount: number;
  status: 'approved' | 'pending' | 'rejected';
  plan: PlanType;
  paymentMethod: string;
  receiptUrl?: string;
}

/**
 * Validação de acesso a conteúdo premium
 */
export interface AccessValidation {
  hasAccess: boolean;
  reason?: 'premium_required' | 'trial_expired' | 'subscription_cancelled';
  plan?: SubscriptionPlan;
  trialDaysRemaining?: number;
}

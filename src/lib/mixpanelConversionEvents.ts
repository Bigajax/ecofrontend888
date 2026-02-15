import mixpanel from './mixpanel';

interface PremiumScreenProperties {
  plan_id: 'monthly' | 'annual';
  plan_label: string;
  price: number;
  currency: 'BRL';
  screen: string;
  placement: string;
  is_guest: boolean;
  user_id?: string;
}

interface PremiumCardProperties {
  plan_id: 'monthly' | 'annual';
  plan_label: string;
  price: number;
  currency: 'BRL';
  screen: string;
  placement: string;
  is_guest: boolean;
  user_id?: string;
}

interface CheckoutStartedProperties {
  plan_id: 'monthly' | 'annual';
  checkout_provider: 'mercadopago';
  checkout_type: 'preapproval' | 'preference';
  preference_id: string;
  amount: number;
  currency: 'BRL';
  user_id?: string;
  is_guest: boolean;
}

interface SubscriptionPaidProperties {
  plan_id: 'monthly' | 'annual';
  mp_status: string;
  transaction_amount: number;
  provider: 'mercadopago';
  user_id?: string;
  source: 'frontend_callback';
}

interface PaymentFailedProperties {
  plan_id?: 'monthly' | 'annual';
  mp_status?: string;
  error_message?: string;
  provider: 'mercadopago';
  user_id?: string;
  source: 'frontend_callback';
}

interface FreeTierLimitHitProperties {
  limit_type: 'daily_messages' | 'weekly_rings' | 'reflection_archive' | 'meditation_preview' | 'voice_daily';
  current_count: number;
  limit_value: number;
  days_since_signup: number;
  user_id?: string;
}

interface PremiumFeatureAttemptedProperties {
  feature_id: string;
  feature_name: string;
  context: string;
  is_premium_user: boolean;
  user_id?: string;
}

interface TrialEventProperties {
  plan_id: string;
  user_id: string;
  trial_days?: number;
  days_remaining?: number;
}

interface SubscriptionCancelledProperties {
  reason?: string;
  user_id: string;
  plan: string;
  days_active: number;
}

/**
 * Camada 1: Intenção Topo
 * Tracking quando usuário visualiza a tela/modal Premium
 */
export function trackPremiumScreenViewed(props: Partial<PremiumScreenProperties>) {
  mixpanel.track('Premium Screen Viewed', {
    ...props,
    currency: 'BRL',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Camada 1: Intenção Topo
 * Tracking quando usuário clica em um plano específico
 */
export function trackPremiumCardClicked(props: PremiumCardProperties) {
  mixpanel.track('Premium Card Clicked', {
    ...props,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Camada 2: Intenção Média
 * Tracking quando usuário inicia o checkout (cria preferência MP e redireciona)
 */
export function trackCheckoutStarted(props: CheckoutStartedProperties) {
  mixpanel.track('Checkout Started', {
    ...props,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Camada 3: Conversão Real (Frontend)
 * Tracking quando pagamento é aprovado (callback page)
 */
export function trackSubscriptionPaid(props: SubscriptionPaidProperties) {
  mixpanel.track('Subscription Paid', {
    ...props,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Camada 3: Conversão Real (Frontend)
 * Tracking quando pagamento falha (callback page)
 */
export function trackPaymentFailed(props: PaymentFailedProperties) {
  mixpanel.track('Payment Failed', {
    ...props,
    timestamp: new Date().toISOString(),
  });
}

/**
 * FASE 1: Free Tier Limits
 * Tracking quando usuário atinge limite de free tier
 */
export function trackFreeTierLimitHit(props: FreeTierLimitHitProperties) {
  mixpanel.track('Free Tier Limit Hit', {
    ...props,
    timestamp: new Date().toISOString(),
  });
}

/**
 * FASE 2: Premium Features
 * Tracking quando usuário tenta acessar feature premium sem ser premium
 */
export function trackPremiumFeatureAttempted(props: PremiumFeatureAttemptedProperties) {
  mixpanel.track('Premium Feature Attempted', {
    ...props,
    timestamp: new Date().toISOString(),
  });
}

/**
 * FASE 2: Trial Management
 * Tracking quando trial inicia
 */
export function trackTrialStarted(props: TrialEventProperties) {
  mixpanel.track('Trial Started', {
    ...props,
    timestamp: new Date().toISOString(),
  });
}

/**
 * FASE 2: Trial Management
 * Tracking check-in diário durante trial
 */
export function trackTrialDay(props: TrialEventProperties) {
  mixpanel.track('Trial Day Check-in', {
    ...props,
    timestamp: new Date().toISOString(),
  });
}

/**
 * FASE 2: Trial Management
 * Tracking quando trial está perto de acabar
 */
export function trackTrialEndingSoon(props: TrialEventProperties) {
  mixpanel.track('Trial Ending Soon', {
    ...props,
    timestamp: new Date().toISOString(),
  });
}

/**
 * FASE 4: Churn Analysis
 * Tracking quando usuário cancela assinatura
 */
export function trackSubscriptionCancelled(props: SubscriptionCancelledProperties) {
  mixpanel.track('Subscription Cancelled', {
    ...props,
    timestamp: new Date().toISOString(),
  });
}

/**
 * FASE 3: Downgrade tracking
 * Tracking quando usuário faz downgrade de plano
 */
export function trackDowngradedToFree(props: { user_id: string; previous_plan: string; reason?: string }) {
  mixpanel.track('Downgraded to Free', {
    ...props,
    timestamp: new Date().toISOString(),
  });
}

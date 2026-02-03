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

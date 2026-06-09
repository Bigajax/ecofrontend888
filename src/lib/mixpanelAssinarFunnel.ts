/**
 * Eventos Mixpanel do funil de assinatura (/sono → /assinar → conversão).
 *
 * Cobre o miolo que antes estava cego: os steps do /assinar
 * (goals → validation → plan → signup → card) e o cadastro. As pontas
 * (Sono Page Viewed na landing, Subscription Paid no callback) já existem
 * em outros módulos.
 *
 * Convenções (alinhadas a mixpanelConversionEvents.ts):
 * - Nomes de evento em Title Case.
 * - timestamp ISO em todo evento.
 * - identify/people.set NÃO acontecem aqui (já no AuthContext).
 *
 * Atribuição: registerAssinarFunnel() grava `funnel`/`funnel_source` como
 * super properties, então todo evento subsequente — inclusive Subscription
 * Paid no callback — herda a origem do CTA da landing automaticamente.
 */
import mixpanel from './mixpanel';

export type AssinarStep = 'goals' | 'validation' | 'plan' | 'signup' | 'card';
export type PlanId = 'monthly' | 'annual';
export type SignupMethod = 'email' | 'google';

function track(eventName: string, props: Record<string, unknown> = {}): void {
  mixpanel.track(eventName, { ...props, timestamp: new Date().toISOString() });
}

/**
 * Registra a origem do funil como super properties. Chamar uma vez no mount
 * do AssinarPage. `from` vem do `?from=` do CTA da landing (ex.: "sono_hero").
 */
export function registerAssinarFunnel(from: string): void {
  mixpanel.register({ funnel: 'assinatura', funnel_source: from });
}

export function trackAssinarFunnelStarted(p: { entry_step: AssinarStep; plan: PlanId }): void {
  track('Assinar Funnel Started', p);
}

export function trackAssinarStepViewed(step: AssinarStep): void {
  track('Assinar Step Viewed', { step });
}

export function trackAssinarGoalsSubmitted(p: { answers_count: number; skipped: boolean }): void {
  track('Assinar Goals Submitted', p);
}

export function trackAssinarPlanConfirmed(p: { plan_id: PlanId; is_authenticated: boolean }): void {
  track('Assinar Plan Confirmed', p);
}

export function trackSignupViewed(): void {
  track('Signup Viewed');
}

export function trackSignupSubmitted(p: { method: SignupMethod; opted_newsletter?: boolean }): void {
  track('Signup Submitted', p);
}

export function trackSignupCompleted(p: { method: SignupMethod; needs_confirmation: boolean }): void {
  track('Signup Completed', p);
}

export function trackSignupFailed(p: { method: SignupMethod; error_message: string }): void {
  track('Signup Failed', p);
}

export function trackCheckoutCardViewed(p: { plan_id: PlanId; amount: number }): void {
  track('Checkout Card Viewed', p);
}

export function trackCheckoutCardSubmitted(p: { plan_id: PlanId; amount: number }): void {
  track('Checkout Card Submitted', p);
}

export function trackCheckoutCardFailed(p: { plan_id: PlanId; error_message: string }): void {
  track('Checkout Card Failed', p);
}

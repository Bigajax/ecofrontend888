/**
 * Eventos Mixpanel do funil de assinatura do Sono (/sono → /assinar → conversão).
 *
 * Todos os eventos usam o prefixo "Funil Sono · " para que apareçam agrupados
 * no Mixpanel e facilitem a montagem do funil. Cobre da landing até a
 * assinatura paga, incluindo o cadastro.
 *
 * Convenções:
 * - Nome do evento em português, prefixo "Funil Sono · ".
 * - Chaves das propriedades em inglês (plan_id, amount...) p/ consistência com
 *   o resto do código; valores legíveis quando fizer sentido (etapa em pt).
 * - timestamp ISO em todo evento.
 * - identify/people.set NÃO acontecem aqui (já no AuthContext).
 *
 * Atribuição: registerFunilSono() grava `funnel`/`funnel_source` como super
 * properties, então todo evento subsequente — inclusive a Assinatura paga no
 * callback — herda a origem do CTA da landing automaticamente.
 */
import mixpanel from './mixpanel';

export type AssinarStep = 'goals' | 'validation' | 'plan' | 'signup' | 'card';
export type PlanId = 'monthly' | 'annual';
export type SignupMethod = 'email' | 'google';

const PREFIX = 'Funil Sono · ';

/** Rótulo legível (pt) de cada etapa do /assinar, usado na prop `etapa`. */
const ETAPA_LABEL: Record<AssinarStep, string> = {
  goals: 'objetivos',
  validation: 'validação',
  plan: 'plano',
  signup: 'cadastro',
  card: 'cartão',
};

function track(evento: string, props: Record<string, unknown> = {}): void {
  mixpanel.track(PREFIX + evento, { ...props, timestamp: new Date().toISOString() });
}

/**
 * Registra a origem do funil como super properties. Chamar uma vez no mount
 * do AssinarPage. `from` vem do `?from=` do CTA da landing (ex.: "sono_hero").
 */
export function registerFunilSono(from: string): void {
  mixpanel.register({ funnel: 'assinatura', funnel_source: from });
}

// ── Landing /sono ──────────────────────────────────────────────────────────
export function trackLandingVista(): void {
  track('Landing vista');
}

export function trackCtaClicado(p: { plan: PlanId; placement: string }): void {
  track('CTA clicado', p);
}

// ── /assinar ───────────────────────────────────────────────────────────────
export function trackAssinaturaIniciada(p: { entry_step: AssinarStep; plan: PlanId }): void {
  track('Assinatura iniciada', p);
}

export function trackEtapaVista(step: AssinarStep): void {
  track('Etapa vista', { etapa: ETAPA_LABEL[step], step });
}

export function trackObjetivosEnviados(p: { answers_count: number; skipped: boolean }): void {
  track('Objetivos enviados', p);
}

export function trackPlanoVisto(p: { plan_id: PlanId; price: number; is_guest: boolean; user_id?: string }): void {
  track('Plano visto', p);
}

export function trackPlanoSelecionado(p: { plan_id: PlanId; price: number; is_guest: boolean; user_id?: string }): void {
  track('Plano selecionado', p);
}

export function trackPlanoConfirmado(p: { plan_id: PlanId; is_authenticated: boolean }): void {
  track('Plano confirmado', p);
}

// ── Cadastro ───────────────────────────────────────────────────────────────
export function trackCadastroVisto(): void {
  track('Cadastro visto');
}

export function trackCadastroEnviado(p: { method: SignupMethod; opted_newsletter?: boolean }): void {
  track('Cadastro enviado', p);
}

export function trackCadastroConcluido(p: { method: SignupMethod; needs_confirmation: boolean }): void {
  track('Cadastro concluído', p);
}

export function trackCadastroFalhou(p: { method: SignupMethod; error_message: string }): void {
  track('Cadastro falhou', p);
}

// ── Checkout (cartão) ──────────────────────────────────────────────────────
export function trackCartaoVisto(p: { plan_id: PlanId; amount: number }): void {
  track('Cartão visto', p);
}

export function trackCartaoEnviado(p: { plan_id: PlanId; amount: number }): void {
  track('Cartão enviado', p);
}

export function trackCartaoRecusado(p: { plan_id: PlanId; error_message: string }): void {
  track('Cartão recusado', p);
}

// ── Conversão ──────────────────────────────────────────────────────────────
export function trackAssinaturaPaga(p: { plan_id: PlanId; amount: number }): void {
  track('Assinatura paga', p);
}

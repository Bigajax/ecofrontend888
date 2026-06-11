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

/** Options de transporte do mixpanel-browser (track aceita um 3º argumento). */
interface TrackOptions {
  transport?: 'xhr' | 'sendBeacon';
  send_immediately?: boolean;
}

function track(evento: string, props: Record<string, unknown> = {}, options?: TrackOptions): void {
  mixpanel.track(PREFIX + evento, { ...props, timestamp: new Date().toISOString() }, options);
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
  // O clique é seguido de navegação imediata; o batching padrão (flush a cada
  // 5s) perdia parte dos eventos. sendBeacon + send_immediately garantem o
  // envio mesmo com a página saindo.
  track('CTA clicado', p, { transport: 'sendBeacon', send_immediately: true });
}

/**
 * Variante do hero exibida na /sono (roteada por utm_term dos anúncios). Mantém
 * a taxonomia do funil (regra das duas taxonomias: /sono usa "Funil Sono · ").
 * `variant` = 'default' | 'mente_nao_desliga' | ...
 */
export function trackHeadlineExibida(p: { variant: string }): void {
  track('Headline exibida', p);
}

/** Seção da landing /sono vista no scroll (ex.: `secao: "diferencial"`). */
export function trackSecaoVista(p: { secao: string }): void {
  track('Seção vista', p);
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
  // O caminho Google (fallback por redirect) navega pra fora da página logo em
  // seguida; sendBeacon + send_immediately evitam perder o evento no batch.
  track('Cadastro enviado', p, { transport: 'sendBeacon', send_immediately: true });
}

/**
 * Watchdog do cadastro: disparado quando "Cadastro enviado" não vira
 * "concluído" nem "falhou" dentro da janela. Com o popup do Google, também
 * dispara quando o usuário fecha o popup sem escolher conta — é hesitação,
 * não bug; ler junto com `method` e `elapsed_ms`.
 */
export function trackCadastroSemResposta(p: { method: SignupMethod; elapsed_ms: number }): void {
  track('Cadastro sem resposta', p);
}

export function trackCadastroConcluido(p: { method: SignupMethod; needs_confirmation: boolean }): void {
  track('Cadastro concluído', p);
}

export function trackCadastroFalhou(p: { method: SignupMethod; error_message: string }): void {
  track('Cadastro falhou', p);
}

/**
 * Saída do funil pelo logo "voltar" do header. `destino` é a landing de origem
 * (/sono ou /); `step` diz em que etapa o usuário desistiu — chave pra saber se
 * o pós-cartão→landing é abandono voluntário ou fuga de algo quebrado.
 */
export function trackFunilAbandonado(p: { step: AssinarStep; destino: string }): void {
  track('Funil abandonado', p, { transport: 'sendBeacon', send_immediately: true });
}

// ── Checkout (cartão) ──────────────────────────────────────────────────────
export function trackCartaoVisto(p: { plan_id: PlanId; amount: number }): void {
  track('Cartão visto', p);
}

/**
 * Brick do MercadoPago carregou (Secure Fields utilizáveis). `elapsed_ms` conta
 * desde que o step do cartão foi exibido. Leitura: "Cartão visto" sem "pronto"
 * = brick não carregou; "pronto" sem "enviado" = hesitação/abandono real.
 */
export function trackCartaoPronto(p: { plan_id: PlanId; elapsed_ms: number }): void {
  track('Cartão pronto', p);
}

/**
 * Erro do brick do MercadoPago (falha de carregamento/validação do formulário),
 * distinto de "Cartão recusado" (recusa no submit do pagamento).
 */
export function trackCartaoErro(p: { plan_id: PlanId; error_message: string }): void {
  track('Cartão erro', p);
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

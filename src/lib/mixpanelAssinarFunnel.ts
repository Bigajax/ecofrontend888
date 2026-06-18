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

// ── Estado em escopo de módulo (sobrevive ao remount por userId) ─────────────
// O RootProviders remonta a árvore quando o userId muda (pós-SIGNED_IN), o que
// desmonta o SignupStep/AssinarPage. Um watchdog/flag preso ao componente é
// zerado nesse remount — perdíamos justamente a falha silenciosa do cadastro.
// Em escopo de módulo o estado persiste através do remount (mesmo truque do
// `lastAssinaturaIniciadaAt` no AssinarPage).

/** Janela do watchdog: "enviado" sem "concluído"/"falhou" nesse tempo → "sem resposta". */
const CADASTRO_WATCHDOG_MS = 15_000;
let cadastroPending: { method: SignupMethod; startedAt: number; timer: ReturnType<typeof setTimeout> } | null = null;

let saidaIntencional = false;      // logo "voltar" ou redirect OAuth — não é abandono passivo
let abandonoOnHideEmitido = false; // dedupe entre visibilitychange/pagehide

function fireCadastroSemResposta(reason: 'timeout' | 'page_hidden', options?: TrackOptions): void {
  if (!cadastroPending) return;
  const { method, startedAt } = cadastroPending;
  // "sem resposta" é, por definição, o cadastro que estourou a janela sem
  // retorno → foi_timeout: true (alinha com a telemetria de "Cadastro falhou").
  track(
    'Cadastro sem resposta',
    { method, elapsed_ms: Date.now() - startedAt, reason, foi_timeout: true },
    options,
  );
  clearTimeout(cadastroPending.timer);
  cadastroPending = null;
}

/**
 * Registra a origem do funil como super properties. Chamar uma vez no mount
 * do AssinarPage. `from` vem do `?from=` do CTA da landing (ex.: "sono_hero").
 */
export function registerFunilSono(from: string): void {
  mixpanel.register({ funnel: 'assinatura', funnel_source: from });
}

/**
 * Super property da variante do hero /sono — assim todo evento subsequente do
 * funil (Plano visto, Cadastro enviado…) fica quebrável por variante. Nome
 * distinto de `headline_variant` (prop de evento '1'|'2' das landings genéricas
 * em trackLandingCta.ts) pra não colidir/contaminar as duas taxonomias.
 */
export function registerSonoHeroVariant(variant: string): void {
  mixpanel.register({ sono_hero_variant: variant });
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
  // Nova entrada no funil reseta as flags de módulo: sem isso, depois de uma
  // saída intencional (logo/OAuth) ou de um abandono já emitido, uma re-entrada
  // pela landing ficaria cega pro próximo abandono real.
  saidaIntencional = false;
  abandonoOnHideEmitido = false;
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
 * Arma o watchdog do cadastro (escopo de módulo) ao disparar "Cadastro enviado".
 * Se não virar "concluído"/"falhou" dentro da janela, emite "Cadastro sem
 * resposta" — inclusive quando o remount por userId já desmontou o SignupStep
 * (o timer vive aqui, não no componente). Limpo só por concluído/falhou.
 */
export function markCadastroPendente(method: SignupMethod): void {
  clearCadastroPendente(); // dedupe re-submit
  cadastroPending = {
    method,
    startedAt: Date.now(),
    timer: setTimeout(() => fireCadastroSemResposta('timeout'), CADASTRO_WATCHDOG_MS),
  };
}

/** Desarma o watchdog sem emitir — chamado em "Cadastro concluído"/"Cadastro falhou". */
export function clearCadastroPendente(): void {
  if (cadastroPending) {
    clearTimeout(cadastroPending.timer);
    cadastroPending = null;
  }
}

/**
 * Página sumindo com cadastro pendente = "sem resposta" por abandono durante o
 * hang (beacon, pois a aba pode estar fechando). `source` evita falso positivo
 * do popup do Google: o GIS deixa a página principal `hidden` enquanto o usuário
 * escolhe a conta. No method "google" só tratamos como abandono no `pagehide`
 * (saída real) ou após a janela do watchdog — senão o flush por visibilidade
 * dispararia "sem resposta" E limparia o pending, cegando o timer pro resto do
 * fluxo. E-mail sempre faz flush (não abre popup).
 */
export function flushCadastroPendenteOnHide(source: 'visibility' | 'pagehide'): void {
  if (!cadastroPending) return;
  if (
    source === 'visibility' &&
    cadastroPending.method === 'google' &&
    Date.now() - cadastroPending.startedAt < CADASTRO_WATCHDOG_MS
  ) {
    return;
  }
  fireCadastroSemResposta('page_hidden', { transport: 'sendBeacon', send_immediately: true });
}

export function trackCadastroConcluido(p: { method: SignupMethod; needs_confirmation: boolean }): void {
  track('Cadastro concluído', p);
}

export function trackCadastroFalhou(p: {
  method: SignupMethod;
  error_message: string;
  /** Status HTTP da resposta do Supabase (undefined em timeout/erro de rede). */
  status_http?: number;
  /** True quando a falha foi por estouro de tempo (> 8s). */
  foi_timeout?: boolean;
}): void {
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

/**
 * Marca saída deliberada do funil (clique no logo "voltar" ou redirect do
 * fallback OAuth), para o `pagehide` subsequente não emitir um "Funil abandonado"
 * falso. Resetada em `trackAssinaturaIniciada` (nova entrada).
 */
export function marcarSaidaIntencionalDoFunil(): void {
  saidaIntencional = true;
}

/**
 * `pagehide`: emite "Funil abandonado" se o usuário deixou o funil sem converter
 * e sem saída intencional. Deduplicado (visibilitychange + pagehide podem
 * disparar na mesma descarga).
 */
export function flushFunilAbandonadoOnHide(step: AssinarStep, converted: boolean): void {
  if (converted || saidaIntencional || abandonoOnHideEmitido) return;
  abandonoOnHideEmitido = true;
  trackFunilAbandonado({ step, destino: 'page_hidden' });
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

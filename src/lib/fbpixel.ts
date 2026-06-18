// src/lib/fbpixel.ts
//
// O Pixel é inicializado uma única vez no `index.html` (snippet base + init +
// PageView), que carrega antes do bundle JS para não perder o PageView inicial.
// Este módulo só expõe helpers para disparar eventos a partir do app.

type PixelParams = Record<string, unknown>;
type FbqFn = (
  method: string,
  event: string,
  params?: PixelParams,
  opts?: { eventID: string },
) => void;

/** Acessa o `fbq` global de forma tipada (sem `any`). */
function getFbqGlobal(): FbqFn | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { fbq?: FbqFn }).fbq ?? null;
}

/** Dispara via `fbq(method, ...)` com deduplicação opcional por eventID. */
function dispatch(
  method: 'track' | 'trackCustom',
  event: string,
  params?: PixelParams,
  eventId?: string,
) {
  const fbqGlobal = getFbqGlobal();
  if (!fbqGlobal) return;
  // 4º argumento { eventID } é o mecanismo de deduplicação do Pixel
  if (eventId) fbqGlobal(method, event, params ?? {}, { eventID: eventId });
  else fbqGlobal(method, event, params ?? {});
}

/**
 * Dispara um evento padrão no Meta Pixel (`track`).
 * @param eventId UUID opcional para deduplicação com a CAPI.
 *                Sempre passe quando houver uma chamada CAPI correspondente.
 */
export function fbq(event: string, params?: PixelParams, eventId?: string) {
  dispatch('track', event, params, eventId);
}

/**
 * Dispara um evento *custom* no Meta Pixel (`trackCustom`). Use para eventos que
 * não fazem parte do catálogo padrão da Meta (ex.: IniciouExperiencia,
 * ExperienciaCompleta) — eles viram eventos de otimização próprios no Ads.
 */
export function fbqCustom(event: string, params?: PixelParams, eventId?: string) {
  dispatch('trackCustom', event, params, eventId);
}

// ─── Helpers de cookie ────────────────────────────────────────────────────────

function getCookie(name: string): string {
  const match = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'),
  );
  return match ? decodeURIComponent(match[1]) : '';
}

/** Retorna o cookie _fbp (browser id do Pixel) ou '' se ausente. */
export function getFbp(): string {
  if (typeof document === 'undefined') return '';
  return getCookie('_fbp');
}

/**
 * Retorna _fbc do cookie ou constrói a partir de fbclid na URL.
 * Formato: fb.<subdomain_index>.<creation_time>.<fbclid>
 */
export function resolveFbc(): string {
  const fromCookie = getCookie('_fbc');
  if (fromCookie) return fromCookie;
  const fbclid = new URLSearchParams(window.location.search).get('fbclid');
  if (fbclid) {
    return `fb.1.${Math.floor(Date.now() / 1000)}.${fbclid}`;
  }
  return '';
}

// ─── CAPI + Pixel (deduplicado) ───────────────────────────────────────────────

export interface CAPITrackParams {
  value?: number;
  currency?: string;
  contentIds?: string[];
  contentType?: string;
  contentName?: string;
  contentCategory?: string;
  /**
   * Parâmetros extras enviados APENAS ao Pixel do browser (não ao CAPI).
   * Útil para dimensões de segmentação interna (ex.: plan, source) que não
   * fazem parte do schema de CustomData do servidor.
   */
  pixelExtra?: Record<string, unknown>;
}

/**
 * Dispara o evento no Pixel com um eventId único e envia o mesmo evento
 * ao endpoint CAPI (/api/meta/event → Vercel serverless function).
 *
 * A Meta usa o par (event_name + event_id) para eliminar duplicatas
 * entre sinais browser e servidor.
 */
export async function trackWithCAPI(
  eventName: string,
  params: CAPITrackParams = {},
  /**
   * `event_id` externo, quando a dedup precisa cruzar com um evento server-side
   * disparado em outro momento (ex.: StartTrial do webhook do Mercado Pago). Se
   * omitido, gera um UUID novo (caso comum, deduplicado com a CAPI da Vercel).
   */
  eventId: string = crypto.randomUUID(),
): Promise<void> {

  const pixelParams: Record<string, unknown> = { ...(params.pixelExtra ?? {}) };
  if (params.value !== undefined) pixelParams.value = params.value;
  if (params.currency) pixelParams.currency = params.currency;
  if (params.contentName) pixelParams.content_name = params.contentName;
  if (params.contentCategory) pixelParams.content_category = params.contentCategory;
  if (params.contentIds?.length) {
    pixelParams.content_ids = params.contentIds;
    pixelParams.content_type = params.contentType ?? 'product';
  }

  // Pixel browser (com eventID para deduplicação)
  fbq(eventName, pixelParams, eventId);

  // CAPI server-side — não-fatal se falhar
  try {
    await fetch('/api/meta/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName,
        eventId,
        eventSourceUrl: window.location.href,
        userAgent: navigator.userAgent,
        fbp: getCookie('_fbp'),
        fbc: resolveFbc(),
        value: params.value,
        currency: params.currency,
        contentIds: params.contentIds,
        contentType: params.contentType,
        contentName: params.contentName,
        contentCategory: params.contentCategory,
      }),
    });
  } catch {
    // CAPI é não-fatal — o Pixel já foi disparado
  }
}

// ─── Correlação do StartTrial (client ↔ webhook do Mercado Pago) ───────────────

const START_TRIAL_EVENT_ID_KEY = 'eco.sono.capi.start_trial_event_id';

/**
 * Gera (ou recupera) o `event_id` do StartTrial e o persiste no sessionStorage.
 * É enviado ao backend no `create-with-card` (para o webhook reusar o mesmo id)
 * e reutilizado no passo `unlocked` ao disparar o Pixel — assim o sinal do
 * browser e o sinal server-side do StartTrial são deduplicados pela Meta.
 */
export function ensureStartTrialEventId(): string {
  try {
    const existing = sessionStorage.getItem(START_TRIAL_EVENT_ID_KEY);
    if (existing) return existing;
  } catch {
    // sessionStorage indisponível — segue com id efêmero
  }
  const id = crypto.randomUUID();
  try {
    sessionStorage.setItem(START_TRIAL_EVENT_ID_KEY, id);
  } catch {
    // noop
  }
  return id;
}

/** Lê o `event_id` do StartTrial guardado (ou gera um novo se não houver). */
export function getStartTrialEventId(): string {
  try {
    return sessionStorage.getItem(START_TRIAL_EVENT_ID_KEY) || ensureStartTrialEventId();
  } catch {
    return ensureStartTrialEventId();
  }
}

// ─── Correlação do Purchase (client ↔ webhook do Mercado Pago) ─────────────────

const PURCHASE_EVENT_ID_KEY = 'eco.sono.capi.purchase_event_id';

/**
 * Gera (ou recupera) o `event_id` do Purchase e o persiste no sessionStorage.
 * É enviado ao backend no `create-with-card` (para o webhook reusar o mesmo id ao
 * disparar o Purchase no início do trial) e reutilizado ao disparar o Pixel —
 * assim o sinal do browser e o sinal server-side do Purchase são deduplicados
 * pela Meta. Espelha `ensureStartTrialEventId`.
 */
export function ensurePurchaseEventId(): string {
  try {
    const existing = sessionStorage.getItem(PURCHASE_EVENT_ID_KEY);
    if (existing) return existing;
  } catch {
    // sessionStorage indisponível — segue com id efêmero
  }
  const id = crypto.randomUUID();
  try {
    sessionStorage.setItem(PURCHASE_EVENT_ID_KEY, id);
  } catch {
    // noop
  }
  return id;
}

/** Lê o `event_id` do Purchase guardado (ou gera um novo se não houver). */
export function getPurchaseEventId(): string {
  try {
    return sessionStorage.getItem(PURCHASE_EVENT_ID_KEY) || ensurePurchaseEventId();
  } catch {
    return ensurePurchaseEventId();
  }
}

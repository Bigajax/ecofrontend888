// src/lib/fbpixel.ts
//
// O Pixel é inicializado uma única vez no `index.html` (snippet base + init +
// PageView), que carrega antes do bundle JS para não perder o PageView inicial.
// Este módulo só expõe helpers para disparar eventos a partir do app.

/**
 * Dispara um evento no Meta Pixel.
 * @param eventId UUID opcional para deduplicação com a CAPI.
 *                Sempre passe quando houver uma chamada CAPI correspondente.
 */
export function fbq(
  event: string,
  params?: Record<string, any>,
  eventId?: string,
) {
  if (typeof window === 'undefined' || !(window as any).fbq) return;

  if (eventId) {
    // 4º argumento { eventID } é o mecanismo de deduplicação do Pixel
    (window as any).fbq('track', event, params ?? {}, { eventID: eventId });
  } else {
    (window as any).fbq('track', event, params ?? {});
  }
}

// ─── Helpers de cookie ────────────────────────────────────────────────────────

function getCookie(name: string): string {
  const match = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'),
  );
  return match ? decodeURIComponent(match[1]) : '';
}

/**
 * Retorna _fbc do cookie ou constrói a partir de fbclid na URL.
 * Formato: fb.<subdomain_index>.<creation_time>.<fbclid>
 */
function resolveFbc(): string {
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
): Promise<void> {
  const eventId = crypto.randomUUID();

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
  fbq(eventName, pixelParams as Record<string, any>, eventId);

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

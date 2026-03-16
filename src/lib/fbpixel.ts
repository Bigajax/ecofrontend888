// src/lib/fbpixel.ts
export const FB_PIXEL_ID = import.meta.env.VITE_FB_PIXEL_ID as string;

export function initFacebookPixel() {
  if (!FB_PIXEL_ID) {
    console.warn('VITE_FB_PIXEL_ID não definido');
    return;
  }
  if (typeof window === 'undefined') return;
  if ((window as any).fbq) return;

  (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = '2.0';
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

  (window as any).fbq('init', FB_PIXEL_ID);
  (window as any).fbq('track', 'PageView');
}

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

  const pixelParams: Record<string, unknown> = {};
  if (params.value !== undefined) pixelParams.value = params.value;
  if (params.currency) pixelParams.currency = params.currency;
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
        ...params,
      }),
    });
  } catch {
    // CAPI é não-fatal — o Pixel já foi disparado
  }
}

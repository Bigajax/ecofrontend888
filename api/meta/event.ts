import type { VercelRequest, VercelResponse } from '@vercel/node';
import bizSdk from 'facebook-nodejs-business-sdk';

const { ServerEvent, EventRequest, UserData, CustomData, FacebookAdsApi } = bizSdk;

const PIXEL_ID = process.env.META_PIXEL_ID ?? '';
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN ?? '';
const TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE ?? '';

interface CAPIBody {
  eventName: string;
  eventId: string;
  eventSourceUrl?: string;
  fbp?: string;
  fbc?: string;
  value?: number;
  currency?: string;
  contentIds?: string[];
  contentType?: string;
  userAgent?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!PIXEL_ID || !ACCESS_TOKEN) {
    console.error('[CAPI] META_PIXEL_ID ou META_ACCESS_TOKEN não configurados');
    return res.status(500).json({ error: 'CAPI not configured' });
  }

  const {
    eventName,
    eventId,
    eventSourceUrl,
    fbp,
    fbc,
    value,
    currency,
    contentIds,
    contentType,
    userAgent,
  } = req.body as CAPIBody;

  if (!eventName || !eventId) {
    return res.status(400).json({ error: 'eventName e eventId são obrigatórios' });
  }

  try {
    FacebookAdsApi.init(ACCESS_TOKEN);

    // IP extraído dos headers de proxy — nunca do body enviado pelo cliente
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      '';

    const resolvedUserAgent =
      userAgent || (req.headers['user-agent'] as string) || '';

    const userData = new UserData()
      .setClientIpAddress(ip)
      .setClientUserAgent(resolvedUserAgent);

    if (fbp) userData.setFbp(fbp);
    if (fbc) userData.setFbc(fbc);

    const serverEvent = new ServerEvent()
      .setEventName(eventName)
      .setEventTime(Math.floor(Date.now() / 1000))
      .setEventId(eventId)
      .setActionSource('website')
      .setUserData(userData);

    if (eventSourceUrl) {
      serverEvent.setEventSourceUrl(eventSourceUrl);
    }

    if (value !== undefined && currency) {
      const customData = new CustomData().setValue(value).setCurrency(currency);

      if (contentIds?.length) {
        customData.setContentIds(contentIds);
        customData.setContentType(contentType || 'product');
      }

      serverEvent.setCustomData(customData);
    }

    const eventRequest = new EventRequest(ACCESS_TOKEN, PIXEL_ID).setEvents([serverEvent]);

    if (TEST_EVENT_CODE) {
      eventRequest.setTestEventCode(TEST_EVENT_CODE);
    }

    const response = await eventRequest.execute();

    return res.status(200).json({
      success: true,
      events_received: (response as any)?.events_received ?? 1,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[CAPI] Erro ao enviar evento:', message);
    return res.status(500).json({ error: 'Failed to send CAPI event' });
  }
}

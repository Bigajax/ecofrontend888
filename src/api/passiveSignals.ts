import { buildApiUrl } from "../constants/api";
import { buildIdentityHeaders } from "../lib/guestId";

export type PassiveSignalName =
  | "view"
  | "copy"
  | "tts_play"
  | "time_on_message"
  | "behavior_hint";

export type PassiveSignalRequest = {
  signal: PassiveSignalName;
  value?: number;
  sessionId?: string | null | undefined;
  interactionId?: string | null | undefined;
  messageId?: string | null | undefined;
  meta?: Record<string, unknown> | null | undefined;
};

const envFlag = import.meta.env.VITE_ENABLE_PASSIVE_SIGNALS;

export const ENABLE_PASSIVE_SIGNALS = envFlag === undefined ? true : envFlag !== "false";

const SEND_INTERVAL_MS = 2000;
const SERVER_BACKOFF_MS = 60_000;
const NON_CRITICAL_SAMPLE_RATE = 3;

const NON_CRITICAL_SIGNALS: ReadonlySet<PassiveSignalName> = new Set([
  "view",
  "copy",
  "time_on_message",
]);

type NormalizedPassiveSignal = {
  signal: PassiveSignalName;
  value?: number;
  session_id?: string;
  interaction_id?: string;
  message_id?: string;
  meta?: Record<string, unknown>;
};

const sanitize = <T extends Record<string, unknown | undefined | null>>(payload: T) => {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== null),
  ) as Record<string, unknown>;
};

let flushTimer: ReturnType<typeof setTimeout> | null = null;
let nextAllowedSendAt = 0;
const sampleCounters: Partial<Record<PassiveSignalName, number>> = {};

let outbox: NormalizedPassiveSignal[] = [];
let awaitingInteractionId: NormalizedPassiveSignal[] = [];
let defaultInteractionId: string | null = null;

const normalizeRequest = ({
  signal,
  value,
  sessionId,
  interactionId,
  messageId,
  meta,
}: PassiveSignalRequest): NormalizedPassiveSignal | null => {
  const normalizedSignal = signal.trim() as PassiveSignalName;
  if (!normalizedSignal) {
    return null;
  }

  const body = sanitize({
    signal: normalizedSignal,
    value: typeof value === "number" && Number.isFinite(value) ? value : undefined,
    session_id:
      typeof sessionId === "string" && sessionId.trim().length > 0
        ? sessionId.trim()
        : undefined,
    interaction_id:
      typeof interactionId === "string" && interactionId.trim().length > 0
        ? interactionId.trim()
        : undefined,
    message_id:
      typeof messageId === "string" && messageId.trim().length > 0
        ? messageId.trim()
        : undefined,
    meta:
      meta && typeof meta === "object" && Object.keys(meta).length > 0 ? meta : undefined,
  });

  return body as NormalizedPassiveSignal;
};

const shouldSample = (signal: PassiveSignalName): boolean => {
  if (!NON_CRITICAL_SIGNALS.has(signal)) {
    return true;
  }

  const previous = sampleCounters[signal] ?? 0;
  const next = previous + 1;
  sampleCounters[signal] = next >= NON_CRITICAL_SAMPLE_RATE ? 0 : next;
  return next === 1;
};

const scheduleFlush = () => {
  if (flushTimer !== null) {
    return;
  }

  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushPendingSignals();
  }, SEND_INTERVAL_MS);
};

const flushPendingSignals = async () => {
  if (outbox.length === 0) {
    return;
  }

  const now = Date.now();
  if (now < nextAllowedSendAt) {
    const droppedCount = outbox.length;
    if (import.meta.env.DEV) {
      console.debug(
        `[passive-signal] backoff active, dropping ${droppedCount} queued signal(s)`,
      );
    }
    outbox = [];
    return;
  }

  const eventsToSend = outbox;
  outbox = [];

  const endpoint = buildApiUrl("/api/signal");
  const grouped = new Map<string, NormalizedPassiveSignal[]>();

  for (const event of eventsToSend) {
    const interactionId =
      typeof event.interaction_id === "string" && event.interaction_id.trim().length > 0
        ? event.interaction_id.trim()
        : "";
    if (!interactionId) {
      if (import.meta.env.DEV) {
        console.debug("[passive-signal] dropping event without interaction_id", event);
      }
      continue;
    }
    const bucket = grouped.get(interactionId) ?? [];
    bucket.push({ ...event, interaction_id: interactionId });
    grouped.set(interactionId, bucket);
  }

  for (const [interactionId, group] of grouped.entries()) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...buildIdentityHeaders(),
      "X-Eco-Interaction-Id": interactionId,
    };
    const payload = group.length === 1 ? group[0] : { events: group };
    const bodyJson = JSON.stringify(payload);

    if (typeof fetch === "undefined") {
      continue;
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: bodyJson,
        keepalive: true,
      });

      if (!response.ok) {
        if (response.status === 500) {
          nextAllowedSendAt = Date.now() + SERVER_BACKOFF_MS;
        }
        if (import.meta.env.DEV) {
          console.debug(
            `[passive-signal] request failed status=${response.status} count=${group.length}`,
          );
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.debug(`[passive-signal] request error count=${group.length}`, error);
      }
    }
  }
};

const enqueueForDelivery = (event: NormalizedPassiveSignal) => {
  outbox.push(event);
  scheduleFlush();
};

const queueUntilInteractionId = (event: NormalizedPassiveSignal) => {
  awaitingInteractionId.push(event);
};

const resolveAwaitingSignals = () => {
  if (!defaultInteractionId || awaitingInteractionId.length === 0) {
    return;
  }

  const interactionId = defaultInteractionId;
  const resolved = awaitingInteractionId.map((event) => ({
    ...event,
    interaction_id: interactionId,
  }));
  awaitingInteractionId = [];
  resolved.forEach((event) => enqueueForDelivery(event));
};

export async function sendPassiveSignal(request: PassiveSignalRequest): Promise<void> {
  if (!ENABLE_PASSIVE_SIGNALS) return;

  const normalized = normalizeRequest(request);
  if (!normalized) {
    return;
  }

  if (!shouldSample(normalized.signal)) {
    return;
  }

  if (!("interaction_id" in normalized) || !normalized.interaction_id) {
    if (defaultInteractionId) {
      normalized.interaction_id = defaultInteractionId;
      enqueueForDelivery(normalized);
    } else {
      queueUntilInteractionId(normalized);
    }
    return;
  }

  enqueueForDelivery(normalized);
}

export function updatePassiveSignalInteractionId(
  interactionId: string | null | undefined,
): void {
  const normalized = typeof interactionId === "string" ? interactionId.trim() : "";
  defaultInteractionId = normalized.length > 0 ? normalized : null;

  if (!defaultInteractionId) {
    awaitingInteractionId = [];
    return;
  }

  resolveAwaitingSignals();
}

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

let pendingSignals: NormalizedPassiveSignal[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let nextAllowedSendAt = 0;
const sampleCounters: Partial<Record<PassiveSignalName, number>> = {};

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
  if (pendingSignals.length === 0) {
    return;
  }

  const now = Date.now();
  if (now < nextAllowedSendAt) {
    if (import.meta.env.DEV) {
      console.debug(
        `[passive-signal] backoff active, dropping ${pendingSignals.length} queued signal(s)`,
      );
    }
    pendingSignals = [];
    return;
  }

  const eventsToSend = pendingSignals;
  pendingSignals = [];

  const endpoint = buildApiUrl("/api/signal");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...buildIdentityHeaders(),
  };

  const payload = eventsToSend.length === 1 ? eventsToSend[0] : { events: eventsToSend };
  const bodyJson = JSON.stringify(payload);

  const sendWithFetch = async () => {
    if (typeof fetch === "undefined") {
      return;
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
            `[passive-signal] request failed status=${response.status} count=${eventsToSend.length}`,
          );
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.debug(`[passive-signal] request error count=${eventsToSend.length}`);
      }
    }
  };

  let sent = false;
  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    try {
      const blob = new Blob([bodyJson], { type: "application/json" });
      sent = navigator.sendBeacon(endpoint, blob);
    } catch (error) {
      sent = false;
    }
  }

  if (!sent) {
    await sendWithFetch();
  }
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

  pendingSignals.push(normalized);
  scheduleFlush();
}

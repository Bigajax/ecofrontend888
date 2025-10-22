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

const PASSIVE_SIGNAL_TIMEOUT_MS = 2500;

const sanitize = <T extends Record<string, unknown>>(payload: T) => {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  ) as T;
};

let hasLogged404 = false;

export async function sendPassiveSignal({
  signal,
  value,
  sessionId,
  interactionId,
  messageId,
  meta,
}: PassiveSignalRequest): Promise<void> {
  if (!ENABLE_PASSIVE_SIGNALS) return;
  if (typeof fetch === "undefined") return;

  const normalizedSignal = signal.trim();
  if (!normalizedSignal) return;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...buildIdentityHeaders(),
  };

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  if (controller) {
    timeoutId = setTimeout(() => {
      controller?.abort();
    }, PASSIVE_SIGNAL_TIMEOUT_MS);
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

  try {
    const res = await fetch(buildApiUrl("/api/signal"), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      redirect: "follow",
      signal: controller?.signal,
    });

    if (!res.ok) {
      if (res.status === 404) {
        if (import.meta.env.DEV && !hasLogged404) {
          hasLogged404 = true;
          console.debug("[passive-signal] endpoint /api/signal not found (404)");
        }
      } else if (import.meta.env.DEV) {
        console.debug("[passive-signal] request failed", {
          status: res.status,
          signal: normalizedSignal,
        });
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.debug("[passive-signal] error", error);
    }
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

import { resolveApiUrl } from "../constants/api";

export type Vote = "up" | "down";

export type Payload = {
  interaction_id: string;
  session_id?: string;
  user_id?: string | null;
  vote: Vote;
  reason?: string;
  source?: "chat_ui" | "voice_ui" | "autoprompt" | string;
  meta?: Record<string, unknown>;
};

const FEEDBACK_URL = resolveApiUrl("/api/feedback");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function sendFeedback(payload: Payload) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const guest = (window as any)?.readPersistedGuestId?.();
    if (guest) headers["X-Guest-Id"] = String(guest);
  } catch {
    /* ignore guest id resolution errors */
  }

  await sleep(500);

  for (const delay of [0, 200, 600]) {
    if (delay) await sleep(delay);
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 5000);
    try {
      const res = await fetch(FEEDBACK_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: ac.signal,
        credentials: "same-origin",
        cache: "no-store",
      });
      if ([204, 200, 201].includes(res.status)) return { ok: true as const };
      console.warn("[feedback] HTTP", res.status);
    } catch (e: any) {
      console.warn("[feedback] network/timeout", e?.message || e);
    } finally {
      clearTimeout(timer);
    }
  }
  return { ok: false as const };
}

export type FeedbackRequestPayload = {
  interactionId: string;
  vote: Vote;
  sessionId?: string | null;
  userId?: string | null;
  reasons?: string[];
  source?: string;
  meta?: Record<string, unknown>;
};

export async function enviarFeedback(payload: FeedbackRequestPayload) {
  const interactionId = payload.interactionId?.trim();
  if (!interactionId) {
    throw new Error("Feedback interactionId is required");
  }

  const reason = payload.reasons?.find((item) => typeof item === "string" && item.trim().length > 0);

  const result = await sendFeedback({
    interaction_id: interactionId,
    vote: payload.vote,
    session_id: payload.sessionId ?? undefined,
    user_id: payload.userId ?? undefined,
    reason: reason?.trim(),
    source: payload.source,
    meta: payload.meta,
  });

  if (!result.ok) {
    throw new Error("Feedback request failed");
  }

  return result;
}

export type PassiveSignal = "copy" | "share" | "read_complete" | "tts_60";

export type SignalPayload = {
  messageId: string;
  signal: PassiveSignal;
  value?: number;
};

export async function enviarSignal(payload: SignalPayload) {
  const url = resolveApiUrl("/api/signal");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "same-origin",
  });
  if (!res.ok) throw new Error(`Signal HTTP ${res.status}`);
  return res.json();
}

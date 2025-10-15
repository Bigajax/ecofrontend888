import { buildApiUrl } from "../constants/api";

export type FeedbackPayload = {
  messageId?: string;
  userId?: string | null;
  sessionId?: string | null;
  rating?: 1 | -1;
  vote?: "up" | "down";
  reasons?: string[];
  source?: "inline" | "thumb_prompt" | "options" | "prompt_auto";
  meta?: Record<string, any>;
};

const sanitizeBody = <T extends Record<string, unknown>>(input: T) => {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  ) as T;
};

export async function enviarFeedback(payload: FeedbackPayload) {
  const url = buildApiUrl("/api/feedback");
  const baseBody = { ...payload };
  if (!baseBody.vote && typeof baseBody.rating === "number") {
    baseBody.vote = baseBody.rating === 1 ? "up" : "down";
  }
  const body = sanitizeBody(baseBody);
  console.log("[FEEDBACK] POST", url, body);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Feedback HTTP ${res.status}`);
  return res.json();
}

export type PassiveSignal = "copy" | "share" | "read_complete" | "tts_60";

export type SignalPayload = {
  messageId: string;
  signal: PassiveSignal;
  value?: number;
};

export async function enviarSignal(payload: SignalPayload) {
  const url = buildApiUrl("/api/signal");
  console.log("[FEEDBACK] POST", url, payload);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Signal HTTP ${res.status}`);
  return res.json();
}

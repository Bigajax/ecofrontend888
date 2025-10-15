import { resolveApiUrl } from "../constants/api";

export type FeedbackPayload = {
  messageId: string;
  userId?: string | null;
  sessionId?: string | null;
  rating?: 1 | -1;
  vote?: "up" | "down";
  reasons?: string[];
  source?: "inline" | "thumb_prompt" | "options" | "prompt_auto";
  meta?: Record<string, any>;
};

export async function enviarFeedback(payload: FeedbackPayload) {
  const base = resolveApiUrl();
  const body = { ...payload };
  if (!body.vote && typeof body.rating === "number") {
    body.vote = body.rating === 1 ? "up" : "down";
  }
  const res = await fetch(`${base}/api/feedback`, {
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
  const base = resolveApiUrl();
  const res = await fetch(`${base}/api/signal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Signal HTTP ${res.status}`);
  return res.json();
}

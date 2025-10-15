import { buildApiUrl } from "../constants/api";

export type FeedbackMetaPayload = {
  module_combo?: string[];
  latency_ms?: number;
  message_id?: string;
  prompt_hash?: string;
  ui_source?: string;
  page?: string;
} & Record<string, unknown>;

export type FeedbackRequestPayload = {
  interactionId: string;
  vote: "up" | "down";
  sessionId?: string | null;
  userId?: string | null;
  reasons?: string[];
  source?: string;
  meta?: FeedbackMetaPayload;
};

type FeedbackResponse = unknown;

const sanitizeBody = <T extends Record<string, unknown>>(input: T) => {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  ) as T;
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 400;
const DEDUPE_TTL_MS = 15_000;

const inFlightByInteraction = new Map<string, Promise<FeedbackResponse>>();
const recentByInteraction = new Map<string, { signature: string; timestamp: number }>();

const shouldRetryStatus = (status: number) => {
  if (status >= 500) return true;
  return status === 408 || status === 409 || status === 425 || status === 429;
};

const computeSignature = (payload: FeedbackRequestPayload) => {
  const reasons = payload.reasons ? [...payload.reasons] : [];
  reasons.sort();
  return `${payload.vote}|${reasons.join(",")}`;
};

const pruneRecent = () => {
  const now = Date.now();
  for (const [key, entry] of recentByInteraction.entries()) {
    if (now - entry.timestamp > DEDUPE_TTL_MS) {
      recentByInteraction.delete(key);
    }
  }
};

export async function enviarFeedback(payload: FeedbackRequestPayload) {
  const interactionId = payload.interactionId?.trim();
  if (!interactionId) {
    throw new Error("Feedback interactionId is required");
  }

  pruneRecent();
  const signature = computeSignature(payload);
  const recent = recentByInteraction.get(interactionId);
  if (recent && recent.signature === signature) {
    return Promise.resolve({ deduped: true } as FeedbackResponse);
  }

  const existing = inFlightByInteraction.get(interactionId);
  if (existing) {
    return existing;
  }

  const requestBody = (() => {
    const meta = sanitizeBody({
      ...(payload.meta ?? {}),
      module_combo: Array.isArray(payload.meta?.module_combo)
        ? payload.meta?.module_combo?.filter((item) => typeof item === "string" && item.trim().length > 0)
        : undefined,
      latency_ms:
        typeof payload.meta?.latency_ms === "number"
          ? Math.max(0, Math.round(payload.meta.latency_ms))
          : undefined,
    });

    const base = sanitizeBody({
      interaction_id: interactionId,
      user_id: payload.userId ?? null,
      session_id: payload.sessionId ?? null,
      vote: payload.vote,
      reason:
        payload.reasons && payload.reasons.length > 0
          ? payload.reasons.filter((item) => typeof item === "string" && item.trim().length > 0)
          : undefined,
      source: payload.source ?? "chat",
      meta: Object.keys(meta).length > 0 ? meta : undefined,
    });

    return base;
  })();

  const url = buildApiUrl("/api/feedback");

  const send = async (): Promise<FeedbackResponse> => {
    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
          credentials: "include",
        });

        if (!res.ok) {
          if (shouldRetryStatus(res.status) && attempt < MAX_ATTEMPTS) {
            const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
            const jitter = Math.random() * (delay * 0.5);
            await sleep(delay + jitter);
            continue;
          }
          throw new Error(`Feedback HTTP ${res.status}`);
        }

        const contentType = res.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
          try {
            return (await res.json()) as FeedbackResponse;
          } catch {
            return {};
          }
        }
        try {
          const text = await res.text();
          return text ? { message: text } : {};
        } catch {
          return {};
        }
      } catch (error) {
        lastError = error;
        if (attempt >= MAX_ATTEMPTS) {
          throw error;
        }
        const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
        const jitter = Math.random() * (delay * 0.5);
        await sleep(delay + jitter);
      }
    }
    throw lastError instanceof Error ? lastError : new Error("Feedback request failed");
  };

  const requestPromise = send()
    .then((result) => {
      recentByInteraction.set(interactionId, {
        signature,
        timestamp: Date.now(),
      });
      return result;
    })
    .finally(() => {
      inFlightByInteraction.delete(interactionId);
    });

  inFlightByInteraction.set(interactionId, requestPromise);
  return requestPromise;
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

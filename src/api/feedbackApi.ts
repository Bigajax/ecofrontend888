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
  reason?: string | null;
  source?: string | null;
  meta?: FeedbackMetaPayload | Record<string, unknown>;
  messageId?: string | null;
};

type FeedbackResponse = unknown;

export class FeedbackApiError extends Error {
  status: number;
  details?: unknown;
  code?: string;

  constructor(status: number, message: string, details?: unknown) {
    super(message || `feedback_http_${status}`);
    this.name = "FeedbackApiError";
    this.status = status;
    this.details = details;
    if (details && typeof details === "object") {
      const record = details as Record<string, unknown>;
      const code = record.error_code ?? record.code ?? record.error;
      if (typeof code === "string" && code.trim().length > 0) {
        this.code = code;
      }
    }
  }
}

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
  const normalized = reasons.sort().join(",");
  const reasonKey =
    typeof payload.reason === "string" && payload.reason.trim().length > 0
      ? payload.reason.trim()
      : "";
  return `${payload.vote}|${normalized}|${reasonKey}`;
};

const pruneRecent = () => {
  const now = Date.now();
  for (const [key, entry] of recentByInteraction.entries()) {
    if (now - entry.timestamp > DEDUPE_TTL_MS) {
      recentByInteraction.delete(key);
    }
  }
};

const readGuestId = () => {
  if (typeof window === "undefined") return "";
  try {
    return (
      window.localStorage.getItem("guest_id") ??
      window.localStorage.getItem("eco_guest_id") ??
      ""
    );
  } catch {
    return "";
  }
};

const normalizeReason = (payload: FeedbackRequestPayload) => {
  if (typeof payload.reason === "string") {
    const trimmed = payload.reason.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (payload.reason === null) {
    return null;
  }
  if (Array.isArray(payload.reasons) && payload.reasons.length > 0) {
    const [first] = payload.reasons.filter(
      (item): item is string => typeof item === "string" && item.trim().length > 0,
    );
    return first ?? null;
  }
  return null;
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
      module_combo: Array.isArray((payload.meta as FeedbackMetaPayload | undefined)?.module_combo)
        ? (payload.meta as FeedbackMetaPayload | undefined)?.module_combo?.filter(
            (item) => typeof item === "string" && item.trim().length > 0,
          )
        : undefined,
      latency_ms:
        typeof (payload.meta as FeedbackMetaPayload | undefined)?.latency_ms === "number"
          ? Math.max(
              0,
              Math.round((payload.meta as FeedbackMetaPayload | undefined)?.latency_ms ?? 0),
            )
          : undefined,
    });

    const base = sanitizeBody({
      interaction_id: interactionId,
      user_id: payload.userId ?? null,
      session_id: payload.sessionId ?? null,
      message_id:
        typeof payload.messageId === "string" && payload.messageId.trim().length > 0
          ? payload.messageId.trim()
          : undefined,
      vote: payload.vote,
      reason: normalizeReason(payload),
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
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        const guestId = readGuestId();
        if (guestId) {
          headers["X-Guest-Id"] = guestId;
        }

        const res = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(requestBody),
          credentials: "include",
        });

        if (res.status === 204) {
          return {};
        }

        if (shouldRetryStatus(res.status) && attempt < MAX_ATTEMPTS) {
          const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
          const jitter = Math.random() * (delay * 0.5);
          await sleep(delay + jitter);
          continue;
        }

        const contentType = res.headers.get("content-type") ?? "";
        let parsed: unknown = undefined;
        if (contentType.includes("application/json")) {
          try {
            parsed = await res.json();
          } catch {
            parsed = undefined;
          }
        } else {
          try {
            const text = await res.text();
            if (text) {
              try {
                parsed = JSON.parse(text);
              } catch {
                parsed = { message: text };
              }
            }
          } catch {
            parsed = undefined;
          }
        }

        const errorMessage = (() => {
          if (parsed && typeof parsed === "object") {
            const record = parsed as Record<string, unknown>;
            const first = record.error ?? record.message ?? record.detail;
            if (typeof first === "string" && first.trim().length > 0) {
              return first;
            }
          }
          return "";
        })();

        throw new FeedbackApiError(res.status, errorMessage, parsed);
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


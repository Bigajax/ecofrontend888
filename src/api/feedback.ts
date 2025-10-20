import { getSessionId } from "../utils/identity";
import { getGuestId } from "../lib/guestId";

export type FeedbackVote = "up" | "down";

export interface SendFeedbackInput {
  interaction_id: string;
  vote: FeedbackVote;
  reason?: string | null;
  session_id?: string | null;
  user_id?: string | null;
  source?: string | null;
  meta?: Record<string, unknown>;
  message_id?: string | null;
  pillar?: string | null;
  arm?: string | null;
}

export type SendFeedbackResult = {
  ok: boolean;
  status: number;
  bodyText?: string;
  errorMessage?: string;
};

export class FeedbackRequestError extends Error {
  status: number;
  bodyText?: string;
  body?: unknown;
  cause?: unknown;

  constructor(
    message: string,
    options: {
      status: number;
      bodyText?: string;
      body?: unknown;
      cause?: unknown;
    },
  ) {
    super(message || `feedback_http_${options.status}`);
    this.name = "FeedbackRequestError";
    this.status = options.status;
    this.bodyText = options.bodyText;
    this.body = options.body;
    this.cause = options.cause;
  }
}

type PendingRequest = {
  args: NormalizedFeedbackInput;
  promise: Promise<SendFeedbackResult>;
  resolve: (value: SendFeedbackResult) => void;
  reject: (reason?: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
};

type NormalizedFeedbackInput = SendFeedbackInput & {
  interaction_id: string;
  vote: FeedbackVote;
  session_id?: string | null;
  user_id?: string | null;
  reason?: string | null;
};

type FeedbackTelemetry = {
  interaction_id: string;
  vote: FeedbackVote;
  t: number;
};

const DEBOUNCE_MS = 300;
const RETRY_DELAY_MS = 300;
const MAX_ATTEMPTS = 2;

const pendingByInteraction = new Map<string, PendingRequest>();

function normalizeArgs(input: SendFeedbackInput): NormalizedFeedbackInput {
  const interaction_id = input.interaction_id.trim();
  if (!interaction_id) {
    throw new Error("interaction_id is required");
  }

  const trimmedReason = typeof input.reason === "string" ? input.reason.trim() : input.reason;
  const reason = trimmedReason === "" ? null : trimmedReason ?? null;
  const source =
    typeof input.source === "string" && input.source.trim().length > 0
      ? input.source.trim()
      : "api";

  return {
    ...input,
    interaction_id,
    reason,
    vote: input.vote,
    session_id: input.session_id ?? null,
    user_id: input.user_id ?? null,
    source,
  };
}

function toBody(input: NormalizedFeedbackInput) {
  const base: Record<string, unknown> = {
    interaction_id: input.interaction_id,
    vote: input.vote,
    reason: input.reason ?? null,
  };

  if (input.session_id !== undefined) {
    base.session_id = input.session_id;
  }
  if (input.user_id !== undefined) {
    base.user_id = input.user_id;
  }
  if (input.source) {
    base.source = input.source;
  }
  if (input.meta && Object.keys(input.meta).length > 0) {
    base.meta = input.meta;
  }
  if (input.message_id) {
    base.message_id = input.message_id;
  }
  if (input.pillar) {
    base.pillar = input.pillar;
  }
  if (input.arm) {
    base.arm = input.arm;
  }

  return base;
}

function recordTelemetry(args: NormalizedFeedbackInput): FeedbackTelemetry | null {
  if (typeof window === "undefined") {
    return null;
  }
  const telemetry: FeedbackTelemetry = {
    interaction_id: args.interaction_id,
    vote: args.vote,
    t: Date.now(),
  };
  window.__ecoLastFeedback = telemetry;
  return telemetry;
}

function publishResult(
  telemetry: FeedbackTelemetry | null,
  result: SendFeedbackResult,
): SendFeedbackResult {
  if (typeof window !== "undefined") {
    window.__ecoLastFeedbackResult = result;
    window.dispatchEvent(
      new CustomEvent("eco-feedback-update", {
        detail: {
          feedback: telemetry ?? null,
          result,
        },
      }),
    );
  }
  return result;
}

function failureResultFromError(error: unknown): SendFeedbackResult {
  if (error instanceof FeedbackRequestError) {
    return {
      ok: false,
      status: error.status,
      bodyText: error.bodyText,
      errorMessage: error.message,
    };
  }
  if (error instanceof Error) {
    return {
      ok: false,
      status: 0,
      errorMessage: error.message,
    };
  }
  return {
    ok: false,
    status: 0,
    errorMessage: String(error),
  };
}

async function performRequest(args: NormalizedFeedbackInput): Promise<SendFeedbackResult> {
  const body = JSON.stringify(toBody(args));
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  headers["x-eco-guest-id"] = getGuestId();

  if (!args.user_id) {
    const guestId = args.session_id ?? (typeof window !== "undefined" ? getSessionId() : null);
    if (guestId) {
      headers["X-Guest-Id"] = guestId;
    }
  }

  try {
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers,
      credentials: "include",
      body,
    });

    if (response.status === 204) {
      return { ok: true, status: 204 };
    }

    const text = await response.text();
    let parsed: unknown;
    let message = "";

    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = undefined;
      }
    }

    if (parsed && typeof parsed === "object") {
      const record = parsed as Record<string, unknown>;
      const first = record.error ?? record.message ?? record.detail;
      if (typeof first === "string" && first.trim().length > 0) {
        message = first;
      }
    }

    if (!message && text.trim().length > 0) {
      message = text.trim();
    }

    throw new FeedbackRequestError(message, {
      status: response.status,
      bodyText: text,
      body: parsed,
    });
  } catch (error) {
    if (error instanceof FeedbackRequestError) {
      throw error;
    }
    if (error instanceof Error) {
      throw new FeedbackRequestError(error.message, {
        status: 0,
        cause: error,
      });
    }
    throw new FeedbackRequestError("feedback_request_failed", {
      status: 0,
    });
  }
}

async function executeWithRetry(args: NormalizedFeedbackInput) {
  let attempt = 0;
  let lastError: unknown = null;
  while (attempt < MAX_ATTEMPTS) {
    try {
      return await performRequest(args);
    } catch (error) {
      lastError = error;
      attempt += 1;
      const shouldRetry =
        attempt < MAX_ATTEMPTS &&
        (error instanceof FeedbackRequestError ? error.status === 0 : error instanceof TypeError);
      if (!shouldRetry) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("feedback_retry_failed");
}

function scheduleSend(args: NormalizedFeedbackInput): Promise<SendFeedbackResult> {
  const existing = pendingByInteraction.get(args.interaction_id);
  if (existing) {
    clearTimeout(existing.timer);
    existing.args = args;
    existing.timer = setTimeout(() => flush(args.interaction_id), DEBOUNCE_MS);
    return existing.promise;
  }

  let resolve!: (value: SendFeedbackResult) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<SendFeedbackResult>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  const entry: PendingRequest = {
    args,
    promise,
    resolve,
    reject,
    timer: setTimeout(() => flush(args.interaction_id), DEBOUNCE_MS),
  };

  pendingByInteraction.set(args.interaction_id, entry);
  return promise;
}

async function flush(interactionId: string) {
  const entry = pendingByInteraction.get(interactionId);
  if (!entry) return;
  pendingByInteraction.delete(interactionId);

  const telemetry = recordTelemetry(entry.args);

  try {
    const result = await executeWithRetry(entry.args);
    const published = publishResult(telemetry, result);
    entry.resolve(published);
  } catch (error) {
    publishResult(telemetry, failureResultFromError(error));
    entry.reject(error);
  }
}

export function sendFeedback(input: SendFeedbackInput): Promise<SendFeedbackResult> {
  const normalized = normalizeArgs(input);
  return scheduleSend(normalized);
}

declare global {
  interface Window {
    __ecoLastFeedback?: FeedbackTelemetry | null;
    __ecoLastFeedbackResult?: SendFeedbackResult | null;
  }

  interface WindowEventMap {
    "eco-feedback-update": CustomEvent<{
      feedback: FeedbackTelemetry | null;
      result: SendFeedbackResult;
    }>;
  }
}


import { useMemo, useRef, useState } from "react";

import { FeedbackRequestError, sendFeedback as requestFeedback } from "../api/feedback";
import { getSessionId } from "../utils/identity";
import { trackFeedbackEvent } from "../analytics/track";
import type { FeedbackTrackingPayload } from "../analytics/track";
import type { Message } from "../contexts/ChatContext";
import { DEFAULT_FEEDBACK_PILLAR } from "../constants/feedback";
import { useMessageFeedbackContext } from "../hooks/useMessageFeedbackContext";
import { extractModuleUsageCandidates, resolveLastActivatedModuleKey } from "../utils/moduleUsage";

type Mode = "ask" | "reasons" | "done";

type FeedbackPromptProps = {
  message: Message;
  userId?: string | null;
  onSubmitted?: () => void;
};

export const FEEDBACK_REASONS = [
  { key: "too_long", label: "Muito longo" },
  { key: "off_topic", label: "Fora do tema" },
  { key: "shallow", label: "Raso" },
  { key: "tone", label: "Tom inadequado" },
  { key: "other", label: "Outro" },
] as const;

const REASONS = FEEDBACK_REASONS;

type ReasonKey = (typeof REASONS)[number]["key"];

export function FeedbackPrompt({ message, userId, onSubmitted }: FeedbackPromptProps) {
  const [mode, setMode] = useState<Mode>("ask");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ReasonKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null | undefined>(undefined);
  const { interactionId, moduleCombo, promptHash, messageId: contextMessageId, latencyMs } =
    useMessageFeedbackContext(message);
  const messageId = contextMessageId ?? message.id;

  const moduleUsageCandidates = useMemo(
    () =>
      extractModuleUsageCandidates({
        metadata: message.metadata,
        donePayload: message.donePayload,
        fallbackModules: moduleCombo,
      }),
    [message.donePayload, message.metadata, moduleCombo],
  );

  const lastActivatedModuleKey = useMemo(
    () =>
      resolveLastActivatedModuleKey({
        moduleUsageCandidates,
        moduleCombo,
      }),
    [moduleCombo, moduleUsageCandidates],
  );

  const resolveSessionId = () => {
    if (sessionIdRef.current !== undefined) return sessionIdRef.current;
    sessionIdRef.current = getSessionId();
    return sessionIdRef.current;
  };

  const baseEventPayload = useMemo<FeedbackTrackingPayload>(() => {
    const payload: FeedbackTrackingPayload = {
      user_id: userId ?? undefined,
      interaction_id: interactionId,
    };
    if (messageId) {
      payload.message_id = messageId;
    }
    if (moduleCombo && moduleCombo.length > 0) {
      payload.module_combo = moduleCombo;
    }
    if (promptHash) {
      payload.prompt_hash = promptHash;
    }
    if (typeof latencyMs === "number") {
      payload.latency_ms = latencyMs;
    }
    return payload;
  }, [interactionId, latencyMs, messageId, moduleCombo, promptHash, userId]);

  const buildPayload = (vote: "up" | "down", reasons?: ReasonKey[]) => {
    const sessionId = resolveSessionId();
    const payload: FeedbackTrackingPayload = {
      ...baseEventPayload,
      session_id: sessionId ?? undefined,
      source: vote === "up" ? "thumb_prompt" : "options",
    };
    if (reasons && reasons.length > 0) {
      payload.reasons = reasons;
    }
    return payload;
  };

  async function send(vote: "up" | "down", reasons?: ReasonKey[]) {
    if (loading) return false;

    setLoading(true);
    const payload = buildPayload(vote, reasons);

    try {
      await requestFeedback({
        interaction_id: interactionId,
        user_id: userId ?? null,
        session_id: (payload.session_id ?? resolveSessionId() ?? null) as string | null,
        vote,
        reason: reasons && reasons.length > 0 ? reasons[0] : null,
        source: "chat",
        message_id: messageId ?? null,
        meta: {
          page: "ChatPage",
          ui_source: payload.source,
          ...(moduleCombo && moduleCombo.length > 0 ? { module_combo: moduleCombo } : {}),
          ...(typeof latencyMs === "number" ? { latency_ms: latencyMs } : {}),
          ...(messageId ? { message_id: messageId } : {}),
          ...(promptHash ? { prompt_hash: promptHash } : {}),
        },
        pillar: DEFAULT_FEEDBACK_PILLAR,
        arm: lastActivatedModuleKey ?? null,
      });
      trackFeedbackEvent("FE: Feedback Prompt Sent", payload);
      setMode("done");
      onSubmitted?.();
      return true;
    } catch (error) {
      if (error instanceof FeedbackRequestError) {
        console.error("feedback_prompt_error", {
          status: error.status,
          message: error.message,
        });
      }
      trackFeedbackEvent("FE: Feedback Prompt Error", {
        ...payload,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    } finally {
      setLoading(false);
    }
  }

  if (mode === "done") {
    return (
      <div className="mx-auto my-3 rounded-xl bg-white/70 p-3 text-sm text-gray-700 shadow">
        Obrigado pelo feedback 💛
      </div>
    );
  }

  if (mode === "reasons") {
    return (
      <div className="mx-auto my-3 rounded-xl bg-white/70 p-3 shadow">
        <p className="mb-2 text-sm text-gray-700">O que não ajudou?</p>
        <div className="flex flex-wrap gap-2">
          {REASONS.map((reason) => (
            <button
              key={reason.key}
              disabled={loading}
              onClick={() => {
                setSelected(reason.key);
                setError(null);
              }}
              className={`rounded-full border px-3 py-1 text-sm hover:bg-gray-50 ${
                selected === reason.key ? "bg-gray-100" : ""
              }`}
            >
              {reason.label}
            </button>
          ))}
        </div>
        {error && <div className="mt-2 text-xs text-red-500">{error}</div>}
        <div className="mt-3 flex items-center justify-between">
          <button
            disabled={loading}
            onClick={() => {
              setSelected(null);
              setError(null);
              setMode("ask");
            }}
            className="text-xs text-gray-500 hover:underline"
          >
            Cancelar
          </button>
          <button
            disabled={loading || !selected}
            onClick={async () => {
              if (!selected) return;
              const reasons = [selected];
              const payload = buildPayload("down", reasons);
              trackFeedbackEvent("FE: Feedback Prompt Click", payload);
              const success = await send("down", reasons);
              if (!success) {
                setError("Falha ao enviar feedback");
              }
            }}
            className="rounded-md bg-red-500 px-3 py-1 text-white disabled:opacity-50"
          >
            {loading ? "Enviando..." : "Enviar"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto my-3 flex items-center justify-between rounded-xl bg-white/70 p-3 shadow">
      <span className="text-sm text-gray-700">Essa resposta ajudou?</span>
      <div className="flex gap-2">
        <button
          disabled={loading}
          onClick={() => {
            const payload = buildPayload("up");
            trackFeedbackEvent("FE: Feedback Prompt Click", payload);
            void send("up");
          }}
          className="rounded-full border px-3 py-1 text-sm hover:bg-gray-50"
        >
          👍
        </button>
        <button
          disabled={loading}
          onClick={() => {
            const payload = buildPayload("down");
            trackFeedbackEvent("FE: Feedback Prompt Open Reasons", payload);
            setSelected(null);
            setError(null);
            setMode("reasons");
          }}
          className="rounded-full border px-3 py-1 text-sm hover:bg-gray-50"
        >
          👎
        </button>
      </div>
    </div>
  );
}

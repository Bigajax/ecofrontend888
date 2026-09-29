import { useMemo, useRef, useState } from "react";

import { FeedbackRequestError, sendFeedback as requestFeedback } from "../api/feedback";
import { getSessionId } from "../utils/identity";
import { trackFeedbackEvent } from "../analytics/track";
import type { FeedbackTrackingPayload } from "../analytics/track";
import type { Message } from "../contexts/ChatContext";
import { DEFAULT_FEEDBACK_PILLAR, FEEDBACK_REASONS, type FeedbackReasonKey } from "../constants/feedback";
import { useMessageFeedbackContext } from "../hooks/useMessageFeedbackContext";
import { extractModuleUsageCandidates, resolveLastActivatedModuleKey } from "../utils/moduleUsage";

type Mode = "ask" | "reasons" | "done";

type FeedbackPromptProps = {
  message: Message;
  userId?: string | null;
  onSubmitted?: () => void;
};

const REASONS = FEEDBACK_REASONS;
type ReasonKey = FeedbackReasonKey;

export function FeedbackPrompt({ message, userId, onSubmitted }: FeedbackPromptProps) {
  const [mode, setMode] = useState<Mode>("ask");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ReasonKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeVote, setActiveVote] = useState<"up" | "down" | null>(null);
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
        source: "api",
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
      setActiveVote(vote);
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

  // No reino (set/2026): uma linha discreta sob a resposta, com palavras no
  // lugar de emoji e os motivos como filtros sublinhados. Antes: caixa de vidro
  // branca com 👍 👎 e botão vermelho.
  if (mode === "done") {
    return (
      <p className="reino-avaliar reino-avaliar--feito" role="status">
        Obrigado. Isso ajuda a Eco a responder melhor.
      </p>
    );
  }

  if (mode === "reasons") {
    return (
      <div className="reino-avaliar">
        <p className="reino-avaliar__pergunta">O que não ajudou?</p>
        <div className="reino-filtros" role="group" aria-label="Motivo">
          {REASONS.map((reason) => (
            <button
              key={reason.key}
              type="button"
              disabled={loading}
              className="reino-filtro"
              aria-pressed={selected === reason.key}
              onClick={() => {
                setSelected(reason.key);
                setError(null);
              }}
            >
              {reason.label}
            </button>
          ))}
        </div>
        {error && (
          <p className="reino-avaliar__erro" role="alert">
            {error}
          </p>
        )}
        <div className="reino-avaliar__acoes">
          <button
            type="button"
            disabled={loading || !selected}
            className="reino-avaliar__enviar"
            onClick={async () => {
              if (!selected) return;
              const reasons = [selected];
              const payload = buildPayload("down", reasons);
              trackFeedbackEvent("FE: Feedback Prompt Click", payload);
              const success = await send("down", reasons);
              if (!success) {
                setError("Não foi possível enviar agora. Tente de novo.");
              }
            }}
          >
            {loading ? "Enviando..." : "Enviar"}
          </button>
          <button
            type="button"
            disabled={loading}
            className="reino-avaliar__voltar"
            onClick={() => {
              setSelected(null);
              setError(null);
              setMode("ask");
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="reino-avaliar reino-avaliar--linha">
      <span className="reino-avaliar__pergunta">Essa resposta ajudou?</span>
      <div className="reino-avaliar__votos">
        <button
          type="button"
          disabled={loading}
          className="reino-avaliar__voto"
          aria-pressed={activeVote === "up"}
          onClick={() => {
            // Toggle: se já está ativo, desativa
            if (activeVote === "up") {
              setActiveVote(null);
              return;
            }
            const payload = buildPayload("up");
            trackFeedbackEvent("FE: Feedback Prompt Click", payload);
            void send("up");
          }}
        >
          Ajudou
        </button>
        <button
          type="button"
          disabled={loading}
          className="reino-avaliar__voto"
          aria-pressed={activeVote === "down"}
          onClick={() => {
            // Toggle: se já está ativo, desativa
            if (activeVote === "down") {
              setActiveVote(null);
              return;
            }
            const payload = buildPayload("down");
            trackFeedbackEvent("FE: Feedback Prompt Open Reasons", payload);
            setSelected(null);
            setError(null);
            setMode("reasons");
          }}
        >
          Não ajudou
        </button>
      </div>
    </div>
  );
}

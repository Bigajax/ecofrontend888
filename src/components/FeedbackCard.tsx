import { useCallback, useMemo, useRef, useState } from "react";

import type { Message } from "../contexts/ChatContext";
import { FeedbackRequestError } from "../api/feedback";
import { useAuth } from "../contexts/AuthContext";
import { DEFAULT_FEEDBACK_PILLAR } from "../constants/feedback";
import { useMessageFeedbackContext } from "../hooks/useMessageFeedbackContext";
import { useSendFeedback } from "../hooks/useSendFeedback";
import { extractModuleUsageCandidates, resolveLastActivatedModuleKey } from "../utils/moduleUsage";
import { getSessionId } from "../utils/identity";
import { toast } from "../utils/toast";
import { FeedbackReasonPopover } from "./FeedbackReasonPopover";
import { isEcoMessage } from "../utils/chat/messages";

export type FeedbackCardStatus =
  | "idle"
  | "selecting"
  | "sending"
  | "success"
  | "error";

type FeedbackCardProps = {
  message: Message;
};

export function FeedbackCard({ message }: FeedbackCardProps) {
  const { userId } = useAuth();
  const { interactionId, moduleCombo, promptHash, messageId, latencyMs } =
    useMessageFeedbackContext(message);
  const [status, setStatus] = useState<FeedbackCardStatus>("idle");
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const dislikeButtonRef = useRef<HTMLButtonElement | null>(null);
  const sessionIdRef = useRef<string | null | undefined>(undefined);
  const { sendFeedback } = useSendFeedback();

  const isEco = isEcoMessage(message);
  const isStreaming = Boolean(message.streaming);
  const hasInteraction = Boolean(interactionId);

  const disableActions = !hasInteraction || status === "sending";
  const showCard =
    isEco &&
    !isStreaming &&
    hasInteraction &&
    status !== "success";

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

  const resolveSessionId = useCallback(() => {
    if (sessionIdRef.current !== undefined) {
      return sessionIdRef.current;
    }
    sessionIdRef.current = getSessionId();
    return sessionIdRef.current;
  }, []);

  const meta = useMemo(() => {
    const base: Record<string, unknown> = { ui: "chat_actions" };
    if (moduleCombo && moduleCombo.length > 0) {
      base.module_combo = moduleCombo;
    }
    if (typeof latencyMs === "number") {
      base.latency_ms = latencyMs;
    }
    if (messageId) {
      base.message_id = messageId;
    }
    if (promptHash) {
      base.prompt_hash = promptHash;
    }
    return base;
  }, [latencyMs, messageId, moduleCombo, promptHash]);

  const resetPopoverState = useCallback(() => {
    setIsPopoverOpen(false);
    setSelectedReason(null);
    setStatus((prev) => {
      if (prev === "selecting" || prev === "error") {
        return "idle";
      }
      return prev;
    });
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        dislikeButtonRef.current?.focus({ preventScroll: true });
      });
    }
  }, []);

  const handleSuccess = useCallback(
    (statusCode: number) => {
      setStatus("success");
      resetPopoverState();
      toast.success(`Feedback enviado (${statusCode})`);
    },
    [resetPopoverState],
  );

  const handleError = useCallback((error?: unknown) => {
    setStatus("error");
    const statusCode =
      error instanceof FeedbackRequestError
        ? error.status
        : error instanceof Error && "status" in error && typeof (error as any).status === "number"
        ? (error as any).status
        : 0;
    const statusLabel = statusCode ? ` (${statusCode})` : "";
    toast.error(`Falha no feedback${statusLabel}`);
  }, []);

  const handleLike = useCallback(async () => {
    if (!hasInteraction || disableActions) {
      return;
    }
    setStatus("sending");
    try {
      const result = await sendFeedback({
        interactionId,
        vote: "up",
        reason: null,
        source: "api",
        userId: userId ?? null,
        sessionId: resolveSessionId(),
        meta,
        pillar: DEFAULT_FEEDBACK_PILLAR,
        arm: lastActivatedModuleKey ?? null,
      });
      if (!result) {
        setStatus((prev) => (prev === "sending" ? "idle" : prev));
        return;
      }
      if (result.ok) {
        handleSuccess(result.status);
      } else {
        handleError({ status: result.status });
      }
    } catch (error) {
      console.error("feedback_like_error", error);
      handleError(error);
    }
  }, [disableActions, handleError, handleSuccess, hasInteraction, interactionId, meta, resolveSessionId, sendFeedback, userId]);

  const openPopover = useCallback(() => {
    if (!hasInteraction || status === "sending") {
      return;
    }
    setSelectedReason(null);
    setStatus("selecting");
    setIsPopoverOpen(true);
  }, [hasInteraction, status]);

  const handleConfirmDislike = useCallback(async () => {
    if (!hasInteraction || !selectedReason) {
      return;
    }
    setStatus("sending");
    try {
      const result = await sendFeedback({
        interactionId,
        vote: "down",
        reason: selectedReason,
        source: "api",
        userId: userId ?? null,
        sessionId: resolveSessionId(),
        meta,
        pillar: DEFAULT_FEEDBACK_PILLAR,
        arm: lastActivatedModuleKey ?? null,
      });
      if (!result) {
        setStatus((prev) => (prev === "sending" ? "idle" : prev));
        return;
      }
      if (result.ok) {
        handleSuccess(result.status);
      } else {
        handleError({ status: result.status });
      }
    } catch (error) {
      console.error("feedback_dislike_error", error);
      handleError(error);
    }
  }, [handleSuccess, hasInteraction, interactionId, meta, resolveSessionId, selectedReason, sendFeedback, userId]);

  if (!showCard) {
    if (status === "success") {
      return (
        <div className="mt-2 flex items-center gap-2 text-sm text-slate-500" data-interaction-id={interactionId}>
          <span role="status">Obrigado pelo feedback 💛</span>
        </div>
      );
    }
    return null;
  }

  return (
    <div
      className="mt-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-sm backdrop-blur"
      data-interaction-id={interactionId}
    >
      <span className="text-slate-600">Essa resposta ajudou?</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-full border border-slate-200 px-3 py-1 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={handleLike}
          disabled={disableActions}
          aria-busy={status === "sending"}
        >
          {status === "sending" ? "Enviando…" : "👍"}
        </button>
        <button
          ref={dislikeButtonRef}
          type="button"
          className="rounded-full border border-slate-200 px-3 py-1 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={openPopover}
          disabled={disableActions}
          aria-busy={status === "sending"}
        >
          👎
        </button>
      </div>
      <FeedbackReasonPopover
        open={isPopoverOpen}
        selectedReason={selectedReason}
        status={status}
        onSelect={(reason) => {
          setSelectedReason(reason);
          setStatus((prev) => (prev === "error" ? "selecting" : prev));
        }}
        onConfirm={handleConfirmDislike}
        onClose={resetPopoverState}
      />
    </div>
  );
}

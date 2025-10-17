import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ClipboardCopy,
  ThumbsDown,
  ThumbsUp,
  Volume2,
  Loader2,
} from "lucide-react";

import AudioPlayerOverlay from "./AudioPlayerOverlay";
import ChatMessage from "./ChatMessage";
import { FeedbackApiError } from "../api/feedbackApi";
import {
  ENABLE_PASSIVE_SIGNALS,
  PassiveSignalName,
  sendPassiveSignal,
} from "../api/passiveSignals";
import {
  ENABLE_MODULE_USAGE,
  sendModuleUsage,
} from "../api/moduleUsage";
import { gerarAudioDaMensagem } from "../api/voiceApi";
import { Message } from "../contexts/ChatContext";
import { trackFeedbackEvent } from "../analytics/track";
import type { FeedbackTrackingPayload } from "../analytics/track";
import { getSessionId, getUserIdFromStore } from "../utils/identity";
import { useMessageFeedbackContext } from "../hooks/useMessageFeedbackContext";
import { useSendFeedback } from "../hooks/useSendFeedback";
import { toast } from "../utils/toast";
import { useAuth } from "../contexts/AuthContext";
import { FeedbackReasonPopover } from "./FeedbackReasonPopover";
import { DEFAULT_FEEDBACK_PILLAR } from "../constants/feedback";
import { extractModuleUsageCandidates, resolveLastActivatedModuleKey } from "../utils/moduleUsage";

type Vote = "up" | "down";

type EcoMessageWithAudioProps = {
  message: Message;
};

const BTN_SIZE = "w-7 h-7 sm:w-8 sm:h-8";
const ICON_SIZE = "w-[14px] h-[14px] sm:w-4 sm:h-4";
const ICON_BASE = "text-gray-500/80 group-hover:text-gray-800 transition-colors";

const GhostBtn = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }
>(({ children, className = "", type = "button", ...rest }, ref) => (
  <button
    {...rest}
    ref={ref}
    className={[
      "group rounded-xl",
      BTN_SIZE,
      "flex items-center justify-center",
      "hover:bg-gray-100 active:bg-gray-200/80",
      "focus:outline-none focus:ring-2 focus:ring-gray-300/50",
      "transition-colors",
      className,
    ]
      .filter(Boolean)
      .join(" ")}
    type={type}
  >
    {children}
  </button>
));
GhostBtn.displayName = "GhostBtn";

const EcoMessageWithAudio: React.FC<EcoMessageWithAudioProps> = ({ message }) => {
  const [copied, setCopied] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [optimisticVote, setOptimisticVote] = useState<Vote | null>(null);
  const [showReasons, setShowReasons] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [pendingVote, setPendingVote] = useState<Vote | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const downBtnRef = useRef<HTMLButtonElement | null>(null);
  const viewSignalSentRef = useRef(false);
  const timeSignalSentRef = useRef(false);
  const visibleStartRef = useRef<number | null>(null);
  const timeSignalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionIdRef = useRef<string | null | undefined>(undefined);
  const userIdRef = useRef<string | null | undefined>(undefined);
  const moduleUsageSentRef = useRef<Set<string>>(new Set());

  const isUser = message.sender === "user";
  const isStreaming = message.streaming === true;
  const displayText = useMemo(
    () => (message.text ?? message.content ?? "").trim(),
    [message.content, message.text]
  );
  const canSpeak = !isUser && !!displayText;
  const { user, session } = useAuth();
  const { sendFeedback: send } = useSendFeedback();

  const {
    interactionId: contextInteractionId,
    moduleCombo,
    promptHash,
    messageId: contextMessageId,
    latencyMs,
  } = useMessageFeedbackContext(message);
  const explicitMessageId = (() => {
    if (typeof message.message_id === "string" && message.message_id.trim().length > 0) {
      return message.message_id.trim();
    }
    return undefined;
  })();
  const messageId = explicitMessageId ?? contextMessageId ?? message.id;

  const messageInteractionId = (() => {
    const raw = message.interaction_id ?? message.interactionId;
    if (typeof raw === "string" && raw.trim().length > 0) {
      return raw.trim();
    }
    return undefined;
  })();

  const interactionId = messageInteractionId ?? contextInteractionId;
  const hasInteractionId = typeof interactionId === "string" && interactionId.length > 0;

  const ICON_CLASS = `${ICON_SIZE} ${ICON_BASE}`;
  const canDisplayFeedback = !isUser;
  const feedbackButtonsDisabled =
    sendingFeedback || !hasInteractionId || isStreaming;
  const reasonPopoverStatus =
    sendingFeedback && pendingVote === "down" ? "sending" : "selecting";

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
    if (session?.id) return session.id;
    if (sessionIdRef.current !== undefined) return sessionIdRef.current;
    sessionIdRef.current = getSessionId();
    return sessionIdRef.current;
  }, [session?.id]);

  const resolveUserId = useCallback(() => {
    if (user?.id) return user.id;
    if (userIdRef.current !== undefined) return userIdRef.current;
    userIdRef.current = getUserIdFromStore();
    return userIdRef.current;
  }, [user?.id]);

  const createEventPayload = useCallback(
    (extra?: Record<string, unknown>) => {
      const sessionId = resolveSessionId();
      const userId = resolveUserId();
      const payload: FeedbackTrackingPayload = {
        user_id: userId ?? undefined,
        session_id: sessionId ?? undefined,
        source: "inline",
        interaction_id: interactionId,
        ...extra,
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
    },
    [
      interactionId,
      latencyMs,
      messageId,
      moduleCombo,
      promptHash,
      resolveSessionId,
      resolveUserId,
    ],
  );

  const trackPassiveSignal = useCallback(
    (signal: PassiveSignalName, value?: number) => {
      if (!ENABLE_PASSIVE_SIGNALS) return;
      const payload = createEventPayload({ signal, value });
      if (payload) {
        trackFeedbackEvent(`FE: Passive Signal ${signal}`, payload);
      }
    },
    [createEventPayload],
  );

  const emitPassiveSignal = useCallback(
    (signal: PassiveSignalName, value?: number) => {
      if (!ENABLE_PASSIVE_SIGNALS) return;
      const sessionId = resolveSessionId();
      void sendPassiveSignal({
        signal,
        value,
        sessionId: sessionId ?? null,
        interactionId,
        messageId,
      });
      trackPassiveSignal(signal, value);
    },
    [interactionId, messageId, resolveSessionId, trackPassiveSignal],
  );

  useEffect(() => {
    if (!ENABLE_MODULE_USAGE) return;
    if (isUser) return;
    if (isStreaming) return;
    if (moduleUsageCandidates.length === 0) return;

    const sessionId = resolveSessionId();
    const interactionKey = interactionId ?? "__no_interaction__";

    moduleUsageCandidates.forEach((candidate, index) => {
      const moduleKey = candidate.moduleKey;
      if (!moduleKey) return;

      const resolvedPosition =
        typeof candidate.position === "number" && Number.isFinite(candidate.position)
          ? candidate.position
          : index + 1;
      const positionKey = `${resolvedPosition}`;
      const dedupeKey = `${interactionKey}|${moduleKey}|${positionKey}`;
      const fallbackKey = `__any__|${moduleKey}|${positionKey}`;
      if (
        moduleUsageSentRef.current.has(dedupeKey) ||
        moduleUsageSentRef.current.has(fallbackKey)
      ) {
        return;
      }
      moduleUsageSentRef.current.add(dedupeKey);
      moduleUsageSentRef.current.add(fallbackKey);

      void sendModuleUsage({
        moduleKey,
        position: resolvedPosition,
        tokens: candidate.tokens,
        sessionId: sessionId ?? null,
        interactionId,
        messageId: messageId ?? null,
      });
    });
  }, [
    interactionId,
    isStreaming,
    isUser,
    messageId,
    moduleUsageCandidates,
    resolveSessionId,
  ]);

  const clearTimeSignalTimer = useCallback(() => {
    if (timeSignalTimerRef.current) {
      clearTimeout(timeSignalTimerRef.current);
      timeSignalTimerRef.current = null;
    }
  }, []);

  const finalizeTimeSignal = useCallback(() => {
    if (timeSignalSentRef.current) return;
    if (visibleStartRef.current === null) return;

    const elapsedMs = Date.now() - visibleStartRef.current;
    visibleStartRef.current = null;
    timeSignalSentRef.current = true;
    clearTimeSignalTimer();

    const seconds = Math.max(1, Math.round(elapsedMs / 1000));
    emitPassiveSignal("time_on_message", seconds);
  }, [clearTimeSignalTimer, emitPassiveSignal]);

  const feedbackMeta = useMemo(() => {
    const meta: Record<string, unknown> = { ui: "chat_message_actions" };
    if (moduleCombo && moduleCombo.length > 0) {
      meta.module_combo = moduleCombo;
    }
    if (typeof latencyMs === "number") {
      meta.latency_ms = latencyMs;
    }
    if (messageId) {
      meta.message_id = messageId;
    }
    if (promptHash) {
      meta.prompt_hash = promptHash;
    }
    return meta;
  }, [latencyMs, messageId, moduleCombo, promptHash]);

  const sendVote = useCallback(
    async (vote: Vote, reason: string | null) => {
      if (!hasInteractionId || isStreaming || !interactionId) {
        return false;
      }

      const resolvedInteractionId = interactionId;

      setPendingVote(vote);
      setSendingFeedback(true);
      setFeedbackError(null);

      let payload: FeedbackTrackingPayload | undefined;

      try {
        payload = createEventPayload({ vote, reason });
        if (import.meta.env.DEV) {
          console.log("[feedback.submit]", { interactionId: resolvedInteractionId, vote, reason });
        }
        await send({
          interactionId: resolvedInteractionId,
          vote,
          reason,
          source: "chat",
          userId: user?.id ?? null,
          sessionId: session?.id ?? null,
          meta: feedbackMeta,
          messageId: messageId ?? null,
          pillar: DEFAULT_FEEDBACK_PILLAR,
          arm: lastActivatedModuleKey ?? null,
        });

        if (payload) {
          trackFeedbackEvent(
            vote === "up" ? "FE: Inline Like" : "FE: Inline Dislike",
            payload,
          );
        }
        toast.success("Feedback enviado");
        return true;
      } catch (error) {
        if (payload) {
          trackFeedbackEvent("FE: Feedback Error", {
            ...payload,
            error: error instanceof Error ? error.message : String(error),
          });
        }

        let friendly = "Não foi possível enviar agora";
        if (error instanceof FeedbackApiError) {
          const message = (error.message ?? "").toLowerCase();
          if (error.status === 404 || error.code === "interaction_not_found" || message.includes("interaction_not_found")) {
            friendly = "A conversa atualizou — tente na próxima resposta";
          }
        }

        console.error("feedback_send_error", error);
        setFeedbackError(friendly);
        toast.error(friendly);
        return false;
      } finally {
        setSendingFeedback(false);
        setPendingVote(null);
      }
    },
    [
      createEventPayload,
      feedbackMeta,
      hasInteractionId,
      interactionId,
      isStreaming,
      messageId,
      send,
      session?.id,
      user?.id,
    ],
  );

  const copiarTexto = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(displayText || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
      emitPassiveSignal("copy", 1);
    } catch (error) {
      console.warn("Falha ao copiar", error);
    }
  };

  const reproduzirAudio = async () => {
    if (!canSpeak || loadingAudio) return;
    setLoadingAudio(true);
    if (audioUrl) setAudioUrl(null);

    emitPassiveSignal("tts_play", 1);

    try {
      const dataUrl = await gerarAudioDaMensagem(displayText);
      setAudioUrl(dataUrl);
    } catch (error) {
      console.error("Erro ao gerar áudio:", error);
    } finally {
      setLoadingAudio(false);
    }
  };

  const handleSelectReason = useCallback(
    (key: string) => {
      if (sendingFeedback) return;
      setSelectedReason((prev) => (prev === key ? null : key));
      setFeedbackError(null);
    },
    [sendingFeedback],
  );

  const handleCloseReasons = useCallback(() => {
    setShowReasons(false);
    setSelectedReason(null);
    setFeedbackError(null);
  }, []);

  const handleLike = useCallback(async () => {
    if (sendingFeedback || !hasInteractionId || isStreaming) return;
    handleCloseReasons();
    const previousVote = optimisticVote;
    setOptimisticVote("up");
    const success = await sendVote("up", null);
    if (!success) {
      setOptimisticVote(previousVote ?? null);
    }
  }, [handleCloseReasons, hasInteractionId, isStreaming, optimisticVote, sendingFeedback, sendVote]);

  const handleDislike = useCallback(
    async (reason: string) => {
      if (sendingFeedback || !hasInteractionId || isStreaming) return false;
      return sendVote("down", reason);
    },
    [hasInteractionId, isStreaming, sendVote, sendingFeedback],
  );

  const handleThumbDownClick = () => {
    if (sendingFeedback || !hasInteractionId || isStreaming) return;
    if (showReasons) {
      handleCloseReasons();
      return;
    }
    setSelectedReason(null);
    setFeedbackError(null);
    setShowReasons(true);
  };

  const handleConfirmDown = async () => {
    if (sendingFeedback || !hasInteractionId || isStreaming) return;
    const reason = selectedReason ?? "other";
    const previousVote = optimisticVote;
    setOptimisticVote("down");
    const success = await handleDislike(reason);
    if (success) {
      handleCloseReasons();
    } else {
      setOptimisticVote(previousVote ?? null);
    }
  };

  useEffect(() => {
    if (hasInteractionId && !isStreaming) return;
    handleCloseReasons();
  }, [handleCloseReasons, hasInteractionId, isStreaming]);

  useEffect(() => {
    if (!ENABLE_PASSIVE_SIGNALS) return;
    if (isUser) return;
    if (typeof window === "undefined") return;

    const el = containerRef.current;
    if (!el) return;

    const VISIBLE_RATIO = 0.6;
    const MIN_VISIBLE_MS = 6000;

    const scheduleTimeSignal = () => {
      if (timeSignalSentRef.current) return;
      if (timeSignalTimerRef.current !== null) return;
      timeSignalTimerRef.current = window.setTimeout(() => {
        finalizeTimeSignal();
      }, MIN_VISIBLE_MS);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.find((item) => item.target === el);
        const visible =
          !!entry && entry.isIntersecting && entry.intersectionRatio >= VISIBLE_RATIO;

        if (visible) {
          if (!viewSignalSentRef.current) {
            viewSignalSentRef.current = true;
            emitPassiveSignal("view", 1);
          }

          if (!timeSignalSentRef.current && visibleStartRef.current === null) {
            visibleStartRef.current = Date.now();
          }

          scheduleTimeSignal();
        } else {
          if (!timeSignalSentRef.current && visibleStartRef.current !== null) {
            finalizeTimeSignal();
          }
          visibleStartRef.current = null;
          clearTimeSignalTimer();
        }
      },
      { threshold: [0, 0.25, 0.6, 0.85, 1] }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (!timeSignalSentRef.current && visibleStartRef.current !== null) {
        finalizeTimeSignal();
      }
      clearTimeSignalTimer();
    };
  }, [
    clearTimeSignalTimer,
    emitPassiveSignal,
    finalizeTimeSignal,
    isUser,
  ]);

  const actionsPad = isUser ? "pr-4 sm:pr-5" : "ml-[58px] sm:ml-[62px]";

  return (
    <>
      <div
        ref={containerRef}
        className={`flex w-full ${isUser ? "justify-end" : "justify-start"} min-w-0`}
      >
        <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} w-full min-w-0 max-w-full`}>
          <ChatMessage message={message} />

          <div
            className={[
              "mt-1 flex items-center gap-1.5",
              "max-w-[min(720px,88vw)] min-w-0",
              actionsPad,
              isUser ? "self-end" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <GhostBtn onClick={copiarTexto} aria-label="Copiar mensagem" title="Copiar">
              <ClipboardCopy className={ICON_CLASS} strokeWidth={1.5} />
            </GhostBtn>

            {canDisplayFeedback && (
              <>
                <GhostBtn
                  onClick={handleLike}
                  aria-label="Curtir resposta"
                  title="Curtir"
                  disabled={feedbackButtonsDisabled}
                  className={optimisticVote === "up" ? "bg-slate-100" : undefined}
                  aria-pressed={optimisticVote === "up"}
                  aria-busy={sendingFeedback && pendingVote === "up"}
                >
                  {sendingFeedback && pendingVote === "up" ? (
                    <Loader2
                      className={`${ICON_SIZE} text-emerald-600 animate-spin`}
                      strokeWidth={1.75}
                    />
                  ) : (
                    <ThumbsUp
                      className={
                        optimisticVote === "up"
                          ? `${ICON_SIZE} text-emerald-600`
                          : ICON_CLASS
                      }
                      strokeWidth={1.5}
                    />
                  )}
                </GhostBtn>

                <div className="relative">
                  <GhostBtn
                    ref={downBtnRef}
                    onClick={handleThumbDownClick}
                    aria-label="Não curtir resposta"
                    title="Não curtir"
                    disabled={feedbackButtonsDisabled}
                    className={
                      optimisticVote === "down" || showReasons ? "bg-slate-100" : undefined
                    }
                    aria-pressed={optimisticVote === "down"}
                    aria-busy={sendingFeedback && pendingVote === "down"}
                  >
                    {sendingFeedback && pendingVote === "down" ? (
                      <Loader2
                        className={`${ICON_SIZE} text-red-500 animate-spin`}
                        strokeWidth={1.75}
                      />
                    ) : (
                      <ThumbsDown
                        className={
                          optimisticVote === "down" || showReasons
                            ? `${ICON_SIZE} text-red-500`
                            : ICON_CLASS
                        }
                        strokeWidth={1.5}
                      />
                    )}
                  </GhostBtn>
                </div>
                <FeedbackReasonPopover
                  anchorRef={downBtnRef}
                  open={showReasons && hasInteractionId && !isStreaming}
                  selectedReason={selectedReason}
                  status={reasonPopoverStatus}
                  onSelect={handleSelectReason}
                  onConfirm={handleConfirmDown}
                  onClose={handleCloseReasons}
                />
              </>
            )}

            {canSpeak && (
              <GhostBtn
                onClick={reproduzirAudio}
                aria-label={loadingAudio ? "Gerando áudio..." : "Ouvir em áudio"}
                title="Ouvir"
                disabled={loadingAudio}
                className="disabled:opacity-50 disabled:pointer-events-none"
              >
                {loadingAudio ? (
                  <Loader2 className={`${ICON_CLASS} animate-spin`} strokeWidth={1.75} />
                ) : (
                  <Volume2 className={ICON_CLASS} strokeWidth={1.5} />
                )}
              </GhostBtn>
            )}

            <span
              className={`ml-1 text-[10px] text-gray-400 transition-opacity sm:text-xs ${
                copied ? "opacity-100" : "opacity-0"
              }`}
              aria-live="polite"
            >
              Copiado!
            </span>
          </div>

          {feedbackError && (
            <p
              className={[
                "mt-1",
                "max-w-[min(720px,88vw)]",
                "text-[11px] sm:text-xs",
                "text-red-500",
                actionsPad,
              ]
                .filter(Boolean)
                .join(" ")}
              role="status"
              aria-live="polite"
            >
              {feedbackError}
            </p>
          )}
        </div>
      </div>

      {audioUrl && (
        <AudioPlayerOverlay
          audioUrl={audioUrl}
          onClose={() => setAudioUrl(null)}
        />
      )}
    </>
  );
};

export default EcoMessageWithAudio;

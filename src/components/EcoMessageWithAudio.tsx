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
import { enviarFeedback, enviarSignal } from "../api/feedbackApi";
import { gerarAudioDaMensagem } from "../api/voiceApi";
import { Message } from "../contexts/ChatContext";
import { trackFeedbackEvent } from "../analytics/track";
import { getSessionId, getUserIdFromStore } from "../utils/identity";
import { FEEDBACK_REASONS } from "./FeedbackPrompt";

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
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [sendingFeedback, setSendingFeedback] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const reasonsRef = useRef<HTMLDivElement | null>(null);
  const downBtnRef = useRef<HTMLButtonElement | null>(null);
  const seenRef = useRef(false);
  const sessionIdRef = useRef<string | null | undefined>(undefined);
  const userIdRef = useRef<string | null | undefined>(undefined);
  const ttsSignalSentRef = useRef(false);

  const isUser = message.sender === "user";
  const displayText = useMemo(
    () => (message.text ?? message.content ?? "").trim(),
    [message.content, message.text]
  );
  const canSpeak = !isUser && !!displayText;
  const messageId = message.id;

  const ICON_CLASS = `${ICON_SIZE} ${ICON_BASE}`;

  const resolveSessionId = useCallback(() => {
    if (sessionIdRef.current !== undefined) return sessionIdRef.current;
    sessionIdRef.current = getSessionId();
    return sessionIdRef.current;
  }, []);

  const resolveUserId = useCallback(() => {
    if (userIdRef.current !== undefined) return userIdRef.current;
    userIdRef.current = getUserIdFromStore();
    return userIdRef.current;
  }, []);

  const createEventPayload = useCallback(
    (extra?: Record<string, unknown>) => {
      if (!messageId) return null;
      const sessionId = resolveSessionId();
      const userId = resolveUserId();
      return {
        message_id: messageId,
        user_id: userId ?? undefined,
        session_id: sessionId ?? undefined,
        source: "inline",
        ...extra,
      };
    },
    [messageId, resolveSessionId, resolveUserId]
  );

  const copiarTexto = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(displayText || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
      if (messageId) {
        const payload = createEventPayload({ signal: "copy" });
        void enviarSignal({ messageId, signal: "copy" }).catch(() => {});
        if (payload) {
          trackFeedbackEvent("FE: Signal Copy", payload);
        }
      }
    } catch (error) {
      console.warn("Falha ao copiar", error);
    }
  };

  const reproduzirAudio = async () => {
    if (!canSpeak || loadingAudio) return;
    setLoadingAudio(true);
    if (audioUrl) setAudioUrl(null);

    try {
      const dataUrl = await gerarAudioDaMensagem(displayText);
      setAudioUrl(dataUrl);
    } catch (error) {
      console.error("Erro ao gerar áudio:", error);
    } finally {
      setLoadingAudio(false);
    }
  };

  const toggleReason = (key: string) => {
    if (sendingFeedback) return;
    setSelectedReasons((prev) =>
      prev.includes(key) ? prev.filter((reason) => reason !== key) : [...prev, key]
    );
  };

  const submitFeedback = async (vote: Vote, reasons?: string[]) => {
    if (sendingFeedback) return false;
    const payload = createEventPayload({ reasons, vote });
    if (!payload) return false;

    setSendingFeedback(true);
    const sessionId = (payload.session_id ?? null) as string | null;
    const userId = (payload.user_id ?? null) as string | null;

    try {
      await enviarFeedback({
        messageId,
        sessionId,
        userId,
        vote,
        reasons,
        source: "inline",
        meta: { page: "ChatPage" },
      });
      trackFeedbackEvent(
        vote === "up" ? "FE: Inline Like" : "FE: Inline Dislike",
        payload
      );
      return true;
    } catch (error) {
      trackFeedbackEvent("FE: Feedback Error", {
        ...payload,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    } finally {
      setSendingFeedback(false);
    }
  };

  const canSendFeedback = Boolean(messageId);

  const handleThumbUp = async () => {
    if (!canSendFeedback || sendingFeedback) return;
    setShowReasons(false);
    setSelectedReasons([]);
    const previousVote = optimisticVote;
    setOptimisticVote("up");
    const success = await submitFeedback("up");
    if (!success) {
      setOptimisticVote(previousVote ?? null);
    }
  };

  const handleThumbDownClick = () => {
    if (!canSendFeedback || sendingFeedback) return;
    setShowReasons((prev) => {
      const next = !prev;
      if (next) {
        setSelectedReasons([]);
      }
      return next;
    });
  };

  const handleConfirmDown = async () => {
    if (!canSendFeedback || sendingFeedback) return;
    const reasons = selectedReasons.length ? selectedReasons : ["other"];
    const previousVote = optimisticVote;
    setOptimisticVote("down");
    const success = await submitFeedback("down", reasons);
    if (success) {
      setShowReasons(false);
      setSelectedReasons([]);
    } else {
      setOptimisticVote(previousVote ?? null);
    }
  };

  useEffect(() => {
    if (!showReasons) return;
    if (typeof window === "undefined") return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (
        target &&
        (reasonsRef.current?.contains(target) || downBtnRef.current?.contains(target))
      ) {
        return;
      }
      setShowReasons(false);
      setSelectedReasons([]);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showReasons]);

  useEffect(() => {
    if (isUser) return;
    if (seenRef.current) return;
    if (typeof window === "undefined") return;

    const el = containerRef.current;
    if (!el) return;

    let timer: number | undefined;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.some(
          (entry) => entry.isIntersecting && entry.intersectionRatio >= 0.8
        );
        if (visible && !seenRef.current) {
          timer = window.setTimeout(() => {
            seenRef.current = true;
            const payload = createEventPayload({ signal: "read_complete" });
            if (!payload) return;
            void enviarSignal({ messageId, signal: "read_complete" }).catch(() => {});
            trackFeedbackEvent("FE: Signal Read Complete", payload);
          }, 6000);
        } else if (timer) {
          window.clearTimeout(timer);
        }
      },
      { threshold: [0, 0.8] }
    );
    io.observe(el);
    return () => {
      if (timer) window.clearTimeout(timer);
      io.disconnect();
    };
  }, [createEventPayload, isUser, messageId]);

  const handleAudioProgress = ({ ratio }: { ratio: number }) => {
    if (!messageId) return;
    if (ttsSignalSentRef.current) return;
    if (ratio < 0.6) return;
    ttsSignalSentRef.current = true;
    const payload = createEventPayload({ signal: "tts_60", value: 0.6 });
    if (!payload) return;
    void enviarSignal({ messageId, signal: "tts_60", value: 0.6 }).catch(() => {});
    trackFeedbackEvent("FE: Signal TTS", payload);
  };

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

            {canSendFeedback && (
              <>
                <GhostBtn
                  onClick={handleThumbUp}
                  aria-label="Curtir resposta"
                  title="Curtir"
                  disabled={sendingFeedback || !canSendFeedback}
                  className={optimisticVote === "up" ? "bg-slate-100" : undefined}
                  aria-pressed={optimisticVote === "up"}
                >
                  <ThumbsUp
                    className={
                      optimisticVote === "up" ? `${ICON_SIZE} text-emerald-600` : ICON_CLASS
                    }
                    strokeWidth={1.5}
                  />
                </GhostBtn>

                <div className="relative">
                  <GhostBtn
                    ref={downBtnRef}
                    onClick={handleThumbDownClick}
                    aria-label="Não curtir resposta"
                    title="Não curtir"
                    disabled={sendingFeedback || !canSendFeedback}
                    className={
                      optimisticVote === "down" || showReasons ? "bg-slate-100" : undefined
                    }
                    aria-pressed={optimisticVote === "down"}
                  >
                    <ThumbsDown
                      className={
                        optimisticVote === "down" || showReasons
                          ? `${ICON_SIZE} text-red-500`
                          : ICON_CLASS
                      }
                      strokeWidth={1.5}
                    />
                  </GhostBtn>

                  {showReasons && canSendFeedback && (
                    <div
                      ref={reasonsRef}
                      className="absolute right-0 z-30 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
                    >
                      <p className="mb-2 text-sm text-gray-700">O que não ajudou?</p>
                      <div className="flex flex-wrap gap-2">
                        {FEEDBACK_REASONS.map((reason) => {
                          const active = selectedReasons.includes(reason.key);
                          return (
                            <button
                              key={reason.key}
                              type="button"
                              disabled={sendingFeedback}
                              onClick={() => toggleReason(reason.key)}
                              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                                active
                                  ? "border-red-300 bg-red-50 text-red-600"
                                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              {reason.label}
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-3 flex justify-end gap-2 text-xs">
                        <button
                          type="button"
                          className="text-slate-400 hover:text-slate-600"
                          onClick={() => {
                            setShowReasons(false);
                            setSelectedReasons([]);
                          }}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmDown}
                          disabled={sendingFeedback || !canSendFeedback}
                          className="rounded-full bg-red-500 px-3 py-1 font-medium text-white hover:bg-red-600 disabled:opacity-60"
                        >
                          Enviar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
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
        </div>
      </div>

      {audioUrl && (
        <AudioPlayerOverlay
          audioUrl={audioUrl}
          onClose={() => setAudioUrl(null)}
          onProgress={handleAudioProgress}
        />
      )}
    </>
  );
};

export default EcoMessageWithAudio;

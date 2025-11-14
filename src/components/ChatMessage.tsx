// src/components/ChatMessage.tsx
import React, { useMemo, useState, useEffect } from "react";
import clsx from "clsx";

import EcoBubbleOneEye from "./EcoBubbleOneEye";
import TypingDots from "./TypingDots";
import MarkdownRenderer from "./MarkdownRenderer";
import CollapsibleMessage from "./CollapsibleMessage";
import type { Message } from "../contexts/ChatContext";
import { resolveMessageSender, isUserMessage, isEcoMessage } from "../utils/chat/messages";
import { fixIntrawordSpaces } from "../utils/fixIntrawordSpaces";

interface ChatMessageProps {
  message: Message;
  /** indica se a Eco está digitando (stream ativo) */
  isEcoTyping?: boolean;
  /** ativa micro-realce visual no avatar da Eco */
  isEcoActive?: boolean;
  /** callback para retry de mensagens com erro de watchdog */
  onRetry?: () => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isEcoTyping, isEcoActive, onRetry }) => {
  const sender = resolveMessageSender(message) ?? message.sender;
  const normalizedRole = (() => {
    const roleCandidate = message.role ?? sender;
    return typeof roleCandidate === "string" ? roleCandidate.toLowerCase() : "";
  })();
  const isUser = isUserMessage(message);
  const isEco = isEcoMessage(message);

  // stream ativo (mesmo que ainda não tenha chegado texto)
  const isStreaming =
    message?.streaming === true || message?.status === "streaming" || isEcoTyping === true;

  // texto resolvido (conteúdo pode chegar incrementalmente)
  const raw =
    typeof message.content === "string"
      ? message.content
      : typeof message.text === "string"
      ? message.text
      : "";

  const hasVisibleText = raw.trim().length > 0;
  const createdAtCandidate = message?.createdAt ?? message?.updatedAt ?? null;
  const createdAtMs = (() => {
    if (!createdAtCandidate) return undefined;
    if (typeof createdAtCandidate === "number" && Number.isFinite(createdAtCandidate)) {
      return createdAtCandidate;
    }
    if (typeof createdAtCandidate === "string") {
      const parsed = Date.parse(createdAtCandidate);
      return Number.isNaN(parsed) ? undefined : parsed;
    }
    if (createdAtCandidate instanceof Date) {
      return createdAtCandidate.getTime();
    }
    return undefined;
  })();
  const streamingSeconds = createdAtMs
    ? Math.max(0, Math.floor((Date.now() - createdAtMs) / 1000))
    : undefined;

  // sempre mantém a bolha visível quando está streamando
  // usa um espaço não-quebrável como placeholder para garantir altura mínima
  const fallbackText = "⚠️ Nenhuma resposta da ECO desta vez. Tente novamente.";
  const shouldShowFallback = !isStreaming && normalizedRole === "assistant" && !hasVisibleText;
  const textToShow = hasVisibleText
    ? raw
    : isStreaming
    ? "\u00A0"
    : shouldShowFallback
    ? fallbackText
    : "";

  // mostra os três pontinhos dentro da bolha enquanto streama e ainda não há texto
  const showTypingDots = isEco && isStreaming && !hasVisibleText;

  // Evita duplicidade: só renderiza o aviso "Eco refletindo…" se não estiver mostrando os pontinhos
  const showTypingFooter = isStreaming && !hasVisibleText && !showTypingDots;

  // Aplica correção de espaços indevidos (fallback conservador para espaços em mid-word)
  // Memoizada para evitar reprocessar em cada render
  const displayText = useMemo(() => {
    if (!isEco || !hasVisibleText) return textToShow;
    return fixIntrawordSpaces(textToShow);
  }, [textToShow, isEco, hasVisibleText]);

  // Mobile detection for collapsible messages
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 640px)');
    setIsMobile(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
    };

    if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    } else {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  // Determine if message should be collapsible (Eco, long, not streaming)
  const shouldBeCollapsible = useMemo(() => {
    return (
      isEco &&
      isMobile &&
      hasVisibleText &&
      !isStreaming &&
      displayText.length > 1000
    );
  }, [isEco, isMobile, hasVisibleText, isStreaming, displayText]);

  const finishReasonLabel = (() => {
    if (!isEco && normalizedRole !== "assistant") return undefined;
    if (isStreaming) return undefined;
    if (hasVisibleText) return undefined;
    const meta = message?.metadata;
    if (!meta || typeof meta !== "object" || Array.isArray(meta)) return undefined;
    const record = meta as Record<string, unknown> & { finishReason?: unknown; finish_reason?: unknown };
    const finishReason = record.finishReason ?? record.finish_reason;
    if (typeof finishReason !== "string") return undefined;
    const trimmed = finishReason.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  })();

  // Detect watchdog timeout error
  const isWatchdogTimeout = message?.status === 'error' && message?.errorReason === 'watchdog_timeout';
  const watchdogTimeoutMessage = "A Eco está demorando mais do que o normal para responder.";

  const bubbleClass = clsx(
    "min-w-0 rounded-2xl px-3 py-2 md:px-4 md:py-3 text-left leading-[1.6]",
    "text-[15px] md:text-[16px]",
    "max-w-[min(70ch,88vw)] md:max-w-[70ch]",
    "whitespace-pre-wrap break-words overflow-wrap-anywhere",
    isUser
      ? "bg-gradient-to-br from-eco-baby to-eco-babyDark text-white shadow-ecoSm"
      : // contraste suave no fundo branco para a bolha da Eco
        "bg-white/70 backdrop-blur-md border border-eco-line/60 text-eco-text shadow-ecoSm"
  );

  const wrapperClass = clsx("flex w-full", isUser ? "justify-end" : "justify-start");

  const rowClass = clsx(
    "flex max-w-full items-start min-w-0 gap-2 sm:gap-3",
    isUser ? "justify-end" : "justify-start"
  );

  return (
    <div className={wrapperClass} role="listitem" aria-live="polite">
      <div className={rowClass}>
        {isEco && (
          <EcoBubbleOneEye
            className="mt-1 shrink-0"
            variant="message"
            size={30}
            data-eco-active={isEcoActive ? "true" : undefined}
            data-testid="eco-avatar"
          />
        )}
        <div className="flex min-w-0 flex-col">
          {/* Bubble content - optionally wrapped in CollapsibleMessage */}
          {shouldBeCollapsible ? (
            <CollapsibleMessage maxHeightMobile={360} initiallyCollapsed={true}>
              <div className={bubbleClass} data-sender={sender}>
                <div className="chat-message-text">
                  {isEco ? (
                    <MarkdownRenderer content={displayText} />
                  ) : (
                    <span>{displayText}</span>
                  )}
                </div>
              </div>
            </CollapsibleMessage>
          ) : (
            <div className={bubbleClass} data-sender={sender}>
              {showTypingDots ? (
                <span aria-live="polite" className="inline-flex items-center gap-2 text-gray-600">
                  <TypingDots />
                </span>
              ) : (
                <div className="chat-message-text">
                  {isEco ? (
                    <MarkdownRenderer content={displayText} />
                  ) : (
                    <span>{displayText}</span>
                  )}
                </div>
              )}
            </div>
          )}

          {showTypingFooter && (
            <div className="mt-1 flex items-center gap-2 text-sm text-gray-500 italic" role="status" aria-live="polite">
              <span>Eco refletindo...</span>
            </div>
          )}

          {finishReasonLabel && (
            <div className="mt-1 pl-1 text-xs text-gray-500">
              <span className="inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                ({finishReasonLabel})
              </span>
            </div>
          )}

          {isWatchdogTimeout && (
            <div className="mt-3 rounded-lg border border-yellow-300 bg-yellow-50 p-3 max-w-[min(70ch,88vw)] md:max-w-[70ch]">
              <p className="text-sm text-yellow-900 mb-2">{watchdogTimeoutMessage}</p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-md bg-yellow-200 hover:bg-yellow-300 text-yellow-900 transition-colors"
                  aria-label="Tentar novamente"
                >
                  Tentar de novo
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;

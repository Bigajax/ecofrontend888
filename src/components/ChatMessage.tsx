// src/components/ChatMessage.tsx
import React, { useMemo, useState, useEffect } from "react";
import clsx from "clsx";

import EcoBubbleOneEye from "./EcoBubbleOneEye";
import TypingDots from "./TypingDots";
import LazyMarkdownRenderer from "./LazyMarkdownRenderer";
import CollapsibleMessage from "./CollapsibleMessage";
import type { Message } from "../contexts/ChatContext";
import { resolveMessageSender, isUserMessage, isEcoMessage } from "../utils/chat/messages";
import { fixIntrawordSpaces } from "../utils/fixIntrawordSpaces";

/**
 * SafeMarkdownRenderer - Wrapper com fallback se LazyMarkdownRenderer falhar
 */
const SafeMarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    // Fallback: renderizar texto puro se markdown falhar
    return <span className="whitespace-pre-wrap">{content}</span>;
  }

  try {
    return (
      <React.Suspense fallback={<span className="whitespace-pre-wrap">{content}</span>}>
        <LazyMarkdownRenderer content={content} />
      </React.Suspense>
    );
  } catch (error) {
    console.error('[ChatMessage] LazyMarkdownRenderer failed:', error);
    setHasError(true);
    return <span className="whitespace-pre-wrap">{content}</span>;
  }
};

interface ChatMessageProps {
  message: Message;
  /** indica se a Eco está digitando (stream ativo) */
  isEcoTyping?: boolean;
  /** ativa micro-realce visual no avatar da Eco */
  isEcoActive?: boolean;
  /** callback para retry de mensagens com erro de watchdog */
  onRetry?: () => void;
}

// 🚀 PERFORMANCE: Comparação customizada para evitar re-renders desnecessários
const arePropsEqual = (prevProps: ChatMessageProps, nextProps: ChatMessageProps): boolean => {
  // Se as props forem exatamente as mesmas, não re-renderizar
  if (prevProps === nextProps) return true;

  const prevMsg = prevProps.message;
  const nextMsg = nextProps.message;

  // Comparar campos críticos que afetam a renderização
  const sameContent = prevMsg.content === nextMsg.content;
  const sameStatus = prevMsg.status === nextMsg.status;
  const sameStreaming = prevMsg.streaming === nextMsg.streaming;
  const sameTyping = prevProps.isEcoTyping === nextProps.isEcoTyping;
  const sameActive = prevProps.isEcoActive === nextProps.isEcoActive;
  const sameRetry = prevProps.onRetry === nextProps.onRetry;

  // Se todos os campos críticos são iguais, não re-renderizar
  return sameContent && sameStatus && sameStreaming && sameTyping && sameActive && sameRetry;
};

const ChatMessageComponent: React.FC<ChatMessageProps> = ({ message, isEcoTyping, isEcoActive, onRetry }) => {
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
    "min-w-0 rounded-2xl px-3 py-2.5 text-left leading-relaxed",
    "text-[15px]",
    "max-w-[min(65ch,85vw)]",
    "whitespace-pre-wrap break-words overflow-wrap-anywhere",
    "transition-all duration-200",
    isUser
      ? "bg-gray-900 text-white shadow-sm"
      : "bg-white/90 text-gray-900 border border-gray-200/60 shadow-sm backdrop-blur-sm"
  );

  const wrapperClass = clsx(
    "flex w-full group",
    isUser ? "justify-end" : "justify-start"
  );

  const rowClass = clsx(
    "flex max-w-full items-start min-w-0 gap-2",
    isUser ? "justify-end" : "justify-start"
  );

  return (
    <div className={wrapperClass} role="listitem" aria-live="polite">
      <div className={rowClass}>
        {isEco && (
          <EcoBubbleOneEye
            className="mt-0.5 shrink-0"
            variant="message"
            size={24}
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
                    <SafeMarkdownRenderer content={displayText} />
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
                    <SafeMarkdownRenderer content={displayText} />
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
            <div className="mt-1 pl-1 text-xs text-gray-400">
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                {finishReasonLabel}
              </span>
            </div>
          )}

          {isWatchdogTimeout && (
            <div className="mt-2 rounded-lg border border-yellow-200/60 bg-yellow-50/50 backdrop-blur-sm p-2.5 max-w-[min(65ch,85vw)]">
              <p className="text-xs text-yellow-900 mb-1.5">{watchdogTimeoutMessage}</p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-medium rounded-md bg-yellow-100 hover:bg-yellow-200 text-yellow-900 transition-colors"
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

// 🚀 PERFORMANCE: React.memo com comparação customizada para evitar re-renders
const ChatMessage = React.memo(ChatMessageComponent, arePropsEqual);

export default ChatMessage;

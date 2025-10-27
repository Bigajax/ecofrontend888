// src/components/ChatMessage.tsx
import React from "react";
import clsx from "clsx";

import EcoBubbleOneEye from "./EcoBubbleOneEye";
import TypingDots from "./TypingDots";
import type { Message } from "../contexts/ChatContext";
import { resolveMessageSender, isUserMessage, isEcoMessage } from "../utils/chat/messages";

interface ChatMessageProps {
  message: Message;
  /** indica se a Eco está digitando (stream ativo) */
  isEcoTyping?: boolean;
  /** ativa micro-realce visual no avatar da Eco */
  isEcoActive?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isEcoTyping, isEcoActive }) => {
  const sender = resolveMessageSender(message) ?? message.sender;
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

  // sempre mantém a bolha visível quando está streamando
  // usa um espaço não-quebrável como placeholder para garantir altura mínima
  const textToShow = hasVisibleText ? raw : isStreaming ? "\u00A0" : "";

  // mostra os três pontinhos dentro da bolha enquanto streama e ainda não há texto
  const showTypingDots = isEco && isStreaming && !hasVisibleText;

  const finishReasonLabel = (() => {
    if (!isEco) return undefined;
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

  const bubbleClass = clsx(
    "min-w-0 rounded-2xl px-4 py-3 text-left whitespace-pre-wrap break-words leading-relaxed",
    "text-[15px] sm:text-[15px]",
    "max-w-[min(72ch,90vw)] md:max-w-[min(68ch,70vw)]",
    isUser
      ? "bg-[#007AFF] text-white"
      : // contraste suave no fundo branco para a bolha da Eco
        "bg-white text-gray-900 border border-gray-100"
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
          <div className={bubbleClass} data-sender={sender}>
            {showTypingDots ? <TypingDots /> : <span className="chat-message-text">{textToShow}</span>}
          </div>
          {finishReasonLabel && (
            <div className="mt-1 pl-1 text-xs text-gray-500">
              <span className="inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                ({finishReasonLabel})
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;

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

<<<<<<< HEAD
  // sempre mantém a bolha visível quando está streamando
  // usa um espaço não-quebrável como placeholder para garantir altura mínima
  const textToShow = raw && raw.length > 0 ? raw : isStreaming ? "\u00A0" : "";

  // mostra os três pontinhos dentro da bolha enquanto streama e ainda não há texto
  const showTypingDots = isEco && isStreaming && (!raw || raw.length === 0);

  const bubbleClass = clsx(
    "max-w-[80%] min-w-0 rounded-2xl px-4 py-3 whitespace-pre-wrap break-words leading-relaxed text-sm",
    isUser
      ? "bg-[#007AFF] text-white shadow-sm"
      : // contraste suave no fundo branco para a bolha da Eco
        "bg-white text-gray-900 shadow-sm border border-gray-100"
  );

  const wrapperClass = clsx("flex w-full mb-2", isUser ? "justify-end" : "justify-start");

  const rowClass = clsx(
    "flex max-w-full items-start min-w-0",
    isUser ? "justify-end" : "justify-start"
  );
=======
  const isStreaming = message.streaming === true || message.status === "streaming";
  const hasText = typeof resolvedText === "string" && resolvedText.length > 0;
  const showTypingIndicator =
    isEco && !hasText && (isStreaming || isEcoTyping);
  const shouldRenderPlaceholder = isStreaming && !hasText && !showTypingIndicator;
>>>>>>> 8c8e4e5b293fd1cdacefcb63aed34cf5be1d1469

  return (
    <div className={wrapperClass} role="listitem" aria-live="polite">
      <div className={rowClass}>
        {isEco && (
          <EcoBubbleOneEye
            className="mr-2 mt-1"
            variant="message"
            size={30}
            data-eco-active={isEcoActive ? "true" : undefined}
          />
        )}
        <div className={bubbleClass} data-sender={sender}>
<<<<<<< HEAD
          {showTypingDots ? <TypingDots /> : <span>{textToShow}</span>}
=======
          {showTypingIndicator ? (
            <TypingDots />
          ) : (
            <span>{shouldRenderPlaceholder ? "\u00a0" : resolvedText}</span>
          )}
>>>>>>> 8c8e4e5b293fd1cdacefcb63aed34cf5be1d1469
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;

import React from "react";
import clsx from "clsx";

import EcoBubbleOneEye from "./EcoBubbleOneEye";
import TypingDots from "./TypingDots";
import type { Message } from "../contexts/ChatContext";
import { resolveMessageSender, isUserMessage, isEcoMessage } from "../utils/chat/messages";

interface ChatMessageProps {
  message: Message;
  isEcoTyping?: boolean;
  isEcoActive?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isEcoTyping, isEcoActive }) => {
  const sender = resolveMessageSender(message) ?? message.sender;
  const isUser = isUserMessage(message);
  const isEco = isEcoMessage(message);
  const bubbleClass = clsx(
    "max-w-[80%] min-w-0 rounded-2xl px-4 py-3 shadow-sm whitespace-pre-wrap break-words leading-relaxed text-sm",
    isUser ? "bg-[#007AFF] text-white" : "bg-white text-gray-900",
  );
  const wrapperClass = clsx(
    "flex w-full mb-2",
    isUser ? "justify-end" : "justify-start",
  );
  const rowClass = clsx(
    "flex max-w-full items-start min-w-0",
    isUser ? "justify-end" : "justify-start",
  );

  const resolvedText =
    typeof message.content === "string"
      ? message.content
      : typeof message.text === "string"
      ? message.text
      : "";

  const showTypingIndicator = !isUser && isEcoTyping && !resolvedText;

  return (
    <div className={wrapperClass} role="listitem" aria-live="polite" aria-atomic="false">
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
          {showTypingIndicator ? <TypingDots /> : <span>{resolvedText}</span>}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;


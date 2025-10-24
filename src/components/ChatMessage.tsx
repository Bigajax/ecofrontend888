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
    "rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words",
    isUser ? "bg-emerald-600 text-white" : "bg-white text-slate-900 shadow-sm",
  );
  const wrapperClass = clsx(
    "chat-row mb-1 flex w-full min-w-0 px-2 sm:px-4 md:px-6",
    isUser ? "justify-end" : "justify-start",
  );
  const rowClass = clsx(
    "flex w-full max-w-[min(640px,88vw)] items-end gap-3",
    isUser ? "flex-row-reverse" : "flex-row",
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
          <div className="flex-shrink-0 translate-y-[2px]">
            <EcoBubbleOneEye
              variant="message"
              size={30}
              data-eco-active={isEcoActive ? "true" : undefined}
            />
          </div>
        )}
        <div className={clsx("min-w-0 max-w-full flex flex-col", isUser ? "items-end" : "items-start")}>
          <div className={bubbleClass} data-sender={sender}>
            {showTypingIndicator ? <TypingDots /> : <span>{resolvedText}</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;


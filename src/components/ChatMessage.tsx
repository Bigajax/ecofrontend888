import React from "react";
import ReactMarkdown from "react-markdown";
import TypingDots from "../components/TypingDots"; // ⬅️ importe o componente
import { Message } from "../contexts/ChatContext";

interface ChatMessageProps {
  message: Message;
  isEcoTyping?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isEcoTyping }) => {
  const isUser = message.sender === "user";
  const showTyping = !!isEcoTyping && !isUser;

  const text = showTyping ? "" : String(message.text ?? message.content ?? "").trim();

  // Balão: mede pela largura do conteúdo, com mínimo em ch para não “afinar”
  const bubbleClass = [
    isUser ? "message-user rounded-br-xl" : "message-eco rounded-bl-xl",
    "chat-bubble-base",
    "w-fit",
    "min-w-[10ch] sm:min-w-[12ch]",
    "max-w-[82%] md:max-w-[70%]",
    "break-words whitespace-pre-wrap",
    "select-text",
  ].join(" ");

  if (showTyping) {
    return (
      <div
        className={`w-full flex ${isUser ? "justify-end" : "justify-start"} min-w-0 mb-1 sm:mb-2`}
        role="status"
        aria-live="polite"
        aria-label="ECO está digitando…"
      >
        {/* Bolha de digitação no estilo Apple-like (vidro suave) */}
        <div
          className={[
            "message-eco",
            "w-fit max-w-[70%]",
            "px-3 py-2 rounded-2xl",
            "bg-white/65 dark:bg-white/10 backdrop-blur-md",
            "border border-white/40 dark:border-white/15",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_8px_24px_rgba(0,0,0,0.06)]",
          ].join(" ")}
        >
          {/* variante inline fica perfeita “dentro” da bolha */}
          <TypingDots variant="inline" size="md" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full flex ${isUser ? "justify-end" : "justify-start"} min-w-0 mb-1 sm:mb-2`}
      role="listitem"
      aria-live="polite"
      aria-atomic="false"
    >
      <div className={bubbleClass} dir="auto">
        {text ? (
          <div className="font-sans text-[14px] sm:text-sm md:text-base leading-relaxed">
            <div
              className="prose prose-sm sm:prose-base max-w-none font-sans
                         prose-p:my-1.5 sm:prose-p:my-2 prose-li:my-0.5
                         prose-strong:font-semibold prose-em:italic
                         prose-headings:font-semibold prose-headings:text-[1em] prose-headings:leading-snug
                         prose-a:underline prose-a:break-words
                         prose-pre:bg-gray-50/70 prose-pre:border prose-pre:border-gray-200/60 prose-pre:rounded-xl prose-pre:p-3
                         prose-code:before:content-[''] prose-code:after:content-['']"
            >
              <ReactMarkdown
                components={{
                  p: ({ node, ...props }) => <p className="m-0 mb-2 last:mb-0" {...props} />,
                }}
              >
                {text}
              </ReactMarkdown>
            </div>
          </div>
        ) : (
          <span>&nbsp;</span>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;

import React from "react";
import ReactMarkdown from "react-markdown";
import { Message } from "../contexts/ChatContext";

interface ChatMessageProps {
  message: Message;
  isEcoTyping?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isEcoTyping }) => {
  const isUser = message.sender === "user";
  const showTyping = !!isEcoTyping && !isUser;

  const displayText = showTyping
    ? ""
    : String(message.text ?? message.content ?? "");

  return (
    <div
      className={`flex mb-1 sm:mb-2 ${isUser ? "justify-end" : "justify-start"} min-w-0`}
      role="listitem"
      aria-live="polite"
      aria-atomic="false"
    >
      <div
        className={[
          // base da bolha
          "px-3 py-2 sm:px-4 sm:py-3 rounded-3xl",
          "shadow-[0_10px_30px_rgba(16,24,40,0.10)] border",
          "max-w-[82%] md:max-w-[70%] min-w-0",
          // estilos vidro (eco) x vidro levemente mais escuro (user)
          isUser
            ? "bg-white/22 backdrop-blur-xl border-white/40 text-slate-900 rounded-br-xl"
            : "bg-white/45 backdrop-blur-2xl border-white/50 text-slate-900 rounded-bl-xl",
          // micro interação
          "transition-transform duration-150 will-change-transform",
          showTyping ? "scale-[0.99]" : "hover:scale-[1.01]",
        ].join(" ")}
        aria-busy={showTyping || undefined}
      >
        {showTyping ? (
          <div
            className="flex items-center gap-1.5"
            role="status"
            aria-live="polite"
            aria-label="ECO está digitando…"
          >
            <span
              className="h-1.5 w-1.5 rounded-full bg-gray-700/85 animate-bounce"
              style={{ animationDelay: "0ms" }}
              aria-hidden="true"
            />
            <span
              className="h-1.5 w-1.5 rounded-full bg-gray-700/85 animate-bounce"
              style={{ animationDelay: "120ms" }}
              aria-hidden="true"
            />
            <span
              className="h-1.5 w-1.5 rounded-full bg-gray-700/85 animate-bounce"
              style={{ animationDelay: "240ms" }}
              aria-hidden="true"
            />
          </div>
        ) : (
          <div className="font-sans leading-relaxed text-[14px] sm:text-sm md:text-base">
            <div
              className={[
                "prose prose-sm sm:prose-base max-w-none font-sans",
                "prose-p:font-normal prose-li:font-normal prose-strong:font-semibold prose-em:italic",
                "prose-headings:font-semibold prose-headings:leading-snug prose-headings:text-[1em] prose-headings:font-sans",
                "prose-p:my-1.5 sm:prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5",
                "prose-a:break-words prose-a:underline",
                "prose-pre:bg-gray-50/70 prose-pre:border prose-pre:border-gray-200/60 prose-pre:rounded-xl prose-pre:p-3",
                "prose-code:before:content-[''] prose-code:after:content-['']",
                "prose-img:rounded-xl prose-img:max-w-full prose-img:h-auto",
              ].join(" ")}
            >
              <div className="overflow-x-auto min-w-0">
                <ReactMarkdown
                  components={{
                    p: ({ node, ...props }) => (
                      <p className="m-0 mb-2 last:mb-0" {...props} />
                    ),
                  }}
                >
                  {displayText}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;

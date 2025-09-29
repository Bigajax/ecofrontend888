import React from "react";
import ReactMarkdown from "react-markdown";
import EcoBubbleOneEye from "./EcoBubbleOneEye";
import TypingDots from "../components/TypingDots";
import { Message } from "../contexts/ChatContext";

interface ChatMessageProps {
  message: Message;
  isEcoTyping?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isEcoTyping }) => {
  const isUser = message.sender === "user";
  const showTyping = !!isEcoTyping && !isUser;

  const text = showTyping ? "" : String(message.text ?? message.content ?? "").trim();

  if (showTyping) {
    return (
      <div
        className={`w-full flex ${isUser ? "justify-end" : "justify-start"} min-w-0 mb-1 sm:mb-2`}
        role="status"
        aria-live="polite"
        aria-label="ECO está digitando…"
      >
        <div className="flex items-start gap-3">
          <EcoBubbleOneEye variant="message" state="thinking" size={28} />
          <TypingDots variant="bubble" size="md" />
        </div>
      </div>
    );
  }

  const bubbleClass = [
    "message-bubble",
    "relative",
    "px-4 py-3 sm:px-5 sm:py-3.5",
    "rounded-[24px]",
    "w-fit min-w-[10ch] sm:min-w-[12ch]",
    "max-w-[min(720px,88vw)]",
    "break-words whitespace-pre-wrap",
    "shadow-[0_18px_36px_rgba(15,23,42,0.08)]",
    "border",
    "border-transparent",
    "backdrop-blur-[18px] backdrop-saturate-150",
    "transition-transform duration-200 ease-out",
    "text-slate-900",
    "overflow-hidden",
  ].join(" ");

  const bubbleStyle: React.CSSProperties = {
    background: isUser
      ? "radial-gradient(120% 120% at 70% 30%, rgba(255,255,255,0.95), rgba(244,246,255,0.62))"
      : "radial-gradient(120% 120% at 30% 20%, rgba(255,255,255,0.97), rgba(220,232,255,0.65))",
    color: "#0f172a",
    borderColor: isUser ? "rgba(148, 163, 184, 0.24)" : "rgba(120, 162, 255, 0.24)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: isUser ? 24 : 10,
    borderBottomRightRadius: isUser ? 10 : 24,
  };

  return (
    <div
      className={`w-full flex ${isUser ? "justify-end" : "justify-start"} min-w-0 mb-1 sm:mb-2`}
      role="listitem"
      aria-live="polite"
      aria-atomic="false"
    >
      <div
        className={`flex w-full max-w-3xl items-end gap-3 ${
          isUser ? "flex-row-reverse" : "flex-row"
        }`}
      >
        {!isUser && (
          <div className="flex-shrink-0 translate-y-[2px]">
            <EcoBubbleOneEye variant="message" size={30} />
          </div>
        )}

        <div className="min-w-0 max-w-full">
          <div className={bubbleClass} style={bubbleStyle}>
            <span
              aria-hidden
              className="absolute inset-0 pointer-events-none rounded-[inherit]"
              style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.62)" }}
            />

            {text ? (
              <div className="relative z-10 font-sans text-[14px] sm:text-sm md:text-base leading-relaxed">
                <div
                  className="prose prose-sm sm:prose-base max-w-none font-sans prose-p:my-1.5 sm:prose-p:my-2 prose-li:my-0.5 prose-strong:font-semibold prose-em:italic prose-headings:font-semibold prose-headings:text-[1em] prose-headings:leading-snug prose-a:underline prose-a:break-words prose-pre:bg-gray-50/70 prose-pre:border prose-pre:border-gray-200/60 prose-pre:rounded-xl prose-pre:p-3 prose-code:before:content-[''] prose-code:after:content-['']"
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
              <span className="relative z-10">&nbsp;</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;

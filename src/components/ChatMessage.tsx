import React from "react";
import ReactMarkdown from "react-markdown";
import EcoBubbleOneEye from "./EcoBubbleOneEye";
import TypingDots from "../components/TypingDots";
import { Message } from "../contexts/ChatContext";

interface ChatMessageProps {
  message: Message;
  isEcoTyping?: boolean;
  isEcoActive?: boolean;
}

const TEXTUAL_KEYS = [
  "content",
  "texto",
  "text",
  "output_text",
  "outputText",
  "output",
  "answer",
  "resposta",
  "reply",
  "fala",
  "speech",
  "response",
  "final",
  "resultText",
  "value",
] as const;

const NESTED_KEYS = [
  "message",
  "messages",
  "mensagem",
  "resposta",
  "response",
  "data",
  "delta",
  "result",
  "payload",
  "choices",
] as const;

const normalizeMessageContent = (
  value: unknown,
  visited: WeakSet<object> = new WeakSet(),
): string => {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (typeof value === "object") {
    if (visited.has(value as object)) return "";
    visited.add(value as object);

    if (Array.isArray(value)) {
      return value
        .map((item) => normalizeMessageContent(item, visited))
        .join("");
    }

    const obj = value as Record<string, unknown> & { choices?: unknown };
    let aggregated = "";

    for (const key of TEXTUAL_KEYS) {
      if (key in obj) {
        aggregated += normalizeMessageContent(obj[key], visited);
      }
    }

    for (const key of NESTED_KEYS) {
      if (key in obj) {
        aggregated += normalizeMessageContent(obj[key], visited);
      }
    }

    if (Array.isArray(obj.choices)) {
      aggregated += obj.choices
        .map((choice) => normalizeMessageContent(choice, visited))
        .join("");
    }

    return aggregated;
  }

  return "";
};

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isEcoTyping,
  isEcoActive,
}) => {
  const isUser = message.sender === "user";
  const rawText = normalizeMessageContent([message.content, message.text]);
  const trimmedText = rawText.trim();
  const isEcoMessage = message.sender === "eco";
  const showPlaceholder = isEcoMessage && trimmedText.length === 0;
  const displayText = showPlaceholder ? "…" : rawText;
  const hasMarkdownText = !showPlaceholder && trimmedText.length > 0;
  const isStreamingPlaceholder = showPlaceholder;
  const showTyping = Boolean(isEcoTyping && showPlaceholder);

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
    "rounded-[20px]",
    "w-fit min-w-[10ch] sm:min-w-[12ch]",
    "max-w-[min(720px,88vw)]",
    "break-words whitespace-pre-wrap",
    "border",
    "transition-transform duration-200 ease-out",
    "overflow-hidden",
  ].join(" ");

  const bubbleStyle: React.CSSProperties = {
    backgroundColor: isUser
      ? "#007AFF"
      : isStreamingPlaceholder
      ? "rgba(226, 232, 240, 0.75)"
      : "#F3F4F6",
    color: isUser ? "#FFFFFF" : "#0F172A",
    borderColor: isUser
      ? "#0064D2"
      : isStreamingPlaceholder
      ? "rgba(148, 163, 184, 0.5)"
      : "#D0D5DD",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: isUser ? 20 : 12,
    borderBottomRightRadius: isUser ? 12 : 20,
    boxShadow: isUser
      ? "0 4px 10px rgba(0, 98, 204, 0.28)"
      : isStreamingPlaceholder
      ? "0 6px 18px rgba(148, 163, 184, 0.22)"
      : "0 3px 9px rgba(15, 23, 42, 0.12)",
    backdropFilter: "none",
    WebkitBackdropFilter: "none",
  };

  const markdownClassName = [
    "prose prose-sm sm:prose-base max-w-none font-sans",
    "prose-p:my-1.5 sm:prose-p:my-2 prose-li:my-0.5",
    "prose-strong:font-semibold prose-em:italic",
    "prose-headings:font-semibold prose-headings:text-[1em] prose-headings:leading-snug",
    "prose-a:underline prose-a:break-words",
    "prose-pre:bg-gray-50/70 prose-pre:border prose-pre:border-gray-200/60 prose-pre:rounded-xl prose-pre:p-3",
    "prose-code:before:content-[''] prose-code:after:content-['']",
    isUser ? "prose-invert" : "",
  ]
    .filter(Boolean)
    .join(" ");

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
          <div
            className={bubbleClass}
            style={bubbleStyle}
            data-sender={message.sender}
            data-deep-question={message.deepQuestion}
            data-eco-active={isEcoActive ? "true" : undefined}
          >
            {hasMarkdownText && (
              <div className="relative z-10 font-sans text-[14px] sm:text-sm md:text-base leading-relaxed">
                <div className={markdownClassName}>
                  <ReactMarkdown
                    components={{
                      p: ({ node: _node, ...props }) => (
                        <p className="m-0 mb-2 last:mb-0" {...props} />
                      ),
                    }}
                  >
                    {displayText}
                  </ReactMarkdown>
                </div>
              </div>
            )}
            {showPlaceholder && (
              <span className="relative z-10 text-slate-500">…</span>
            )}
            {!hasMarkdownText && !showPlaceholder && (
              <span className="relative z-10">&nbsp;</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;

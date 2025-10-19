import React from "react";
import type { Components } from "react-markdown";
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

const USE_NEW_FEEDBACK = false;

const CODE_SEGMENT_REGEX = /```[\s\S]*?```|`[^`]*`/g;

const applySmartTypography = (segment: string): string => {
  let s = segment.replace(/\n{3,}/g, "\n\n");

  s = s
    .replace(/(^|[\s([{<])"([^"]*)"/g, '$1“$2”')
    .replace(/(^|[\s([{<])'([^']*)'/g, "$1‘$2’")
    .replace(/ ?-- ?/g, " — ");

  return s;
};

function compactAndSmartQuotes(input: string): string {
  if (!input) return input;

  let result = "";
  let lastIndex = 0;
  const regex = new RegExp(CODE_SEGMENT_REGEX.source, "g");
  let match: RegExpExecArray | null;

  // eslint-disable-next-line no-cond-assign
  while ((match = regex.exec(input)) !== null) {
    const before = input.slice(lastIndex, match.index);
    if (before) {
      result += applySmartTypography(before);
    }
    result += match[0];
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < input.length) {
    result += applySmartTypography(input.slice(lastIndex));
  }

  return result;
}

const getPlainTextFromNode = (children: React.ReactNode): string => {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) {
    return children.map(getPlainTextFromNode).join("");
  }
  if (React.isValidElement(children)) {
    return getPlainTextFromNode(children.props.children);
  }
  return "";
};

const findQuoteCreditLineNumbers = (input: string): Set<number> => {
  const creditLines = new Set<number>();
  if (!input) return creditLines;

  const lines = input.split(/\r?\n/);
  let expectingCredit = false;

  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();

    if (trimmed.startsWith(">")) {
      expectingCredit = true;
      continue;
    }

    if (!expectingCredit) {
      continue;
    }

    if (trimmed === "") {
      continue;
    }

    if (/^—\s+.+/.test(trimmed)) {
      creditLines.add(index + 1);
    }

    expectingCredit = false;
  }

  return creditLines;
};

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isEcoTyping,
  isEcoActive,
}) => {
  void USE_NEW_FEEDBACK;
  const isUser = message.sender === "user";
  const isEcoMessage = message.sender === "eco";
  const continuity = message.continuity;
  const showContinuityBadge = isEcoMessage && continuity?.hasContinuity;

  const continuityLabel = (() => {
    const memoryRef = continuity?.memoryRef;
    if (!memoryRef) {
      return "Continuidade detectada";
    }

    const emotion = memoryRef.emocao_principal?.trim();
    const days =
      typeof memoryRef.dias_desde === "number" && Number.isFinite(memoryRef.dias_desde)
        ? memoryRef.dias_desde
        : undefined;

    if (emotion || days !== undefined) {
      if (emotion && days !== undefined) {
        return `Continuidade: ${emotion} • ${days} dias`;
      }
      if (emotion) {
        return `Continuidade: ${emotion}`;
      }
      return `Continuidade: ${days} dias`;
    }

    return "Continuidade detectada";
  })();
  const candidateValues: unknown[] = [];

  const pushCandidate = (value: unknown) => {
    if (value !== undefined && value !== null) {
      candidateValues.push(value);
    }
  };

  pushCandidate(message.content);

  if (
    message.text !== undefined &&
    message.text !== null &&
    message.text !== message.content
  ) {
    pushCandidate(message.text);
  }

  if (isEcoMessage) {
    pushCandidate(message.metadata);
    pushCandidate(message.donePayload);
  }

  if (candidateValues.length === 0) {
    pushCandidate(message.content ?? message.text ?? "");
  }

  let rawText = "";
  for (const value of candidateValues) {
    rawText = normalizeMessageContent(value);
    if (rawText.trim().length > 0) break;
  }
  const trimmedText = rawText.trim();
  if (message.sender === "user" && trimmedText.length === 0) {
    return null;
  }
  const showPlaceholder = isEcoMessage && trimmedText.length === 0;
  const displayText = showPlaceholder ? "…" : rawText;
  const hasMarkdownText = !showPlaceholder && trimmedText.length > 0;
  const typingActive = Boolean(isEcoTyping && showPlaceholder);

  const [typingVisible, setTypingVisible] = React.useState(false);
  const [typingState, setTypingState] = React.useState<
    "hidden" | "enter" | "visible" | "exit"
  >("hidden");
  const typingShowTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const typingHideTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const typingRemoveTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const typingMinVisibleRef = React.useRef<number>(0);

  React.useEffect(() => {
    const SHOW_DELAY = 150;
    const MIN_VISIBLE = 500;
    const EXIT_DURATION = 160;

    if (typingActive) {
      if (typingHideTimeoutRef.current) {
        clearTimeout(typingHideTimeoutRef.current);
        typingHideTimeoutRef.current = null;
      }
      if (typingRemoveTimeoutRef.current) {
        clearTimeout(typingRemoveTimeoutRef.current);
        typingRemoveTimeoutRef.current = null;
      }

      if (typingVisible) {
        typingMinVisibleRef.current = Math.max(
          typingMinVisibleRef.current,
          Date.now() + MIN_VISIBLE,
        );
        if (typingState !== "visible") {
          setTypingState("visible");
        }
        return;
      }

      if (typingShowTimeoutRef.current) {
        return;
      }

      typingShowTimeoutRef.current = window.setTimeout(() => {
        typingShowTimeoutRef.current = null;
        typingMinVisibleRef.current = Date.now() + MIN_VISIBLE;
        setTypingVisible(true);
        setTypingState("enter");
        if (
          typeof window !== "undefined" &&
          typeof window.requestAnimationFrame === "function"
        ) {
          window.requestAnimationFrame(() => {
            setTypingState("visible");
          });
        } else {
          setTypingState("visible");
        }
      }, SHOW_DELAY);
      return;
    }

    if (typingShowTimeoutRef.current) {
      clearTimeout(typingShowTimeoutRef.current);
      typingShowTimeoutRef.current = null;
    }

    if (!typingVisible || typingHideTimeoutRef.current) {
      return;
    }

    const remaining = typingMinVisibleRef.current - Date.now();
    const delay = remaining > 0 ? remaining : 0;

    typingHideTimeoutRef.current = window.setTimeout(() => {
      typingHideTimeoutRef.current = null;
      setTypingState("exit");
      typingRemoveTimeoutRef.current = window.setTimeout(() => {
        typingRemoveTimeoutRef.current = null;
        setTypingVisible(false);
        setTypingState("hidden");
      }, EXIT_DURATION);
    }, delay);
  }, [typingActive, typingVisible, typingState]);

  React.useEffect(() => {
    return () => {
      if (typingShowTimeoutRef.current) {
        clearTimeout(typingShowTimeoutRef.current);
      }
      if (typingHideTimeoutRef.current) {
        clearTimeout(typingHideTimeoutRef.current);
      }
      if (typingRemoveTimeoutRef.current) {
        clearTimeout(typingRemoveTimeoutRef.current);
      }
    };
  }, []);

  if (typingVisible) {
    const typingDataState = typingState === "hidden" ? undefined : typingState;
    return (
      <div
        className={`w-full flex ${isUser ? "justify-end" : "justify-start"} min-w-0 mb-1 sm:mb-2`}
        role="status"
        aria-live="polite"
        aria-label="ECO está digitando…"
      >
        <div
          className={`flex w-full max-w-3xl items-center gap-2 ${
            isUser ? "flex-row-reverse" : "flex-row"
          }`}
        >
          {!isUser && (
            <div className="flex-shrink-0 translate-y-[1px]">
              <EcoBubbleOneEye variant="message" state="thinking" size={30} />
            </div>
          )}

          <div className="min-w-0">
            <div
              className="opacity-0 translate-y-1 transition-opacity transition-transform duration-[160ms] ease-out data-[state=enter]:opacity-100 data-[state=visible]:opacity-100 data-[state=enter]:translate-y-0 data-[state=visible]:translate-y-0 data-[state=exit]:opacity-0 data-[state=exit]:translate-y-1"
              data-state={typingDataState}
            >
              <TypingDots
                variant="bubble"
                size="md"
                className="bg-white/70 border-[color:var(--bubble-border)] shadow-sm shadow-neutral-300/20"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const bubbleClass = isUser
    ? [
        "message-bubble",
        "relative inline-flex w-fit flex-col self-end items-stretch rounded-2xl",
        "px-4 py-2 sm:px-5",
        "max-w-[72%] md:max-w-[64%] lg:max-w-[56%]",
        "[min-width:min(100%,20ch)] sm:[min-width:min(100%,24ch)]",
        "bg-[#007AFF] text-white",
        "shadow-sm shadow-black/10",
        "whitespace-normal break-words [overflow-wrap:anywhere] [hyphens:none] [-webkit-hyphens:none] [-ms-hyphens:none]",
      ].join(" ")
    : [
        "message-bubble",
        "relative inline-flex flex-col items-stretch rounded-2xl",
        "px-4 py-3 sm:px-5 sm:py-3",
        "max-w-[70%]",
        "min-w-0",
        "border border-black/5",
        "bg-white text-slate-800",
        "shadow-sm shadow-black/10",
        "whitespace-normal break-normal [overflow-wrap:anywhere] [hyphens:none] [-webkit-hyphens:none] [-ms-hyphens:none]",
      ].join(" ");

  const processedMarkdown = React.useMemo(() => {
    if (!hasMarkdownText) return displayText;
    return compactAndSmartQuotes(displayText);
  }, [displayText, hasMarkdownText]);

  const creditLineNumbers = React.useMemo(() => {
    if (!isEcoMessage || !hasMarkdownText) {
      return new Set<number>();
    }
    return findQuoteCreditLineNumbers(processedMarkdown);
  }, [hasMarkdownText, isEcoMessage, processedMarkdown]);

  const markdownComponents: Components = {
    blockquote({ node: _node, className, ...props }) {
      const combinedClassName = [
        className,
        "border-l-2 border-zinc-300 pl-4",
      ]
        .filter(Boolean)
        .join(" ");
      return <blockquote className={combinedClassName} {...props} />;
    },
    p({ node, className, ...props }) {
      const lineNumber = node?.position?.start.line;
      const textContent = getPlainTextFromNode(props.children).trim();
      const isCreditLine =
        isEcoMessage &&
        typeof lineNumber === "number" &&
        creditLineNumbers.has(lineNumber) &&
        /^—\s+.+/.test(textContent);

      if (isCreditLine) {
        return (
          <div className="mt-2 text-zinc-500 text-[13px]" {...props} />
        );
      }
      return <p className={className} {...props} />;
    },
    ul({ node: _node, ...props }) {
      return <ul {...props} />;
    },
    ol({ node: _node, ...props }) {
      return <ol {...props} />;
    },
  };

  return (
    <>
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

          <div
            className={`min-w-0 max-w-full flex flex-col ${
              isUser ? "items-end self-end" : "items-start"
            }`}
          >
            <div
              className={bubbleClass}
              data-sender={message.sender}
              data-deep-question={message.deepQuestion}
              data-eco-active={isEcoActive ? "true" : undefined}
            >
              {showContinuityBadge && (
                <span
                  className="badge-continuity absolute top-2 right-3 sm:top-2.5 sm:right-3.5"
                  aria-label={continuityLabel}
                  title={continuityLabel}
                  role="img"
                >
                  🔁
                </span>
              )}
              {hasMarkdownText && (
                <div className="relative z-10 font-sans">
                  <div
                    className={`max-w-[68ch] whitespace-pre-wrap break-normal [overflow-wrap:anywhere] [hyphens:none] [-webkit-hyphens:none] [-ms-hyphens:none] text-[15px] sm:text-[16px] leading-[1.5] font-[450] tracking-tight text-left [&>p]:my-0 [&>p+*]:mt-3 [&>ul]:list-disc [&>ul]:pl-5 [&>ul>li]:mt-1.5 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol>li]:mt-1.5 [&>strong]:font-semibold [&>em]:italic [&_a]:underline [&_a]:underline-offset-2 [&_a]:font-medium [&_a]:text-[inherit] [&_a]:transition-colors [&_a:hover]:opacity-90 [&_a:focus-visible]:outline [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-2 [&_a:focus-visible]:rounded-[2px] ${
                      isUser
                        ? "text-white [&_a]:text-white [&_a:focus-visible]:outline-white/80"
                        : "text-slate-800 [&_a]:text-slate-800 [&_a:focus-visible]:outline-[rgba(0,122,255,0.45)]"
                    }`}
                  >
                    <ReactMarkdown components={markdownComponents}>
                      {processedMarkdown}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
              {showPlaceholder && (
                <span className="relative z-10 text-slate-500">…</span>
              )}
            </div>

            {/* Feedback actions handled via existing toolbar buttons */}
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatMessage;

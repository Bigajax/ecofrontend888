import React from "react";
import clsx from "clsx";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import EcoBubbleOneEye from "./EcoBubbleOneEye";
import TypingDots from "../components/TypingDots";
import { Message } from "../contexts/ChatContext";
import { sanitizeText } from "../utils/sanitizeText";

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

const DEFINITION_KEYWORDS = [
  "definition",
  "definitions",
  "dictionary",
  "lexicon",
  "lexico",
  "verbete",
  "glossary",
  "glossario",
  "etymology",
  "etimologia",
  "grammar",
  "gramatica",
  "synonyms",
  "sinonimos",
  "antonyms",
  "antonimos",
];

const CITATION_KEYWORDS = [
  "citation",
  "citacao",
  "quote",
  "quotation",
  "referencia",
  "reference",
];

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
  const sanitizedRawText = React.useMemo(() => sanitizeText(rawText), [rawText]);
  const trimmedText = sanitizedRawText.trim();
  if (message.sender === "user" && trimmedText.length === 0) {
    return null;
  }
  const showPlaceholder = isEcoMessage && trimmedText.length === 0;
  const displayText = showPlaceholder ? "…" : sanitizedRawText;
  const hasMarkdownText = !showPlaceholder && trimmedText.length > 0;
  const typingActive = Boolean(isEcoTyping && showPlaceholder);

  const metadataString = React.useMemo(() => {
    if (!isEcoMessage) return "";
    try {
      return JSON.stringify({
        metadata: message.metadata ?? null,
        donePayload: message.donePayload ?? null,
      }).toLowerCase();
    } catch {
      return "";
    }
  }, [isEcoMessage, message.donePayload, message.metadata]);

  const looksLikeDefinition = React.useMemo(() => {
    if (!isEcoMessage || !hasMarkdownText) return false;
    const metaHit = DEFINITION_KEYWORDS.some((k) => metadataString.includes(k));
    if (metaHit) return true;
    const textHit = /\b(definiç|etimolog|gramát|sinônim|antônim|conjuga|origem)/i.test(
      trimmedText,
    );
    if (textHit) return true;
    const headingPattern = /\n\n[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ\s/]{3,}\n/;
    return headingPattern.test(trimmedText);
  }, [hasMarkdownText, isEcoMessage, metadataString, trimmedText]);

  const looksLikeCitation = React.useMemo(() => {
    if (!isEcoMessage || !hasMarkdownText) return false;
    const metaHit = CITATION_KEYWORDS.some((k) => metadataString.includes(k));
    if (metaHit) return true;
    const trimmed = trimmedText.trim();
    return trimmed.startsWith('“') || trimmed.startsWith('"') || trimmed.startsWith('>');
  }, [hasMarkdownText, isEcoMessage, metadataString, trimmedText]);

  const typographyVariant: 'definition' | 'citation' | 'default' = looksLikeDefinition
    ? 'definition'
    : looksLikeCitation
    ? 'citation'
    : 'default';

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
        className={clsx(
          "chat-row mb-1 flex w-full min-w-0 px-2 sm:px-4 md:px-6",
          isUser ? "justify-end" : "justify-start",
        )}
        role="status"
        aria-live="polite"
        aria-label="ECO está digitando…"
      >
        <div
          className={clsx(
            "flex w-full max-w-[min(640px,88vw)] items-center gap-2",
            isUser ? "flex-row-reverse" : "flex-row",
          )}
        >
          {!isUser && (
            <div className="flex-shrink-0 translate-y-[1px]">
              <EcoBubbleOneEye variant="message" state="thinking" size={30} />
            </div>
          )}

          <div className="min-w-0">
            <div
              className="opacity-0 translate-y-1 rounded-[18px] border border-black/10 bg-white px-4 py-2 transition-opacity transition-transform duration-[160ms] ease-out data-[state=enter]:translate-y-0 data-[state=enter]:opacity-100 data-[state=exit]:translate-y-1 data-[state=exit]:opacity-0 data-[state=visible]:translate-y-0 data-[state=visible]:opacity-100"
              data-state={typingDataState}
            >
              <TypingDots
                variant="bubble"
                size="md"
                className="text-slate-500"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const bubbleClass = clsx(
    "message-bubble relative inline-flex max-w-full flex-col rounded-[20px] px-4 py-3 sm:px-5",
    "whitespace-pre-line break-words [overflow-wrap:anywhere] [hyphens:none] [-webkit-hyphens:none] [-ms-hyphens:none]",
    isUser
      ? "ml-auto bg-[color:var(--bubble-user-bg)] text-[color:var(--bubble-user-text)] shadow-[0_12px_32px_rgba(0,122,255,0.18)]"
      : "border border-[color:var(--bubble-border)] bg-[color:var(--bubble-eco-bg)] text-[color:var(--bubble-eco-text)] shadow-[0_8px_26px_rgba(11,18,32,0.08)]",
  );

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

  const baseMarkdownClass = clsx(
    "markdown-body max-w-full whitespace-pre-line break-words [overflow-wrap:anywhere] [hyphens:none] [-webkit-hyphens:none] [-ms-hyphens:none]",
    isUser
      ? "text-[color:var(--bubble-user-text)] font-[500] leading-[1.35] tracking-[-0.01em]"
      : "text-[color:var(--bubble-eco-text)] font-[460] leading-[1.45] tracking-[-0.012em]",
  );

  const markdownClass = clsx(
    baseMarkdownClass,
    !isUser && typographyVariant === "definition" && "definition-block",
    !isUser && typographyVariant === "citation" && "citation-block",
  );

  const markdownComponents: Components = {
    blockquote({ node: _node, className, ...props }) {
      const combinedClassName = [
        className,
        "border-l border-[rgba(11,18,32,0.12)] pl-4",
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
        className={clsx(
          "chat-row mb-1 flex w-full min-w-0 px-2 sm:px-4 md:px-6",
          isUser ? "justify-end" : "justify-start",
        )}
        role="listitem"
        aria-live="polite"
        aria-atomic="false"
      >
        <div
          className={clsx(
            "flex w-full max-w-[min(640px,88vw)] items-end gap-3",
            isUser ? "flex-row-reverse" : "flex-row",
          )}
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
                <div className="relative z-10">
                  <div className={markdownClass}>
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

import React, {
  useState,
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Mic, Loader2 } from "lucide-react";
import clsx from "clsx";

import { toast } from "../utils/toast";
import mixpanel from "../lib/mixpanel";
import { useHapticFeedback } from "../hooks/useHapticFeedback";

type Props = {
  onSendMessage: (t: string) => void | Promise<void>;
  disabled?: boolean;
  onTextChange?: (text: string) => void;
  placeholder?: string;
  isSending: boolean;
  value?: string;
  onMicPress?: () => void;
  isMicActive?: boolean;
};

export type ChatInputHandle = {
  focus: () => void;
};

const CTA_TEXT = "Converse com a Eco...";

const ChatInput = forwardRef<ChatInputHandle, Props>(
  (
    {
      onSendMessage,
      disabled = false,
      onTextChange,
      placeholder = CTA_TEXT,
      isSending,
      value,
      onMicPress,
      isMicActive = false,
    },
    ref,
  ) => {
    const [inputMessage, setInputMessage] = useState(value ?? "");
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const wrapperRef = useRef<HTMLFormElement>(null);
    const haptic = useHapticFeedback({ enabled: true });

    const isBusy = disabled || isSending;

    // --- sanitização/validação mínima (preserva "oi") ---
    const MIN_NON_WS = 1;
    const sanitize = (t: string) => t.replace(/\s+/g, " ").trim();

    const hasText = sanitize(inputMessage).length >= MIN_NON_WS;

    // estado do botão de ação único (transforma conforme contexto)
    const action: "sending" | "send" | "mic" = isSending
      ? "sending"
      : hasText
      ? "send"
      : "mic";

    useImperativeHandle(ref, () => ({
      focus: () => {
        requestAnimationFrame(() => textareaRef.current?.focus());
      },
    }));

    useEffect(() => {
      if (typeof value !== "string") return;
      if (value === inputMessage) return;
      setInputMessage(value);
    }, [value, inputMessage]);

    useEffect(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const MIN_HEIGHT = 44;
      const MAX_HEIGHT = 152;
      textarea.style.height = "auto";
      const nextHeight = Math.max(
        MIN_HEIGHT,
        Math.min(MAX_HEIGHT, textarea.scrollHeight),
      );
      textarea.style.height = `${nextHeight}px`;
      textarea.style.overflowY =
        textarea.scrollHeight > MAX_HEIGHT ? "auto" : "hidden";
    }, [inputMessage]);

    const trySendMessage = async () => {
      if (isBusy) return;

      const raw = inputMessage;
      const sanitized = sanitize(raw);

      if (import.meta.env?.DEV) {
        console.debug("[ChatInput] willSend", {
          raw,
          sanitized,
          rawLen: raw.length,
          sanitizedLen: sanitized.length,
        });
      }

      if (sanitized.length < MIN_NON_WS) {
        if (import.meta.env?.DEV)
          console.warn("[ChatInput] blocked: empty after sanitize");
        toast.error("Escreva algo para enviar.");
        return;
      }

      try {
        await onSendMessage(sanitized);

        setInputMessage("");
        onTextChange?.("");
        mixpanel?.track?.("ui_input_cleared");

        requestAnimationFrame(() => textareaRef.current?.focus());
      } catch (err) {
        console.error("Erro ao enviar mensagem:", err);
        const fallbackMessage =
          "Não foi possível enviar a mensagem. Tente novamente.";
        const detail =
          err instanceof Error && err.message ? err.message : undefined;
        toast.error(detail ? `${fallbackMessage} (${detail})` : fallbackMessage);
      }
    };

    const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
      event.preventDefault();
      await trySendMessage();
    };

    const handleMicPress = () => {
      if (isBusy || isMicActive) return;
      haptic.medium();
      onMicPress?.();
    };

    return (
      <motion.form
        ref={wrapperRef}
        className="relative w-full"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 18 }}
        aria-disabled={isBusy}
        aria-busy={isSending}
        role="group"
        style={{ overflowAnchor: "none" }}
        onSubmit={handleSubmit}
      >
        <div
          className={clsx(
            "flex w-full flex-col gap-1.5 rounded-[28px] border border-eco-line/60 bg-white/70 px-4 py-3 backdrop-blur-md transition-all duration-200 shadow-ecoSm",
            "focus-within:border-eco-baby focus-within:ring-2 focus-within:ring-eco-baby/30",
            "hover:border-eco-line",
            isBusy ? "opacity-90" : "",
          )}
        >
          <textarea
            ref={textareaRef}
            value={inputMessage}
            data-chat-input-textarea
            onChange={(e) => {
              const next = e.target.value;
              setInputMessage(next);
              onTextChange?.(next);
            }}
            onFocus={() => haptic.light()}
            placeholder={placeholder}
            rows={1}
            inputMode="text"
            enterKeyHint="send"
            maxLength={4000}
            disabled={isBusy}
            aria-disabled={isBusy}
            aria-label="Mensagem para a Eco"
            className="w-full min-w-0 max-h-[9.5rem] min-h-[2.75rem] resize-none border-0 bg-transparent px-1 text-[15px] leading-[1.6] text-slate-800 placeholder:text-slate-400/80 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:text-[rgba(71,85,105,0.55)] sm:text-[16px]"
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !(event.nativeEvent as unknown as { isComposing?: boolean })
                  .isComposing
              ) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />

          {/* linha de ação — botão único que se transforma */}
          <div className="flex items-center justify-end">
            <AnimatePresence mode="popLayout" initial={false}>
              {action === "send" ? (
                <motion.button
                  key="send"
                  type="submit"
                  disabled={isBusy}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.16 }}
                  whileTap={{ scale: 0.92 }}
                  className={clsx(
                    "inline-flex h-9 w-9 items-center justify-center rounded-full text-white transition-shadow duration-200 shadow-md",
                    "bg-gradient-to-br from-eco-baby to-eco-babyDark",
                    "hover:shadow-lg",
                    "focus-visible:ring-2 focus-visible:ring-eco-baby/50 focus-visible:outline-none",
                    isBusy ? "cursor-not-allowed opacity-70 hover:shadow-md" : null,
                  )}
                  aria-label="Enviar mensagem"
                  title={isBusy ? "Aguarde a resposta da Eco" : "Enviar mensagem"}
                >
                  <ArrowUp size={18} strokeWidth={2} />
                </motion.button>
              ) : action === "sending" ? (
                <motion.div
                  key="sending"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.16 }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-eco-baby/30 bg-eco-babySoft text-eco-baby"
                  role="status"
                  aria-label="Eco está respondendo"
                  title="Eco está respondendo"
                >
                  <Loader2 size={18} strokeWidth={2} className="animate-spin" />
                </motion.div>
              ) : (
                <motion.button
                  key="mic"
                  type="button"
                  onClick={handleMicPress}
                  disabled={isBusy || isMicActive}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.16 }}
                  whileTap={{ scale: 0.92 }}
                  className={clsx(
                    "inline-flex h-9 w-9 items-center justify-center rounded-full border border-eco-baby/30 bg-eco-babySoft text-eco-baby transition-all duration-200 shadow-ecoSm",
                    "hover:bg-eco-baby/15",
                    "focus-visible:ring-2 focus-visible:ring-eco-baby/40 focus-visible:outline-none",
                    isBusy
                      ? "cursor-not-allowed opacity-60"
                      : isMicActive
                      ? "cursor-wait opacity-80"
                      : "",
                  )}
                  aria-label={
                    isMicActive ? "Gravação em andamento" : "Abrir painel de voz"
                  }
                  title={isMicActive ? "Gravação em andamento" : "Falar com a Eco"}
                >
                  <Mic size={18} strokeWidth={1.8} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.form>
    );
  },
);

ChatInput.displayName = "ChatInput";

export default ChatInput;

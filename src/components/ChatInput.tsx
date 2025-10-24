import React, {
  useState,
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, Plus } from 'lucide-react';
import clsx from 'clsx';

import { toast } from '../utils/toast';
import mixpanel from '../lib/mixpanel';

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

const CTA_TEXT = 'Converse com a Eco...';

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
    const [inputMessage, setInputMessage] = useState(value ?? '');

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const sendButtonRef = useRef<HTMLButtonElement>(null);
    const wrapperRef = useRef<HTMLFormElement>(null);

    const isBusy = disabled || isSending;
    const hasText = inputMessage.trim().length > 0;

    useImperativeHandle(ref, () => ({
      focus: () => {
        requestAnimationFrame(() => textareaRef.current?.focus());
      },
    }));

    useEffect(() => {
      if (typeof value !== 'string') return;
      if (value === inputMessage) return;
      setInputMessage(value);
    }, [value, inputMessage]);

    useEffect(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const MIN_HEIGHT = 44;
      const MAX_HEIGHT = 152;
      textarea.style.height = 'auto';
      const nextHeight = Math.max(
        MIN_HEIGHT,
        Math.min(MAX_HEIGHT, textarea.scrollHeight),
      );
      textarea.style.height = `${nextHeight}px`;
      textarea.style.overflowY =
        textarea.scrollHeight > MAX_HEIGHT ? 'auto' : 'hidden';
    }, [inputMessage]);

    const trySendMessage = async () => {
      if (isBusy) return;
      const raw = inputMessage;
      if (!raw.trim()) return;

      try {
        await onSendMessage(raw);
        setInputMessage('');
        onTextChange?.('');

        try {
          mixpanel.track('ui_input_cleared');
        } catch (trackErr) {
          if ((import.meta as any)?.env?.DEV) {
            console.warn('mixpanel track falhou', trackErr);
          }
        }

        sendButtonRef.current?.classList.add('scale-90');
        setTimeout(() => sendButtonRef.current?.classList.remove('scale-90'), 120);
        requestAnimationFrame(() => textareaRef.current?.focus());
      } catch (err) {
        console.error('Erro ao enviar mensagem:', err);
        const fallbackMessage =
          'Não foi possível enviar a mensagem. Tente novamente.';
        const detail =
          err instanceof Error && err.message ? err.message : undefined;
        toast.error(detail ? `${fallbackMessage} (${detail})` : fallbackMessage);
      }
    };

    const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
      event.preventDefault();
      await trySendMessage();
    };

    return (
      <motion.form
        ref={wrapperRef}
        className="relative w-full"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 18 }}
        aria-disabled={isBusy}
        aria-busy={isSending}
        role="group"
        style={{ overflowAnchor: 'none' }}
        onSubmit={handleSubmit}
      >
        <div className="flex w-full items-center gap-2 sm:gap-3">
          <div className="flex min-w-0 flex-1">
            <div
              className={clsx(
                'group flex w-full min-w-0 items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-2.5 shadow-[0_26px_54px_rgba(15,23,42,0.16)] backdrop-blur-xl transition-all duration-200 focus-within:border-white focus-within:bg-white/80 focus-within:shadow-[0_32px_64px_rgba(15,23,42,0.22)] focus-within:ring-2 focus-within:ring-[rgba(0,122,255,0.22)] sm:px-4',
                isBusy
                  ? 'opacity-90'
                  : 'hover:border-white/70 hover:bg-white/80 hover:shadow-[0_30px_60px_rgba(15,23,42,0.18)]',
              )}
            >
              {onMicPress ? (
                <button
                  type="button"
                  onClick={() => {
                    if (isBusy || isMicActive) return;
                    onMicPress?.();
                  }}
                  disabled={isBusy || isMicActive}
                  className={clsx(
                    'relative -ml-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/70 text-[color:var(--color-text-primary)] shadow-[0_12px_24px_rgba(15,23,42,0.12)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(0,122,255,0.28)]',
                    isBusy
                      ? 'cursor-not-allowed opacity-60 shadow-none'
                      : isMicActive
                      ? 'cursor-wait bg-white/80 text-[color:var(--color-accent)] shadow-[0_16px_30px_rgba(0,122,255,0.2)]'
                      : 'hover:bg-white/90 hover:shadow-[0_18px_36px_rgba(15,23,42,0.18)]',
                  )}
                  aria-label={
                    isMicActive ? 'Gravação em andamento' : 'Abrir modo voz'
                  }
                  title={
                    isBusy
                      ? 'Aguarde a resposta da Eco'
                      : isMicActive
                      ? 'Gravação em andamento'
                      : 'Abrir modo voz'
                  }
                >
                  <Plus size={18} strokeWidth={2} />
                </button>
              ) : null}

              <div className="relative flex min-w-0 flex-1 items-center">
                <textarea
                  ref={textareaRef}
                  value={inputMessage}
                  data-chat-input-textarea
                  onChange={(e) => {
                    const next = e.target.value;
                    setInputMessage(next);
                    onTextChange?.(next);
                  }}
                  placeholder={placeholder}
                  rows={1}
                  inputMode="text"
                  enterKeyHint="send"
                  maxLength={4000}
                  disabled={isBusy}
                  aria-disabled={isBusy}
                  aria-label="Mensagem para a Eco"
                  className={clsx(
                    'w-full min-w-0 max-h-[9.5rem] min-h-[2.9rem] resize-none border-0 bg-transparent py-[0.45rem] text-[15px] leading-[1.6] tracking-[-0.01em] text-slate-800 placeholder:text-slate-400/90 placeholder:opacity-100 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:text-[rgba(71,85,105,0.55)] sm:text-[16px]',
                    isMicActive ? 'pointer-events-none opacity-0' : 'opacity-100',
                  )}
                  title={isBusy ? 'Aguarde a resposta da Eco' : undefined}
                  onKeyDown={(event) => {
                    if (
                      event.key === 'Enter' &&
                      !event.shiftKey &&
                      !(event.nativeEvent as unknown as { isComposing?: boolean }).isComposing
                    ) {
                      event.preventDefault();
                      void trySendMessage();
                    }
                  }}
                />

                <AnimatePresence>
                  {isMicActive ? (
                    <motion.div
                      key="voice-active"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.24, ease: 'easeOut' }}
                      className="pointer-events-none absolute inset-0 flex items-center justify-center gap-3 rounded-full bg-white/80 px-3 text-slate-600 backdrop-blur"
                      aria-hidden="true"
                    >
                      <motion.span
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--color-accent)]/12 text-[color:var(--color-accent)]"
                        animate={{ scale: [1, 1.06, 1] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <Mic size={18} strokeWidth={1.8} />
                      </motion.span>
                      <div className="flex h-8 items-center gap-[3px]">
                        {Array.from({ length: 12 }).map((_, index) => (
                          <motion.span
                            // eslint-disable-next-line react/no-array-index-key
                            key={index}
                            className="h-6 w-1 rounded-full bg-[color:var(--color-accent)]/80"
                            animate={{ scaleY: [0.4, 1.1, 0.5] }}
                            transition={{
                              duration: 1.2,
                              repeat: Infinity,
                              repeatDelay: 0.2,
                              delay: index * 0.08,
                              ease: 'easeInOut',
                            }}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-medium tracking-[-0.01em] text-slate-600">
                        Escutando…
                      </span>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (isBusy || isMicActive) return;
                  onMicPress?.();
                }}
                disabled={isBusy || isMicActive}
                className={clsx(
                  'relative -mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/70 text-[color:var(--color-text-primary)] shadow-[0_14px_28px_rgba(15,23,42,0.12)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(0,122,255,0.28)] group-hover:bg-white/80',
                  isBusy
                    ? 'cursor-not-allowed opacity-60 shadow-none'
                    : isMicActive
                    ? 'cursor-wait bg-[color:var(--color-accent)]/15 text-[color:var(--color-accent)] shadow-[0_16px_32px_rgba(0,122,255,0.18)]'
                    : 'hover:bg-white/90 hover:shadow-[0_18px_36px_rgba(15,23,42,0.18)]',
                )}
                aria-label={
                  isMicActive ? 'Gravação em andamento' : 'Abrir painel de voz'
                }
                title={
                  isBusy
                    ? 'Aguarde a resposta da Eco'
                    : isMicActive
                    ? 'Gravação em andamento'
                    : 'Abrir painel de voz'
                }
              >
                <Mic size={18} strokeWidth={1.8} />
              </button>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {hasText && (
              <motion.button
                key="send"
                ref={sendButtonRef}
                type="submit"
                disabled={isBusy}
                initial={{ opacity: 0, scale: 0.9, x: 8 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: 8 }}
                transition={{ duration: 0.18 }}
                className={clsx(
                  'inline-flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--color-accent)] text-white shadow-[0_20px_36px_rgba(0,122,255,0.2)] transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(0,122,255,0.35)] hover:-translate-y-[1px] active:scale-[0.96]',
                  isBusy ? 'cursor-not-allowed opacity-70 hover:translate-y-0' : null,
                )}
                aria-label="Enviar mensagem"
                title={isBusy ? 'Aguarde a resposta da Eco' : 'Enviar mensagem'}
              >
                <Send size={16} strokeWidth={1.6} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.form>
    );
  },
);

ChatInput.displayName = 'ChatInput';

export default ChatInput;

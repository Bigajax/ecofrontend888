import React, {
  useState,
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, Plus, X, Headphones } from 'lucide-react';
import clsx from 'clsx';

import { toast } from '../utils/toast';
import mixpanel from '../lib/mixpanel';

type Props = {
  onSendMessage: (t: string) => void | Promise<void>;
  onMoreOptionSelected: (k: 'go_to_voice_page') => void;
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

const CTA_TEXT = 'Converse com a Eco…';

const ChatInput = forwardRef<ChatInputHandle, Props>(
  (
    {
      onSendMessage,
      onMoreOptionSelected,
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
    const [showMoreOptions, setShowMoreOptions] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const sendButtonRef = useRef<HTMLButtonElement>(null);
    const wrapperRef = useRef<HTMLFormElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

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
      if (!showMoreOptions) return;
      const onDocClick = (event: MouseEvent) => {
        if (!popoverRef.current || !wrapperRef.current) return;
        const target = event.target as Node;
        if (
          !popoverRef.current.contains(target) &&
          !wrapperRef.current.contains(target)
        ) {
          setShowMoreOptions(false);
        }
      };
      document.addEventListener('mousedown', onDocClick);
      return () => document.removeEventListener('mousedown', onDocClick);
    }, [showMoreOptions]);

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

    const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
      event.preventDefault();
      if (isBusy) return;
      const trimmed = inputMessage.trim();
      if (!trimmed) return;

      try {
        await onSendMessage(trimmed);
        setInputMessage('');
        onTextChange?.('');
        setShowMoreOptions(false);

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
        <div className="flex w-full items-end gap-2 sm:gap-3">
          <div className="relative flex items-center">
            <button
              type="button"
              onClick={() => {
                if (isBusy) return;
                setShowMoreOptions((prev) => !prev);
              }}
              className={clsx(
                'inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-[color:var(--color-text-primary)] shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-all duration-200 backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(0,122,255,0.24)]',
                isBusy
                  ? 'cursor-not-allowed opacity-50'
                  : 'hover:-translate-y-[1px] active:scale-[0.97]',
              )}
              aria-expanded={showMoreOptions}
              aria-controls="chatinput-popover"
              aria-label="Mais opções"
              disabled={isBusy}
              title={isBusy ? 'Aguarde a resposta da Eco' : 'Mais opções'}
            >
              {showMoreOptions ? <X size={18} /> : <Plus size={18} />}
            </button>

            <AnimatePresence>
              {showMoreOptions && !isBusy && (
                <motion.div
                  ref={popoverRef}
                  id="chatinput-popover"
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="absolute bottom-full left-0 z-50 mb-3 w-52 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-floating"
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (isBusy) return;
                      onMoreOptionSelected('go_to_voice_page');
                      setShowMoreOptions(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-[color:var(--color-text-primary)] transition hover:bg-[rgba(0,122,255,0.08)]"
                  >
                    <Headphones size={18} strokeWidth={1.5} />
                    Modo de voz
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex min-w-0 flex-1">
            <div
              className={clsx(
                'flex w-full min-w-0 items-end gap-2 rounded-2xl bg-white px-4 py-2 shadow-[0_8px_28px_rgba(0,0,0,0.08)] transition-colors',
                isBusy ? 'opacity-90' : 'opacity-100',
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
                placeholder={placeholder}
                rows={1}
                inputMode="text"
                enterKeyHint="send"
                maxLength={4000}
                disabled={isBusy}
                aria-disabled={isBusy}
                aria-label="Mensagem para a Eco"
                className="w-full min-w-0 max-h-[9.5rem] min-h-[2.75rem] resize-none border-0 bg-transparent text-[15px] leading-[1.45] tracking-[-0.01em] text-slate-800 placeholder:text-slate-400 placeholder:opacity-70 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:text-[rgba(71,85,105,0.55)] sm:text-[16px]"
                title={isBusy ? 'Aguarde a resposta da Eco' : undefined}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (isBusy || isMicActive) return;
                onMicPress?.();
              }}
              disabled={isBusy || isMicActive}
              className={clsx(
                'inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-[color:var(--color-text-primary)] shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-all duration-200 backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(0,122,255,0.24)]',
                isBusy
                  ? 'cursor-not-allowed opacity-50'
                  : isMicActive
                  ? 'cursor-wait opacity-80'
                  : 'hover:-translate-y-[1px] active:scale-[0.97]',
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
                    'inline-flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--color-accent)] text-white shadow-[0_16px_32px_rgba(0,122,255,0.2)] transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(0,122,255,0.35)] hover:-translate-y-[1px] active:scale-[0.96]',
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
        </div>
      </motion.form>
    );
  },
);

ChatInput.displayName = 'ChatInput';

export default ChatInput;

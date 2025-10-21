import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, Plus, X, Headphones } from 'lucide-react';
import clsx from 'clsx';

import { toast } from '../utils/toast';
import mixpanel from '../lib/mixpanel';

type Props = {
  onSendMessage: (t: string) => void | Promise<void>;
  onMoreOptionSelected: (k: 'go_to_voice_page') => void;
  onSendAudio?: (b: Blob) => void;
  disabled?: boolean;
  onTextChange?: (text: string) => void;
  placeholder?: string;
  isSending: boolean;
};

const CTA_TEXT = 'Converse com a Eco…';

const ChatInput: React.FC<Props> = ({
  onSendMessage,
  onMoreOptionSelected,
  onSendAudio,
  disabled = false,
  onTextChange,
  placeholder = CTA_TEXT,
  isSending,
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [isRecordingUI, setIsRecordingUI] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const speechRecognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendButtonRef = useRef<HTMLButtonElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const safeOnSendAudio = onSendAudio ?? (() => {});
  const isBusy = disabled || isSending;
  const hasText = inputMessage.trim().length > 0;

  // --- outside click para o popover
  useEffect(() => {
    if (!showMoreOptions) return;
    const onDocClick = (e: MouseEvent) => {
      if (!popoverRef.current || !wrapperRef.current) return;
      const t = e.target as Node;
      if (!popoverRef.current.contains(t) && !wrapperRef.current.contains(t)) {
        setShowMoreOptions(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showMoreOptions]);

  // auto-resize do textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const MIN_HEIGHT = 44;
    const MAX_HEIGHT = 152;
    ta.style.height = 'auto';
    const next = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, ta.scrollHeight));
    ta.style.height = `${next}px`;
    ta.style.overflowY = ta.scrollHeight > MAX_HEIGHT ? 'auto' : 'hidden';
  }, [inputMessage]);

  // WebKit Speech (dictation)
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      // @ts-ignore
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'pt-BR';
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        }
        if (finalTranscript.trim()) {
          setInputMessage((prev) => {
            const next = (prev ? prev + ' ' : '') + finalTranscript;
            onTextChange?.(next);
            return next;
          });
        }
      };
      recognition.onerror = (e: any) => console.error('Erro no reconhecimento de fala:', e.error);
      speechRecognitionRef.current = recognition;
    }
    return () => {
      try { speechRecognitionRef.current?.abort?.(); } catch {}
    };
  }, [onTextChange]);

  // helpers
  const stopTracks = (rec: MediaRecorder | null) => {
    try { rec?.stream?.getTracks()?.forEach((t) => t.stop()); } catch {}
  };

  // gravação
  const startRecording = async () => {
    if (isBusy || isTranscribing || isRecordingUI) return;
    setIsRecordingUI(true);
    setIsTranscribing(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type =
        (window as any).MediaRecorder?.isTypeSupported?.('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType: type });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.onstop = () => {
        setIsTranscribing(true);
        const blob = new Blob(chunks, { type });
        safeOnSendAudio(blob);
        stopTracks(recorder);
        setTimeout(() => {
          setIsRecordingUI(false);
          setIsTranscribing(false);
        }, 1200);
      };

      setMediaRecorder(recorder);
      recorder.start();

      try {
        if (speechRecognitionRef.current && speechRecognitionRef.current.continuous) {
          speechRecognitionRef.current.abort?.();
        }
        speechRecognitionRef.current?.start?.();
      } catch {}
    } catch (err) {
      console.error('Erro ao acessar microfone:', err);
      setIsRecordingUI(false);
    }
  };

  const stopRecording = () => {
    try {
      if (mediaRecorder?.state === 'recording') mediaRecorder.stop();
      speechRecognitionRef.current?.stop?.();
    } catch {}
  };

  // envio texto
  const handleSend = async () => {
    if (isBusy) return;
    const msg = inputMessage.trim();
    if (!msg) return;

    try {
      await onSendMessage(msg);
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
      const fallbackMessage = 'Não foi possível enviar a mensagem. Tente novamente.';
      const detail = err instanceof Error && err.message ? err.message : undefined;
      toast.error(detail ? `${fallbackMessage} (${detail})` : fallbackMessage);
    }
  };

  return (
    <motion.div
      ref={wrapperRef}
      className={clsx(
        'relative flex w-full min-h-[68px] items-end gap-3 rounded-[20px] border border-black/10 bg-white/95 px-3 py-2 shadow-[0_18px_40px_rgba(11,18,32,0.06)] backdrop-blur-[14px] transition-[box-shadow,border-color] duration-200 ease-out md:px-4',
        isBusy
          ? 'opacity-90'
          : 'focus-within:border-[rgba(0,122,255,0.32)] focus-within:shadow-[0_22px_48px_rgba(0,122,255,0.2)]',
      )}
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 120, damping: 18 }}
      aria-disabled={isBusy}
      aria-busy={isSending}
      role="group"
      style={{ overflowAnchor: 'none' }}
    >
      <div className="relative flex items-center">
        <button
          type="button"
          onClick={() => {
            if (isBusy) return;
            setShowMoreOptions((prev) => !prev);
          }}
          className={clsx(
            'inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white/70 text-[color:var(--color-text-primary)] transition-all duration-200 backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(0,122,255,0.25)]',
            isBusy ? 'cursor-not-allowed opacity-50' : 'hover:-translate-y-[1px] active:scale-[0.98]',
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

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <AnimatePresence>
          {isRecordingUI && (
            <motion.div
              key="recording-indicator"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.2 }}
              className="inline-flex items-center gap-2 self-start rounded-full border border-[rgba(0,122,255,0.35)] bg-[rgba(0,122,255,0.12)] px-3 py-1 text-xs font-medium text-[color:var(--color-text-primary)] shadow-[0_12px_24px_rgba(0,122,255,0.18)]"
            >
              <span className="flex h-2.5 w-2.5 items-center justify-center">
                <span className="h-2 w-2 rounded-full bg-[color:var(--color-accent)] animate-ping" aria-hidden />
              </span>
              {isTranscribing ? 'Transcrevendo áudio…' : 'Eco está ouvindo…'}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex w-full items-center">
          <textarea
            ref={textareaRef}
            value={inputMessage}
            data-chat-input-textarea
            onChange={(e) => {
              const v = e.target.value;
              setInputMessage(v);
              onTextChange?.(v);
            }}
            onKeyDown={(e) => {
              if (isBusy) {
                e.preventDefault();
                return;
              }
              // @ts-ignore
              const composing = e.nativeEvent?.isComposing;
              if (!composing && e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder={placeholder}
            rows={1}
            inputMode="text"
            enterKeyHint="send"
            maxLength={4000}
            disabled={isBusy}
            aria-disabled={isBusy}
            aria-label="Mensagem para a Eco"
            className="w-full min-w-0 max-h-[9.5rem] min-h-[2.75rem] resize-none border-0 bg-transparent py-2 text-[15px] sm:text-[16px] leading-[1.45] tracking-[-0.01em] text-[color:var(--color-text-primary)] placeholder:text-slate-400 placeholder:opacity-70 focus:outline-none disabled:cursor-not-allowed disabled:text-[rgba(71,85,105,0.55)]"
            title={isBusy ? 'Aguarde a resposta da Eco' : undefined}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (isRecordingUI) {
              stopRecording();
              return;
            }
            void startRecording();
          }}
          disabled={isBusy}
          className={clsx(
            'inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white/70 text-[color:var(--color-text-primary)] transition-all duration-200 backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(0,122,255,0.25)]',
            isRecordingUI
              ? 'border-[rgba(0,122,255,0.45)] bg-[rgba(0,122,255,0.15)] text-[color:var(--color-accent)] animate-pulse'
              : null,
            isBusy ? 'cursor-not-allowed opacity-50 animate-none' : 'hover:-translate-y-[1px] active:scale-[0.98]'
          )}
          aria-label={isRecordingUI ? 'Parar gravação' : 'Iniciar gravação'}
          title={
            isBusy
              ? 'Aguarde a resposta da Eco'
              : isRecordingUI
              ? 'Parar gravação'
              : 'Iniciar gravação'
          }
        >
          <Mic size={18} strokeWidth={1.8} />
        </button>

        <AnimatePresence initial={false}>
          {hasText && (
            <motion.button
              key="send"
              ref={sendButtonRef}
              type="button"
              onClick={() => void handleSend()}
              disabled={isBusy || isRecordingUI || isTranscribing}
              initial={{ opacity: 0, scale: 0.9, x: 8 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: 8 }}
              transition={{ duration: 0.18 }}
              className={clsx(
                'inline-flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--color-accent)] text-white shadow-[0_16px_32px_rgba(0,122,255,0.2)] transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(0,122,255,0.35)] hover:-translate-y-[1px] active:scale-[0.96]',
                isBusy || isRecordingUI || isTranscribing
                  ? 'cursor-not-allowed opacity-70 hover:translate-y-0'
                  : null,
              )}
              aria-label="Enviar mensagem"
              title={
                isBusy || isRecordingUI || isTranscribing
                  ? 'Aguarde a resposta da Eco'
                  : 'Enviar mensagem'
              }
            >
              <Send size={16} strokeWidth={1.6} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default ChatInput;

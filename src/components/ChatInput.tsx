import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, Plus, X, Headphones } from 'lucide-react';

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
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(144, ta.scrollHeight)}px`; // até ~6 linhas
  }, [inputMessage]);

  const onFocus = () => document.body.classList.add('keyboard-open');
  const onBlur = () => document.body.classList.remove('keyboard-open');

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
      className={`
        relative w-full rounded-2xl border border-white/60 bg-white/80 backdrop-blur-xl
        shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition-colors duration-200
        ${
          isBusy
            ? 'opacity-95'
            : 'focus-within:border-blue-200/70 focus-within:shadow-[0_18px_40px_rgba(37,99,235,0.16)]'
        }
      `}
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 120, damping: 18 }}
      aria-disabled={isBusy}
      aria-busy={isSending}
      role="group"
      style={{ overflowAnchor: 'none' }}
    >
      <div className="flex items-end gap-3 px-3 py-2 sm:px-4 sm:py-3">
        <div className="relative flex items-center">
          <button
            type="button"
            onClick={() => {
              if (isBusy) return;
              setShowMoreOptions((prev) => !prev);
            }}
            className={`
              flex h-10 w-10 items-center justify-center rounded-xl border border-white/60 bg-white/90
              text-slate-500 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-blue-200/70 active:scale-[0.98]
              ${isBusy ? 'cursor-not-allowed opacity-60' : ''}
            `}
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
                className="
                  absolute bottom-full left-0 z-50 mb-3 w-52 overflow-hidden rounded-2xl border border-white/60
                  bg-white/80 backdrop-blur-2xl shadow-[0_18px_40px_rgba(15,23,42,0.16)]
                "
              >
                <button
                  type="button"
                  onClick={() => {
                    if (isBusy) return;
                    onMoreOptionSelected('go_to_voice_page');
                    setShowMoreOptions(false);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-white/60"
                >
                  <Headphones size={18} strokeWidth={1.5} />
                  Modo de voz
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <AnimatePresence>
            {isRecordingUI && (
              <motion.div
                key="recording-indicator"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.2 }}
                className="mb-1 flex items-center gap-2 rounded-full bg-blue-50/80 px-3 py-1 text-xs text-blue-600"
              >
                <span className="flex h-2.5 w-2.5 items-center justify-center">
                  <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping" aria-hidden />
                </span>
                {isTranscribing ? 'Transcrevendo áudio…' : 'Eco está ouvindo…'}
              </motion.div>
            )}
          </AnimatePresence>

          <textarea
            ref={textareaRef}
            value={inputMessage}
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
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder={placeholder}
            rows={1}
            inputMode="text"
            enterKeyHint="send"
            maxLength={4000}
            disabled={isBusy}
            aria-disabled={isBusy}
            aria-label="Mensagem para a Eco"
            className="w-full min-w-0 max-h-36 resize-none overflow-y-auto border-none bg-transparent px-1 py-1 text-[15px]
              leading-relaxed text-slate-800 placeholder:text-slate-400 placeholder:font-light focus:outline-none sm:text-base
              disabled:cursor-not-allowed disabled:text-slate-400/90"
            title={isBusy ? 'Aguarde a resposta da Eco' : undefined}
          />
        </div>

        <div className="flex items-center gap-1.5">
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
            className={`
              relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/60 bg-white/90 text-slate-600
              transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200/70
              active:scale-[0.98]
              ${
                isRecordingUI
                  ? 'border-blue-200 bg-blue-100 text-blue-600 animate-pulse'
                  : ''
              }
              ${isBusy ? 'cursor-not-allowed opacity-60 animate-none' : ''}
            `}
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
                className={`
                  flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/30
                  transition hover:bg-blue-500/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200/70
                  active:scale-[0.97] ${isBusy || isRecordingUI || isTranscribing ? 'opacity-70 cursor-not-allowed' : ''}
                `}
                aria-label="Enviar mensagem"
                title={
                  isBusy || isRecordingUI || isTranscribing
                    ? 'Aguarde a resposta da Eco'
                    : 'Enviar mensagem'
                }
              >
                <Send size={17} strokeWidth={1.7} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default ChatInput;

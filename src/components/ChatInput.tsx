import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, Plus, X, Headphones } from 'lucide-react';

type Props = {
  onSendMessage: (t: string) => void;
  onMoreOptionSelected: (k: 'go_to_voice_page') => void;
  onSendAudio?: (b: Blob) => void;
  disabled?: boolean;
  onTextChange?: (text: string) => void;
};

const CTA_TEXT = 'Converse com a Eco…';

const ChatInput: React.FC<Props> = ({
  onSendMessage,
  onMoreOptionSelected,
  onSendAudio,
  disabled = false,
  onTextChange,
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [isRecordingUI, setIsRecordingUI] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const speechRecognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendButtonRef = useRef<HTMLButtonElement>(null);
  const wrapperRef = useRef<HTMLFormElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const safeOnSendAudio = onSendAudio ?? (() => {});

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
    ta.style.height = `${Math.min(192, ta.scrollHeight)}px`; // ~12 linhas máx
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
    if (disabled || isTranscribing || isRecordingUI) return;
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
        setTimeout(() => setIsRecordingUI(false), 1200);
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

  const cancelRecording = () => {
    try {
      if (mediaRecorder?.state === 'recording') mediaRecorder.stop();
      stopTracks(mediaRecorder);
      speechRecognitionRef.current?.abort?.();
    } catch {}
    setIsRecordingUI(false);
    setIsTranscribing(false);
  };

  // envio texto
  const handleSend = () => {
    if (disabled) return;
    const msg = inputMessage.trim();
    if (!msg) return;

    onSendMessage(msg);
    setInputMessage('');
    onTextChange?.('');
    setShowMoreOptions(false);

    sendButtonRef.current?.classList.add('scale-90');
    setTimeout(() => sendButtonRef.current?.classList.remove('scale-90'), 120);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  // --- UI de gravação (fluida, sem max-width)
  if (isRecordingUI) {
    return (
      <div className="relative w-full px-2 py-2">
        <div
          className="
            w-full h-11 mb-2 rounded-3xl
            bg-white/26 backdrop-blur-2xl border border-white/45
            shadow-[0_16px_40px_rgba(16,24,40,0.10),inset_0_1px_0_rgba(255,255,255,0.45)]
            flex items-center justify-center
          "
        >
          {isTranscribing ? (
            <div className="text-gray-700 text-sm flex items-center gap-2">
              <span className="animate-spin w-4 h-4 border-2 border-gray-500/60 border-t-transparent rounded-full" />
              Transcrevendo
            </div>
          ) : (
            <div className="text-gray-800 text-sm flex items-center gap-2">
              <svg className="animate-pulse w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect x="6" y="8" width="2" height="8" fill="currentColor" />
                <rect x="11" y="5" width="2" height="14" fill="currentColor" />
                <rect x="16" y="10" width="2" height="4" fill="currentColor" />
              </svg>
              Ouvindo
            </div>
          )}
        </div>

        <div className="flex justify-between items-center">
          <Plus size={18} className="text-transparent select-none" aria-hidden />
          <div className="flex gap-2">
            <button
              onClick={cancelRecording}
              className="w-9 h-9 rounded-full border border-white/50 bg-white/30 backdrop-blur-xl shadow-sm flex items-center justify-center"
              aria-label="Cancelar"
              type="button"
            >
              <X size={18} />
            </button>
            <button
              onClick={stopRecording}
              className="w-9 h-9 rounded-full border border-white/60 bg-white/80 backdrop-blur-xl shadow-sm flex items-center justify-center"
              aria-label="Confirmar"
              type="button"
            >
              ✓
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- UI padrão (alinhada ao feed)
  return (
    <motion.form
      ref={wrapperRef}
      onSubmit={(e) => {
        e.preventDefault();
        handleSend();
      }}
      className={`
        relative w-full px-3 py-1.5 md:px-4 md:py-2 rounded-[28px]
        border border-white/60 bg-white/80 backdrop-blur-2xl
        shadow-[0_18px_48px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.6)]
        ring-1 ring-white/40 transition-all duration-200 ${disabled ? 'opacity-90' : ''}
      `}
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 120, damping: 14 }}
      aria-disabled={disabled}
      role="group"
      style={{ overflowAnchor: 'none' }}
    >
      {/* === Grid alinhada ao feed: [28px | 1fr | 28px] === */}
      <div className="grid grid-cols-[28px,1fr,28px] items-center gap-2">
        {/* esquerda (28px) */}
        <div className="flex items-center justify-start">
          <button
            type="button"
            onClick={() => setShowMoreOptions((prev) => !prev)}
            className="
              flex h-9 w-9 items-center justify-center rounded-full text-slate-500
              border border-slate-200/70 bg-white bg-gradient-to-b from-white to-slate-100
              shadow-[0_6px_20px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-200
              hover:from-white hover:to-slate-50 hover:scale-[1.04]
              active:scale-95 active:from-white active:to-slate-50
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-200/90
              disabled:opacity-50 disabled:shadow-none
            "
            aria-expanded={showMoreOptions}
            aria-controls="chatinput-popover"
            aria-label="Mais opções"
            disabled={disabled}
          >
            {showMoreOptions ? <X size={18} /> : <Plus size={18} />}
          </button>
        </div>

        {/* Popover */}
        <AnimatePresence>
          {showMoreOptions && !disabled && (
            <motion.div
              ref={popoverRef}
              id="chatinput-popover"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="
                absolute bottom-full left-2 z-50 mb-2 w-56
                rounded-2xl border border-white/60 bg-white/80 backdrop-blur-2xl
                shadow-[0_24px_60px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.6)]
                p-1.5
              "
            >
              <button
                type="button"
                onClick={() => {
                  onMoreOptionSelected('go_to_voice_page');
                  setShowMoreOptions(false);
                }}
                className="flex items-center p-2 hover:bg-white/40 rounded-xl w-full text-left transition"
              >
                <Headphones size={20} className="mr-3" strokeWidth={1.5} />
                Modo de voz
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* centro (1fr) */}
        <div className="flex items-center min-w-0">
          <textarea
            ref={textareaRef}
            value={inputMessage}
            onChange={(e) => {
              const v = e.target.value;
              setInputMessage(v);
              onTextChange?.(v);
            }}
            onKeyDown={(e) => {
              if (disabled) return;
              // @ts-ignore
              const composing = e.nativeEvent?.isComposing;
              if (!composing && e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder={CTA_TEXT}
            rows={1}
            inputMode="text"
            enterKeyHint="send"
            maxLength={4000}
            readOnly={disabled}
            aria-disabled={disabled}
            aria-label="Escreva sua mensagem"
            className="
              w-full min-w-0 max-h-48 resize-none overflow-y-auto border-none bg-transparent py-2 leading-[1.42] tracking-tight
              text-[15px] md:text-base text-slate-800 placeholder:text-slate-400 placeholder:font-light focus:outline-none
            "
          />
        </div>

        {/* direita (28px) */}
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={startRecording}
            disabled={disabled}
            className="
              flex h-9 w-9 items-center justify-center rounded-full text-slate-500
              border border-slate-200/70 bg-white bg-gradient-to-b from-white to-slate-100
              shadow-[0_6px_20px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-200
              hover:from-white hover:to-slate-50 hover:scale-[1.04]
              active:scale-95 active:from-white active:to-slate-50
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-200/90
              disabled:opacity-50 disabled:shadow-none
            "
            aria-label="Iniciar gravação"
          >
            <Mic size={16} />
          </button>

          <button
            type="submit"
            ref={sendButtonRef}
            disabled={disabled || !inputMessage.trim()}
            className="
              flex h-9 w-9 items-center justify-center rounded-full text-slate-500
              border border-slate-200/70 bg-white bg-gradient-to-b from-white/95 via-violet-100/60 to-slate-100/70
              shadow-[0_6px_20px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-200
              hover:from-white hover:via-violet-100/60 hover:to-violet-100/70 hover:scale-[1.05]
              active:scale-95 active:from-white active:via-violet-50/70 active:to-slate-50/60
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-200
              disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none
            "
            aria-label="Enviar mensagem"
          >
            <Send size={16} strokeWidth={1.4} />
          </button>
        </div>
      </div>
    </motion.form>
  );
};

export default ChatInput;

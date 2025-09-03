import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, Plus, X, BookOpen, Headphones } from 'lucide-react';

type Props = {
  onSendMessage: (t: string) => void;
  onMoreOptionSelected: (k: 'save_memory' | 'go_to_voice_page') => void;
  onSendAudio?: (b: Blob) => void;         // opcional (default no-op)
  disabled?: boolean;                      // controla UI durante envio
};

const ChatInput: React.FC<Props> = ({
  onSendMessage,
  onMoreOptionSelected,
  onSendAudio,
  disabled = false,
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

  const safeOnSendAudio = onSendAudio ?? (() => {});

  // ----- Ajuste de altura da barra (grava em --input-h) -----
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const setH = () =>
      document.documentElement.style.setProperty('--input-h', `${el.offsetHeight}px`);

    setH();
    const ro = new ResizeObserver(setH);
    ro.observe(el);

    // VisualViewport ajuda no iOS ao abrir teclado
    const vv = (window as any).visualViewport as VisualViewport | undefined;
    const handleVV = () => setTimeout(setH, 0);
    vv?.addEventListener('resize', handleVV);
    vv?.addEventListener('scroll', handleVV);

    return () => {
      ro.disconnect();
      vv?.removeEventListener('resize', handleVV);
      vv?.removeEventListener('scroll', handleVV);
    };
  }, []);

  // Auto-resize do textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = '0px';
    ta.style.height = `${Math.min(192, ta.scrollHeight)}px`; // máx ~12 linhas
  }, [inputMessage]);

  // Evita zoom ao focar e ativa classe p/ CSS tratar teclado
  const onFocus = () => document.body.classList.add('keyboard-open');
  const onBlur = () => document.body.classList.remove('keyboard-open');

  // Webkit Speech
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
          setInputMessage((prev) => (prev ? prev + ' ' : '') + finalTranscript);
        }
      };
      recognition.onerror = (e: any) => console.error('Erro no reconhecimento de fala:', e.error);
      speechRecognitionRef.current = recognition;
    }

    // Cleanup: para qualquer captura ativa ao desmontar
    return () => {
      try {
        speechRecognitionRef.current?.abort?.();
      } catch {}
    };
  }, []);

  // Helpers de mídia
  const stopTracks = (rec: MediaRecorder | null) => {
    try {
      rec?.stream?.getTracks()?.forEach((t) => t.stop());
    } catch {}
  };

  // Gravação
  const startRecording = async () => {
    if (disabled || isTranscribing || isRecordingUI) return;
    setIsRecordingUI(true);
    setIsTranscribing(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Escolhe tipo suportado
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
        // evita start duplo
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
    // não zera o texto digitado; apenas fecha UI de gravação
    setIsRecordingUI(false);
    setIsTranscribing(false);
  };

  // Cleanup de mídia ao desmontar
  useEffect(() => {
    return () => {
      try {
        if (mediaRecorder?.state === 'recording') mediaRecorder.stop();
        stopTracks(mediaRecorder);
        speechRecognitionRef.current?.abort?.();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Envio texto
  const handleSend = () => {
    if (disabled) return;
    if (!inputMessage.trim()) return;

    onSendMessage(inputMessage.trim());
    setInputMessage('');
    setShowMoreOptions(false);

    // feedback leve
    sendButtonRef.current?.classList.add('scale-90');
    setTimeout(() => sendButtonRef.current?.classList.remove('scale-90'), 120);

    // mantém foco no textarea (útil no desktop)
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  // ---------- UI de gravação ----------
  if (isRecordingUI) {
    return (
      <div className="relative bg-white border border-gray-200 rounded-2xl px-4 py-2 w-full max-w-2xl mx-auto">
        <div className="w-full h-10 mb-2 rounded-xl bg-gray-100 flex items-center justify-center">
          {isTranscribing ? (
            <div className="text-gray-400 text-sm flex items-center gap-2">
              <span className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full" />
              Transcrevendo
            </div>
          ) : (
            <div className="text-gray-500 text-sm flex items-center gap-2">
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
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
              aria-label="Cancelar"
            >
              <X size={18} className="text-gray-700" />
            </button>
            <button
              onClick={stopRecording}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
              aria-label="Confirmar"
            >
              ✓
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- UI padrão ----------
  return (
    <motion.form
      ref={wrapperRef}
      onSubmit={(e) => {
        e.preventDefault();
        handleSend();
      }}
      className={`relative bg-white rounded-xl px-3 py-1.5 border border-gray-100 w-full max-w-2xl mx-auto shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-all duration-200 ${disabled ? 'opacity-90' : ''}`}
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 120, damping: 14 }}
      aria-disabled={disabled}
    >
      <div className="flex items-center gap-2">
        {/* Botão + */}
        <button
          type="button"
          onClick={() => setShowMoreOptions((prev) => !prev)}
          className="shrink-0 p-1.5 rounded-full text-gray-500 hover:bg-gray-100 focus:outline-none disabled:opacity-50"
          aria-label="Mais opções"
          disabled={disabled}
        >
          {showMoreOptions ? <X size={18} /> : <Plus size={18} />}
        </button>

        {/* Popover */}
        <AnimatePresence>
          {showMoreOptions && !disabled && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-full mb-2 left-4 w-56 bg-white rounded-xl shadow-xl p-2 z-50"
            >
              <button
                type="button"
                onClick={() => {
                  onMoreOptionSelected('save_memory');
                  setShowMoreOptions(false);
                }}
                className="flex items-center p-2 text-gray-800 hover:bg-gray-100 rounded-lg w-full text-left"
              >
                <BookOpen size={20} className="mr-3" strokeWidth={1.5} />
                Registro de memória
              </button>
              <button
                type="button"
                onClick={() => {
                  onMoreOptionSelected('go_to_voice_page');
                  setShowMoreOptions(false);
                }}
                className="flex items-center p-2 text-gray-800 hover:bg-gray-100 rounded-lg mt-1 w-full text-left"
              >
                <Headphones size={20} className="mr-3" strokeWidth={1.5} />
                Modo de voz
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder="Fale com a Eco"
          rows={1}
          inputMode="text"
          enterKeyHint="send"
          maxLength={4000}
          readOnly={disabled}
          aria-disabled={disabled}
          className="min-w-0 flex-1 text-sm text-gray-800 placeholder:text-gray-400 bg-transparent border-none focus:outline-none resize-none leading-6 py-2 max-h-48 overflow-y-auto"
        />

        {/* Botões mic e send */}
        <div className="flex gap-1.5 shrink-0">
          <button
            type="button"
            onClick={startRecording}
            disabled={disabled}
            className="w-8 h-8 rounded-full bg-transparent border border-white hover:border-white shadow-sm flex items-center justify-center disabled:opacity-50"
            aria-label="Iniciar gravação"
          >
            <Mic size={16} className="text-[#1F2937]" />
          </button>

          <button
            type="submit"
            ref={sendButtonRef}
            disabled={disabled || !inputMessage.trim()}
            className="w-8 h-8 rounded-full bg-[#265F77] hover:bg-[#1f4c60] shadow-sm flex items-center justify-center transition-transform disabled:opacity-50"
            aria-label="Enviar mensagem"
          >
            <Send size={16} className="text-white" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </motion.form>
  );
};

export default ChatInput;

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Check, Pause, Play, X } from 'lucide-react';
import clsx from 'clsx';

import useVoiceRecorder from '../../hooks/useVoiceRecorder';

const BAR_COUNT = 14;

interface VoiceInputInlineProps {
  /** Recebe a transcrição ao vivo (final + interim) para refletir no campo. */
  onTranscriptChange?: (text: string) => void;
  /** Confirma a gravação; entrega a transcrição final consolidada. */
  onConfirm: (transcript: string) => void;
  /** Cancela e descarta a gravação. */
  onCancel: () => void;
  onError?: (error: Error) => void;
  className?: string;
}

const VoiceInputInline: React.FC<VoiceInputInlineProps> = ({
  onTranscriptChange,
  onConfirm,
  onCancel,
  onError,
  className,
}) => {
  const {
    status,
    formattedTime,
    transcript,
    interimTranscript,
    errorMessage,
    isSpeechSupported,
    start,
    stop,
    cancel,
    togglePause,
  } = useVoiceRecorder({ onError });

  const startedRef = useRef(false);
  const busyRef = useRef(false);

  // Inicia a gravação assim que o controle aparece (só se houver transcrição disponível).
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (isSpeechSupported) {
      void start();
    }
  }, [isSpeechSupported, start]);

  // Reflete a transcrição ao vivo no campo de texto.
  useEffect(() => {
    if (!onTranscriptChange) return;
    const live = `${transcript} ${interimTranscript}`.replace(/\s+/g, ' ').trim();
    onTranscriptChange(live);
  }, [transcript, interimTranscript, onTranscriptChange]);

  const isRecording = status === 'recording';
  const isPaused = status === 'paused';
  const isStopping = status === 'stopping';

  const handleConfirm = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    const result = await stop();
    onConfirm(result.transcript);
  };

  const handleCancel = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    await cancel();
    onCancel();
  };

  const statusLabel = errorMessage
    ? 'Erro'
    : isPaused
      ? 'Pausado'
      : isStopping
        ? 'Finalizando'
        : 'Ouvindo';

  // Navegador sem reconhecimento de fala (ex.: Safari/iOS): aviso honesto + fechar.
  if (!isSpeechSupported) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        role="alert"
        className={clsx(
          'flex w-full items-center gap-3 rounded-full border border-eco-line/60 bg-eco-babySoft/70 px-4 py-2 backdrop-blur-md',
          className,
        )}
      >
        <span className="flex-1 text-[13px] leading-snug text-slate-600">
          Transcrição de voz indisponível neste navegador. Tente pelo Chrome.
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/70 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          aria-label="Fechar"
          title="Fechar"
        >
          <X size={17} strokeWidth={2.2} />
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      role="group"
      aria-label="Gravação de voz"
      className={clsx(
        'flex w-full min-w-0 max-w-full items-center gap-2 rounded-full border border-eco-line/60 bg-eco-babySoft/70 px-3 py-1.5 backdrop-blur-md',
        className,
      )}
    >
      {/* Indicador de estado */}
      <span className="flex shrink-0 items-center gap-2 pl-1">
        <span className="relative flex h-2.5 w-2.5">
          {isRecording && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-eco-baby/60" />
          )}
          <span
            className={clsx(
              'relative inline-flex h-2.5 w-2.5 rounded-full',
              isRecording ? 'bg-eco-babyDark' : 'bg-slate-400',
            )}
          />
        </span>
        <span className="hidden text-[11px] font-medium uppercase tracking-[0.16em] text-eco-babyDark/80 sm:inline">
          {statusLabel}
        </span>
      </span>

      {/* Onda de frequência */}
      <div className="flex min-w-0 flex-1 items-center justify-center gap-[3px] overflow-hidden" aria-hidden>
        {Array.from({ length: BAR_COUNT }).map((_, i) => (
          <motion.span
            key={i}
            className="w-[3px] rounded-full bg-eco-baby"
            initial={{ height: 3 }}
            animate={{
              height: isRecording ? [3, 6 + Math.random() * 16, 4 + Math.random() * 8, 3] : 3,
              opacity: isRecording ? 1 : 0.5,
            }}
            transition={{
              duration: isRecording ? 1 : 0.3,
              repeat: isRecording ? Infinity : 0,
              delay: isRecording ? i * 0.06 : 0,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Timer */}
      <span className="min-w-[44px] shrink-0 text-center text-[13px] font-medium tabular-nums text-eco-babyDark">
        {formattedTime}
      </span>

      {/* Ações */}
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={togglePause}
          disabled={isStopping || !!errorMessage}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-eco-babyDark transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eco-baby/40 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={isPaused ? 'Retomar gravação' : 'Pausar gravação'}
          title={isPaused ? 'Retomar' : 'Pausar'}
        >
          {isPaused ? <Play size={16} strokeWidth={2} /> : <Pause size={16} strokeWidth={2} />}
        </button>

        <button
          type="button"
          onClick={handleCancel}
          disabled={isStopping}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/70 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Cancelar gravação"
          title="Cancelar"
        >
          <X size={17} strokeWidth={2.2} />
        </button>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={isStopping}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-eco-baby to-eco-babyDark text-white shadow-md transition hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eco-baby/50 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Confirmar gravação"
          title="Confirmar"
        >
          <Check size={17} strokeWidth={2.4} />
        </button>
      </div>
    </motion.div>
  );
};

export default VoiceInputInline;

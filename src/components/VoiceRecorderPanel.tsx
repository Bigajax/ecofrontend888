import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Mic, Pause, Play, X, Check } from 'lucide-react';
import clsx from 'clsx';

const DEFAULT_BOTTOM_OFFSET = 120;

const SpeechRecognitionImpl: any =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : undefined;

type RecordingStatus = 'idle' | 'recording' | 'paused' | 'stopping';

type VoiceRecorderPanelProps = {
  open: boolean;
  bottomOffset?: number;
  onCancel: () => void;
  onConfirm: (payload: { audioBlob: Blob | null; transcript: string }) => void;
  onError?: (error: Error) => void;
};

const formatTime = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const VoiceRecorderPanel: React.FC<VoiceRecorderPanelProps> = ({
  open,
  bottomOffset = DEFAULT_BOTTOM_OFFSET,
  onCancel,
  onConfirm,
  onError,
}) => {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const destroyRecognition = useCallback(() => {
    try {
      recognitionRef.current?.stop?.();
    } catch {}
    recognitionRef.current = null;
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop());
      } catch {}
      streamRef.current = null;
    }
  }, []);

  const startRecognition = useCallback(() => {
    if (!SpeechRecognitionImpl) return;
    try {
      const instance = new SpeechRecognitionImpl();
      instance.lang = 'pt-BR';
      instance.continuous = true;
      instance.interimResults = true;
      instance.onresult = (event: any) => {
        let finalText = '';
        let interimText = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          if (result.isFinal) {
            finalText += result[0].transcript;
          } else {
            interimText += result[0].transcript;
          }
        }
        if (finalText.trim()) {
          setTranscript((prev) =>
            `${prev} ${finalText}`.replace(/\s+/g, ' ').trim(),
          );
        }
        setInterimTranscript(interimText.trim());
      };
      instance.onerror = (event: any) => {
        console.error('Speech recognition error', event?.error);
      };
      instance.start();
      recognitionRef.current = instance;
    } catch (err) {
      console.error('Erro ao iniciar reconhecimento de fala', err);
    }
  }, []);

  const finalizeRecording = useCallback(async (): Promise<Blob | null> => {
    const recorder = recorderRef.current;

    const finish = () => {
      recorderRef.current = null;
      const type = recorder?.mimeType || 'audio/webm';
      const blob =
        chunksRef.current.length > 0 ? new Blob(chunksRef.current, { type }) : null;
      chunksRef.current = [];
      destroyRecognition();
      stopStream();
      return blob;
    };

    if (!recorder) {
      return finish();
    }

    if (recorder.state === 'inactive') {
      return finish();
    }

    return await new Promise<Blob | null>((resolve) => {
      const handleStop = () => {
        recorder.removeEventListener('stop', handleStop as EventListener);
        resolve(finish());
      };
      recorder.addEventListener('stop', handleStop as EventListener);
      try {
        recorder.stop();
      } catch {
        resolve(finish());
      }
    });
  }, [destroyRecognition, stopStream]);

  const handleCancel = useCallback(async () => {
    if (status === 'stopping') return;
    setStatus('stopping');
    await finalizeRecording();
    setStatus('idle');
    setSeconds(0);
    setTranscript('');
    setInterimTranscript('');
    setErrorMessage(null);
    onCancel();
  }, [finalizeRecording, onCancel, status]);

  const handleConfirm = useCallback(async () => {
    if (status === 'stopping') return;
    setStatus('stopping');
    const blob = await finalizeRecording();
    const fullTranscript = `${transcript} ${interimTranscript}`.replace(/\s+/g, ' ').trim();
    setStatus('idle');
    setSeconds(0);
    setTranscript('');
    setInterimTranscript('');
    setErrorMessage(null);
    onConfirm({ audioBlob: blob, transcript: fullTranscript });
  }, [finalizeRecording, interimTranscript, onConfirm, status, transcript]);

  const togglePause = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || status === 'stopping') return;

    if (status === 'recording') {
      try {
        if (recorder.state === 'recording') {
          recorder.pause();
        }
      } catch {}
      destroyRecognition();
      setStatus('paused');
    } else if (status === 'paused') {
      try {
        recorder.resume();
        startRecognition();
        setStatus('recording');
      } catch (err) {
        console.error('Erro ao retomar gravação', err);
      }
    }
  }, [destroyRecognition, startRecognition, status]);

  const startRecording = useCallback(async () => {
    if (status === 'recording' || status === 'stopping') return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType =
        (window as any).MediaRecorder?.isTypeSupported?.('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data?.size) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.start();
      setStatus('recording');
      startRecognition();
    } catch (err) {
      console.error('Erro ao acessar o microfone', err);
      const message =
        err instanceof Error
          ? err.message
          : 'Não foi possível acessar o microfone.';
      setErrorMessage(message);
      setStatus('idle');
      onError?.(err as Error);
    }
  }, [onError, startRecognition, status]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setSeconds(0);
    setTranscript('');
    setInterimTranscript('');
    setErrorMessage(null);
    void startRecording();

    return () => {
      destroyRecognition();
      stopStream();
      recorderRef.current = null;
      chunksRef.current = [];
      setStatus('idle');
    };
  }, [destroyRecognition, open, startRecording, stopStream]);

  useEffect(() => {
    if (!open || status !== 'recording') return;
    const interval = window.setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [open, status]);

  useEffect(() => {
    if (!open) return;
    return () => {
      destroyRecognition();
      stopStream();
    };
  }, [destroyRecognition, open, stopStream]);

  const formattedTime = useMemo(() => formatTime(seconds), [seconds]);
  const isActionDisabled = status === 'stopping' || !!errorMessage;

  const stateLabel = useMemo(() => {
    if (errorMessage) return 'Erro';
    if (status === 'paused') return 'Pausado';
    if (status === 'recording') return 'Gravando';
    if (status === 'stopping') return 'Finalizando';
    return 'Pronto';
  }, [errorMessage, status]);

  const transcriptPreview = useMemo(() => {
    if (!transcript && !interimTranscript) return '';
    return `${transcript} ${interimTranscript}`.replace(/\s+/g, ' ').trim();
  }, [interimTranscript, transcript]);

  const waveformBars = useMemo(() => {
    const animated = status === 'recording' && !errorMessage;
    return (
      <span className="flex h-6 items-end gap-[3px]" aria-hidden>
        {Array.from({ length: 5 }).map((_, index) => (
          <motion.span
            key={index}
            className="w-[3px] rounded-full bg-slate-400/80"
            animate={
              animated
                ? {
                    height: [8, 16 + index * 3, 10],
                    opacity: [0.45, 1, 0.55],
                  }
                : {
                    height: 10 + index * 2,
                    opacity: 0.65,
                  }
            }
            transition={{
              repeat: animated ? Infinity : 0,
              duration: animated ? 1 + index * 0.12 : 0.2,
              ease: 'easeInOut',
              delay: animated ? index * 0.08 : 0,
            }}
          />
        ))}
      </span>
    );
  }, [errorMessage, status]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 28 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed left-1/2 z-[60] w-[min(360px,calc(100vw-28px))] -translate-x-1/2"
          style={{ bottom: `${Math.max(bottomOffset, 56)}px` }}
          role="dialog"
          aria-modal="true"
          aria-live="assertive"
        >
          <div
            className={clsx(
              'rounded-3xl border border-white/70 bg-white/80 p-3 shadow-[0_20px_48px_rgba(15,23,42,0.2)] backdrop-blur-2xl',
              'dark:bg-white/85',
            )}
          >
            <div className="flex items-center justify-between px-1 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
              <span>{stateLabel}</span>
              <span className="tabular-nums text-[12px] tracking-[0.08em] text-slate-600">{formattedTime}</span>
            </div>

            <div
              className={clsx(
                'mt-2 flex items-center gap-3 rounded-full border border-slate-200/60 bg-white/90 px-3 py-2.5 shadow-[0_18px_38px_rgba(15,23,42,0.12)] transition focus-within:border-slate-300 focus-within:shadow-[0_26px_52px_rgba(15,23,42,0.18)]',
                errorMessage ? 'border-red-200/70 bg-red-50/80' : null,
              )}
            >
              <button
                type="button"
                onClick={togglePause}
                disabled={isActionDisabled || !!errorMessage}
                className={clsx(
                  'flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/70 bg-white/95 text-slate-600 shadow-[0_12px_20px_rgba(15,23,42,0.08)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(0,122,255,0.28)]',
                  isActionDisabled || errorMessage
                    ? 'cursor-not-allowed opacity-50 shadow-none'
                    : 'hover:-translate-y-[1px] hover:shadow-[0_16px_30px_rgba(15,23,42,0.14)]',
                )}
                aria-label={status === 'paused' ? 'Retomar gravação' : 'Pausar gravação'}
                title={status === 'paused' ? 'Retomar gravação' : 'Pausar gravação'}
              >
                {status === 'paused' ? (
                  <Play size={16} strokeWidth={2} />
                ) : (
                  <Pause size={16} strokeWidth={2} />
                )}
              </button>

              <div className="flex min-w-0 flex-1 flex-col gap-1 text-left">
                {errorMessage ? (
                  <p className="text-sm font-medium text-red-600">{errorMessage}</p>
                ) : (
                  <div className="flex items-center gap-3">
                    {status === 'recording' ? (
                      waveformBars
                    ) : status === 'paused' ? (
                      <Mic size={18} strokeWidth={1.7} className="text-slate-400" />
                    ) : (
                      <Mic size={18} strokeWidth={1.7} className="text-slate-400" />
                    )}
                    <p
                      className={clsx(
                        'min-w-0 flex-1 text-sm text-slate-600',
                        transcriptPreview ? 'line-clamp-1' : 'italic text-slate-400',
                      )}
                    >
                      {transcriptPreview || 'Transcrevendo sua mensagem…'}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(15,23,42,0.22)]"
                  aria-label="Cancelar gravação"
                >
                  <X size={18} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isActionDisabled}
                  className={clsx(
                    'flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--color-accent)] text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(0,122,255,0.32)]',
                    isActionDisabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-[#0f6fe0]'
                  )}
                  aria-label="Confirmar transcrição"
                >
                  <Check size={18} strokeWidth={2} />
                </button>
              </div>
            </div>

            {transcriptPreview && !errorMessage && (
              <p className="mt-2 line-clamp-3 px-1 text-xs text-slate-500">
                {transcriptPreview}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VoiceRecorderPanel;

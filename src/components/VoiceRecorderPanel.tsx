import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed left-1/2 z-[60] w-[min(320px,calc(100vw-32px))] -translate-x-1/2"
          style={{ bottom: `${Math.max(bottomOffset, 48)}px` }}
          role="dialog"
          aria-modal="true"
          aria-live="assertive"
        >
          <div
            className={clsx(
              'rounded-2xl border border-white/60 bg-white/70 p-4 backdrop-blur-xl',
              'dark:bg-white/80',
            )}
          >
            <div className="mb-3 flex items-center justify-between text-[13px] font-medium text-slate-700">
              <span className="uppercase tracking-[0.18em] text-slate-500">{stateLabel}</span>
              <span className="tabular-nums text-[15px] text-slate-900">{formattedTime}</span>
            </div>

            <div className="mb-4 flex h-32 items-center justify-center rounded-xl bg-gradient-to-br from-white/70 via-white/50 to-white/70 text-slate-500">
              <span className="text-sm font-medium tracking-[0.3em] text-slate-400">●●●</span>
              <span className="sr-only">Visualização de áudio</span>
            </div>

            <div className="mb-4 min-h-[3rem] rounded-xl bg-white/80 px-3 py-2 text-sm text-slate-700">
              {errorMessage ? (
                <p>{errorMessage}</p>
              ) : (
                <p>
                  {transcript || interimTranscript
                    ? (
                        <span>
                          {transcript}
                          {interimTranscript && (
                            <span className="text-slate-400"> {interimTranscript}</span>
                          )}
                        </span>
                      )
                    : 'A gravação será transcrita aqui…'}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 text-sm font-medium">
              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-slate-700 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(15,23,42,0.18)]"
              >
                <span aria-hidden>❌</span>
                Cancelar
              </button>
              <button
                type="button"
                onClick={togglePause}
                disabled={isActionDisabled || !!errorMessage}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-slate-700 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(15,23,42,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span aria-hidden>{status === 'paused' ? '▶️' : '⏸'}</span>
                {status === 'paused' ? 'Retomar' : 'Pausar'}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isActionDisabled}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[color:var(--color-accent)] px-3 py-2 text-white transition hover:bg-[#0f6fe0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(0,122,255,0.35)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span aria-hidden>✅</span>
                Confirmar
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VoiceRecorderPanel;

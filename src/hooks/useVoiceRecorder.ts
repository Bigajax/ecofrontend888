/* eslint-disable @typescript-eslint/no-explicit-any -- Web Speech API não possui tipos nativos */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const SpeechRecognitionImpl: any =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : undefined;

export type VoiceRecorderStatus = 'idle' | 'recording' | 'paused' | 'stopping';

export interface VoiceRecorderResult {
  audioBlob: Blob | null;
  transcript: string;
}

export const formatRecorderTime = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
};

export interface UseVoiceRecorderOptions {
  onError?: (error: Error) => void;
}

/**
 * Encapsula a gravação de voz: MediaRecorder (áudio) + Web Speech API (transcrição
 * ao vivo em pt-BR), com timer, pausa/retomada e finalização limpa.
 *
 * Extraído do antigo VoiceRecorderPanel para ser reutilizado pela UI inline.
 */
export function useVoiceRecorder({ onError }: UseVoiceRecorderOptions = {}) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const [status, setStatus] = useState<VoiceRecorderStatus>('idle');
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSpeechSupported = useMemo(() => !!SpeechRecognitionImpl, []);

  const destroyRecognition = useCallback(() => {
    try {
      recognitionRef.current?.stop?.();
    } catch {
      /* noop */
    }
    recognitionRef.current = null;
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop());
      } catch {
        /* noop */
      }
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
          setTranscript((prev) => `${prev} ${finalText}`.replace(/\s+/g, ' ').trim());
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

  const reset = useCallback(() => {
    setStatus('idle');
    setSeconds(0);
    setTranscript('');
    setInterimTranscript('');
    setErrorMessage(null);
  }, []);

  const start = useCallback(async () => {
    if (status === 'recording' || status === 'stopping') return;
    setSeconds(0);
    setTranscript('');
    setInterimTranscript('');
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = (window as any).MediaRecorder?.isTypeSupported?.('audio/webm')
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
        err instanceof Error ? err.message : 'Não foi possível acessar o microfone.';
      setErrorMessage(message);
      setStatus('idle');
      onError?.(err as Error);
    }
  }, [onError, startRecognition, status]);

  const stop = useCallback(async (): Promise<VoiceRecorderResult> => {
    if (status === 'stopping') {
      return { audioBlob: null, transcript: '' };
    }
    setStatus('stopping');
    const blob = await finalizeRecording();
    const fullTranscript = `${transcript} ${interimTranscript}`.replace(/\s+/g, ' ').trim();
    reset();
    return { audioBlob: blob, transcript: fullTranscript };
  }, [finalizeRecording, interimTranscript, reset, status, transcript]);

  const cancel = useCallback(async () => {
    if (status === 'stopping') return;
    setStatus('stopping');
    await finalizeRecording();
    reset();
  }, [finalizeRecording, reset, status]);

  const togglePause = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || status === 'stopping') return;

    if (status === 'recording') {
      try {
        if (recorder.state === 'recording') {
          recorder.pause();
        }
      } catch {
        /* noop */
      }
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

  // Timer
  useEffect(() => {
    if (status !== 'recording') return;
    const interval = window.setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [status]);

  // Limpeza no unmount
  useEffect(() => {
    return () => {
      destroyRecognition();
      stopStream();
      recorderRef.current = null;
      chunksRef.current = [];
    };
  }, [destroyRecognition, stopStream]);

  const formattedTime = useMemo(() => formatRecorderTime(seconds), [seconds]);

  return {
    status,
    seconds,
    formattedTime,
    transcript,
    interimTranscript,
    errorMessage,
    isSpeechSupported,
    start,
    stop,
    cancel,
    togglePause,
  } as const;
}

export default useVoiceRecorder;

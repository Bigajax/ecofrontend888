import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Preview de áudio com corte — usado no card "Noite 2 · A seguir" da oferta do
 * sono (provar o produto vende mais que descrever). Cria um <audio> interno com
 * preload='none' (só baixa no 1º play) e corta em `capSeconds`, com fade de
 * volume nos últimos segundos (iOS ignora volume programático → hard stop lá,
 * aceitável). Replay permitido: um novo play após o corte recomeça do zero.
 */
const FADE_SECONDS = 4;

export interface AudioPreview {
  /** Tocando agora. */
  playing: boolean;
  /** Progresso 0–1 relativo ao corte (não à duração total do arquivo). */
  progress: number;
  /** Atingiu o corte ao menos uma vez nesta montagem. */
  done: boolean;
  /** Play/pause. Chamar dentro do gesto do usuário (autoplay policy). */
  toggle: () => void;
  /** Pausa imediatamente (ex.: navegação interna). */
  stop: () => void;
}

export function useAudioPreview(audioUrl: string, capSeconds: number): AudioPreview {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const capRef = useRef(capSeconds);
  capRef.current = capSeconds;

  // Elemento sob demanda — nada de rede até o primeiro play.
  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const el = new Audio();
      el.preload = 'none';
      el.src = audioUrl;
      audioRef.current = el;
    }
    return audioRef.current;
  }, [audioUrl]);

  // Listeners de progresso/corte — anexados uma vez ao elemento lazy.
  useEffect(() => {
    const el = audioRef.current;
    void el; // efeito só de cleanup: o elemento nasce no toggle (gesto)
    return () => {
      const a = audioRef.current;
      if (a) {
        a.pause();
        a.src = '';
        audioRef.current = null;
      }
    };
  }, [audioUrl]);

  const stop = useCallback(() => {
    const a = audioRef.current;
    if (a && !a.paused) a.pause();
    setPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    const a = getAudio();

    if (!a.paused) {
      a.pause();
      setPlaying(false);
      return;
    }

    // Replay pós-corte recomeça do zero (e restaura o volume do fade).
    if (a.currentTime >= capRef.current) a.currentTime = 0;
    a.volume = 1;

    const onTime = () => {
      const cap = capRef.current;
      const t = a.currentTime;
      setProgress(Math.min(1, t / cap));
      // Fade honesto na reta final (no iOS o volume é read-only — hard stop).
      const remaining = cap - t;
      if (remaining <= FADE_SECONDS) {
        try {
          a.volume = Math.max(0, remaining / FADE_SECONDS);
        } catch {
          /* iOS */
        }
      }
      if (t >= cap) {
        a.pause();
        a.removeEventListener('timeupdate', onTime);
        setPlaying(false);
        setDone(true);
        setProgress(1);
      }
    };
    const onPauseOrEnd = () => {
      a.removeEventListener('timeupdate', onTime);
      setPlaying(false);
    };

    a.addEventListener('timeupdate', onTime);
    a.addEventListener('pause', onPauseOrEnd, { once: true });
    a.addEventListener('ended', onPauseOrEnd, { once: true });

    a.play()
      .then(() => setPlaying(true))
      .catch(() => {
        a.removeEventListener('timeupdate', onTime);
        setPlaying(false);
      });
  }, [getAudio]);

  return { playing, progress, done, toggle, stop };
}

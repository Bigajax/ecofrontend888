import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import AudioPlayerOverlay from '@/components/AudioPlayerOverlay';
import { prepareAudioStreamUrl, gerarAudioDaMensagem, warmupVoiceBackend } from '@/api/voiceApi';
import type { DailyMaxim } from '@/utils/diarioEstoico/getTodayMaxim';
import { buildReflectionSpeechFromMaxim } from '@/utils/diarioEstoico/reflectionSpeech';
import mixpanel from '@/lib/mixpanel';

type AudioOverlayState = {
  id: number;
  url: string;
  audio: HTMLAudioElement;
  needsManualStart: boolean;
};

/**
 * Hook reutilizável para tocar uma reflexão do Diário em áudio (TTS — mesma voz da ECO
 * usada no chat). Reaproveita prepareAudioStreamUrl (streaming) com fallback buffered,
 * e o AudioPlayerOverlay. Retorna o nó do player pronto para renderizar.
 *
 * Uso:
 *   const { toggle, isPlaying, loading, overlayNode } = useReflectionAudio();
 *   <button onClick={() => toggle(maxim)} /> ... {overlayNode}
 */
export function useReflectionAudio(source = 'diario') {
  const [audioOverlay, setAudioOverlay] = useState<AudioOverlayState | null>(null);
  const [loading, setLoading] = useState(false);
  const isPlaying = !!audioOverlay;

  const disposeAudioSession = useCallback((session?: AudioOverlayState | null) => {
    if (!session) return;
    try { session.audio.pause(); } catch {}
    try { session.audio.currentTime = 0; } catch {}
    try { session.audio.src = ''; } catch {}
    if (session.url.startsWith('blob:')) {
      try { URL.revokeObjectURL(session.url); } catch {}
    }
  }, []);

  const stop = useCallback(() => {
    setAudioOverlay((prev) => {
      if (prev) disposeAudioSession(prev);
      return null;
    });
  }, [disposeAudioSession]);

  // limpa o áudio ao desmontar
  useEffect(() => () => disposeAudioSession(audioOverlay), [audioOverlay, disposeAudioSession]);

  // Acorda o backend (Render free hiberna) assim que a tela com TTS aparece,
  // para o 1º clique em "Ouvir" não cair no cold-start.
  useEffect(() => { warmupVoiceBackend(); }, []);

  const play = useCallback(async (maxim: DailyMaxim, meta?: Record<string, unknown>, textOverride?: string) => {
    if (loading) return;
    setLoading(true);
    stop();

    try {
      mixpanel.track('Diário · Áudio tocado', {
        day_number: maxim.dayNumber,
        month: maxim.month,
        source,
        ...meta,
      });
    } catch {}

    try {
      // textOverride: usado para ler só uma prévia (ex.: 40% no modo guest).
      const texto = textOverride && textOverride.trim() ? textOverride.trim() : buildReflectionSpeechFromMaxim(maxim);

      // Streaming progressivo; cai para o buffered (data URL) se o prepare/stream falhar.
      let mediaUrl: string;
      try {
        mediaUrl = await prepareAudioStreamUrl(texto);
      } catch (prepErr) {
        console.warn('[TTS] prepare/stream indisponível, usando fallback buffered:', prepErr);
        mediaUrl = await gerarAudioDaMensagem(texto);
      }

      const audioEl = new Audio();
      audioEl.src = mediaUrl;
      audioEl.preload = 'auto';
      audioEl.autoplay = false;
      audioEl.playsInline = true;
      audioEl.loop = false;
      audioEl.muted = true;
      try { audioEl.load(); } catch {}

      let needsManualStart = false;
      try {
        const playPromise = audioEl.play();
        if (playPromise) await playPromise;
        if (typeof window !== 'undefined') {
          window.setTimeout(() => { try { audioEl.muted = false; } catch {} }, 120);
        } else {
          audioEl.muted = false;
        }
      } catch {
        needsManualStart = true;
        try { audioEl.pause(); } catch {}
        try { audioEl.currentTime = 0; } catch {}
        try { audioEl.muted = false; } catch {}
      }

      setAudioOverlay({ id: Date.now(), url: mediaUrl, audio: audioEl, needsManualStart });
    } catch (error) {
      console.error('Erro ao gerar áudio da reflexão:', error);
      const msg = String((error as any)?.message || error);
      const isNetwork = /failed to fetch|networkerror|load failed|aborted|timeout/i.test(msg);
      // Acorda o backend para a próxima tentativa já encontrá-lo de pé.
      warmupVoiceBackend();
      toast.error(
        isNetwork
          ? 'O servidor de voz está acordando. Tente de novo em alguns segundos.'
          : 'Não consegui gerar o áudio agora. Tente novamente.',
        { duration: 4000 },
      );
    } finally {
      setLoading(false);
    }
  }, [loading, stop, source]);

  /** Alterna: se já está tocando, para; senão toca. textOverride lê só uma prévia. */
  const toggle = useCallback((maxim: DailyMaxim, meta?: Record<string, unknown>, textOverride?: string) => {
    if (loading) return;
    if (isPlaying) { stop(); return; }
    void play(maxim, meta, textOverride);
  }, [loading, isPlaying, stop, play]);

  const overlayNode = audioOverlay ? (
    <AudioPlayerOverlay
      key={audioOverlay.id}
      audio={audioOverlay.audio}
      requiresManualStart={audioOverlay.needsManualStart}
      onClose={stop}
    />
  ) : null;

  return { play, toggle, stop, isPlaying, loading, overlayNode };
}

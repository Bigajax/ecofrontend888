import { useCallback, useState } from 'react';

export type EcoActivity =
  | { state: 'idle' }
  | { state: 'sending' }
  | { state: 'waiting_llm' }
  | { state: 'streaming'; tokens: number }
  | { state: 'synthesizing_audio' }
  | { state: 'error'; message: string };

export type EcoActivityControls = {
  activity: EcoActivity;
  onSend: () => void;
  onPromptReady: () => void;
  onToken: (deltaTokens?: number) => void;
  onTTS: (active: boolean) => void;
  onDone: () => void;
  onError: (message: string) => void;
};

const clampTokens = (value: number | undefined): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 1;
  const normalized = Math.floor(value);
  return normalized > 0 ? normalized : 1;
};

export const useEcoActivity = (
  initial: EcoActivity = { state: 'idle' },
): EcoActivityControls => {
  const [activity, setActivity] = useState<EcoActivity>(initial);

  const onSend = useCallback(() => {
    setActivity({ state: 'sending' });
  }, []);

  const onPromptReady = useCallback(() => {
    setActivity((prev) => {
      if (prev.state === 'synthesizing_audio') {
        return prev;
      }
      return { state: 'waiting_llm' };
    });
  }, []);

  const onToken = useCallback((deltaTokens?: number) => {
    const increment = clampTokens(deltaTokens);
    setActivity((prev) => {
      if (prev.state === 'synthesizing_audio') {
        return prev;
      }
      if (prev.state === 'streaming') {
        return { state: 'streaming', tokens: prev.tokens + increment };
      }
      return { state: 'streaming', tokens: increment };
    });
  }, []);

  const onTTS = useCallback((active: boolean) => {
    setActivity((prev) => {
      if (active) {
        return { state: 'synthesizing_audio' };
      }
      if (prev.state === 'synthesizing_audio') {
        return { state: 'idle' };
      }
      return prev;
    });
  }, []);

  const onDone = useCallback(() => {
    setActivity((prev) => {
      if (prev.state === 'synthesizing_audio' || prev.state === 'error') {
        return prev;
      }
      return { state: 'idle' };
    });
  }, []);

  const onError = useCallback((message: string) => {
    const trimmed = typeof message === 'string' ? message.trim() : '';
    setActivity({ state: 'error', message: trimmed || 'Ocorreu um erro.' });
  }, []);

  return { activity, onSend, onPromptReady, onToken, onTTS, onDone, onError };
};

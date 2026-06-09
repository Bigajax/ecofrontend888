import { useMemo, useEffect } from 'react';
import mixpanel from '@/lib/mixpanel';

export const HEADLINES = {
  '1': {
    eyebrow: 'Autoconhecimento prático',
    h1: 'Pare de carregar o que não é seu.',
  },
  '2': {
    eyebrow: 'Não é mais um app de meditação',
    h1: 'O que você ainda carrega não foi você quem colocou.',
  },
} as const;

export type HeadlineVariant = keyof typeof HEADLINES;

const STORAGE_KEY = 'eco.lp.headline_variant';

export function useHeadlineVariant() {
  const variant = useMemo<HeadlineVariant>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === '1' || stored === '2') return stored;
      const v: HeadlineVariant = Math.random() < 0.5 ? '1' : '2';
      localStorage.setItem(STORAGE_KEY, v);
      return v;
    } catch {
      return '1';
    }
  }, []);

  useEffect(() => {
    try {
      mixpanel.track('Landing · Headline exibida', { variant });
    } catch {
      // tracking nunca pode quebrar a página
    }
  }, [variant]);

  return { variant, ...HEADLINES[variant] };
}

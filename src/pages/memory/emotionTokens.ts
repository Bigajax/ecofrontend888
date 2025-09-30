import { normalizeText } from './utils';

export type MicroMotionPattern =
  | 'pulse'
  | 'tremor'
  | 'breathing'
  | 'tracking'
  | 'shortOscillation';

export type EmotionKey =
  | 'alegria'
  | 'calmo'
  | 'tristeza'
  | 'surpresa'
  | 'antecipacao'
  | 'raiva'
  | 'irritado'
  | 'frustracao'
  | 'medo'
  | 'incerteza'
  | 'neutro';

export type EmotionToken = {
  key: EmotionKey;
  label: string;
  gradient: [string, string];
  highlight: [string, string];
  irisGradient: [string, string];
  irisHighlight: [string, string];
  pupilColor: string;
  irisScale: number;
  pupilScale: number;
  eyelidOffset: number;
  blinkCadence: number;
  microMotion: MicroMotionPattern;
  accent: string;
};

const BASE_EYELID = 'linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.05))';

const createToken = (
  key: EmotionKey,
  label: string,
  options: Partial<EmotionToken> &
    Pick<EmotionToken, 'gradient' | 'accent' | 'microMotion'>
): EmotionToken => ({
  key,
  label,
  highlight: ['rgba(255,255,255,0.75)', 'rgba(255,255,255,0.08)'],
  irisGradient: ['rgba(124, 162, 255, 0.9)', 'rgba(64, 102, 200, 0.7)'],
  irisHighlight: ['rgba(255,255,255,0.7)', 'rgba(255,255,255,0.1)'],
  pupilColor: 'radial-gradient(120% 120% at 30% 30%, rgba(20,27,45,0.95), rgba(2,5,12,0.65))',
  irisScale: 0.4,
  pupilScale: 0.45,
  eyelidOffset: 0.06,
  blinkCadence: 4,
  ...options,
});

export const emotionTokens: Record<EmotionKey, EmotionToken> = {
  alegria: createToken('alegria', 'Alegria', {
    gradient: ['#8EE3D0', '#4FD2A7'],
    irisGradient: ['rgba(130, 220, 200, 0.95)', 'rgba(56, 166, 134, 0.75)'],
    accent: '#4FD2A7',
    blinkCadence: 5.2,
    eyelidOffset: 0.04,
    microMotion: 'pulse',
  }),
  calmo: createToken('calmo', 'Calmo', {
    gradient: ['#C9B6FF', '#8EE3D0'],
    irisGradient: ['rgba(182, 162, 255, 0.9)', 'rgba(92, 180, 176, 0.72)'],
    irisHighlight: ['rgba(255,255,255,0.85)', 'rgba(255,255,255,0.12)'],
    accent: '#A897FF',
    blinkCadence: 6.4,
    eyelidOffset: 0.12,
    microMotion: 'breathing',
  }),
  tristeza: createToken('tristeza', 'Tristeza', {
    gradient: ['#7A87A6', '#5B6B88'],
    irisGradient: ['rgba(126, 142, 177, 0.92)', 'rgba(64, 86, 132, 0.7)'],
    accent: '#5B6B88',
    blinkCadence: 3.8,
    eyelidOffset: 0.18,
    microMotion: 'shortOscillation',
  }),
  surpresa: createToken('surpresa', 'Surpresa', {
    gradient: ['#FFD166', '#FF9B42'],
    irisGradient: ['rgba(255, 205, 102, 0.92)', 'rgba(244, 134, 48, 0.7)'],
    accent: '#FF9B42',
    blinkCadence: 2.8,
    eyelidOffset: 0.02,
    microMotion: 'tremor',
  }),
  antecipacao: createToken('antecipacao', 'Antecipação', {
    gradient: ['#5B4BFF', '#8A6BFF'],
    irisGradient: ['rgba(104, 94, 255, 0.92)', 'rgba(68, 48, 195, 0.75)'],
    accent: '#6B59FF',
    blinkCadence: 4.6,
    eyelidOffset: 0.08,
    microMotion: 'tracking',
  }),
  raiva: createToken('raiva', 'Raiva', {
    gradient: ['#FF5964', '#FF7B87'],
    irisGradient: ['rgba(255, 120, 130, 0.92)', 'rgba(172, 48, 74, 0.75)'],
    accent: '#FF5964',
    blinkCadence: 2.6,
    eyelidOffset: 0.03,
    microMotion: 'tremor',
  }),
  irritado: createToken('irritado', 'Irritado', {
    gradient: ['#FF6B6F', '#FF8A7A'],
    irisGradient: ['rgba(255, 140, 150, 0.9)', 'rgba(182, 58, 74, 0.7)'],
    accent: '#FF6B6F',
    blinkCadence: 3.2,
    eyelidOffset: 0.05,
    microMotion: 'shortOscillation',
  }),
  frustracao: createToken('frustracao', 'Frustração', {
    gradient: ['#FF5964', '#C63F52'],
    irisGradient: ['rgba(235, 108, 118, 0.92)', 'rgba(134, 34, 58, 0.76)'],
    accent: '#E14F5A',
    blinkCadence: 3,
    eyelidOffset: 0.07,
    microMotion: 'tracking',
  }),
  medo: createToken('medo', 'Medo', {
    gradient: ['#5B4BFF', '#3E3DA8'],
    irisGradient: ['rgba(112, 102, 255, 0.9)', 'rgba(46, 50, 162, 0.75)'],
    accent: '#4A44D4',
    blinkCadence: 2.9,
    eyelidOffset: 0.15,
    microMotion: 'tracking',
  }),
  incerteza: createToken('incerteza', 'Incerteza', {
    gradient: ['#FFD166', '#FFB347'],
    irisGradient: ['rgba(255, 202, 108, 0.92)', 'rgba(232, 153, 66, 0.74)'],
    accent: '#FFB347',
    blinkCadence: 3.6,
    eyelidOffset: 0.09,
    microMotion: 'breathing',
  }),
  neutro: createToken('neutro', 'Neutro', {
    gradient: ['#7A87A6', '#8893AA'],
    irisGradient: ['rgba(138, 150, 176, 0.92)', 'rgba(84, 95, 122, 0.72)'],
    accent: '#7A87A6',
    blinkCadence: 5.8,
    eyelidOffset: 0.14,
    microMotion: 'breathing',
  }),
};

export const emotionEyelidSurface = BASE_EYELID;

export const emotionAliases: Record<string, EmotionKey> = {
  calma: 'calmo',
  'bem-estar': 'alegria',
  'bem estar': 'alegria',
  bemestar: 'alegria',
  plenitude: 'alegria',
  raivoso: 'raiva',
  assustado: 'medo',
  medoansiedade: 'medo',
  apreensivo: 'incerteza',
};

export const resolveEmotionKey = (emotion?: string): EmotionKey => {
  const normalized = normalizeText(emotion ?? '');
  if (!normalized) return 'neutro';
  const mapped = emotionAliases[normalized];
  if (mapped) return mapped;
  if ((emotionTokens as Record<string, EmotionToken>)[normalized]) {
    return normalized as EmotionKey;
  }
  return 'neutro';
};

export const getEmotionToken = (emotion?: string): EmotionToken => {
  const key = resolveEmotionKey(emotion);
  return emotionTokens[key];
};

export const emotionPalette: Record<EmotionKey, string> = Object.fromEntries(
  Object.entries(emotionTokens).map(([key, token]) => [key, token.accent])
) as Record<EmotionKey, string>;

export const getEmotionAccent = (emotion?: string) => getEmotionToken(emotion).accent;

import { normalizeText } from './utils';

const EMOTION_COLORS: Record<string, string> = {
  raiva: '#ff453a',
  irritado: '#ff9f0a',
  frustracao: '#ff375f',
  medo: '#ff9f0a',
  incerteza: '#ffd60a',
  alegria: '#32d74b',
  calmo: '#5ac8fa',
  surpresa: '#007aff',
  antecipacao: '#af52de',
  tristeza: '#bf5af2',
  neutro: '#98989d',
};

const EMOTION_ALIASES: Record<string, string> = {
  calma: 'calmo',
  'bem-estar': 'alegria',
  'bem estar': 'alegria',
  bemestar: 'alegria',
  plenitude: 'alegria',
};

export const getEmotionColor = (emotion?: string) => {
  const key = normalizeText(emotion ?? '');
  const mapped = EMOTION_ALIASES[key] ?? key;
  return EMOTION_COLORS[mapped] ?? EMOTION_COLORS.neutro;
};

const hashStringToHue = (str: string) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = str.charCodeAt(i) + ((h << 5) - h);
  }
  return Math.abs(h) % 360;
};

export const appleTagColor = (seed: string) => {
  const hue = hashStringToHue(seed);
  return {
    bg: `hsl(${hue}, 40%, 96%)`,
    border: `hsl(${hue}, 45%, 85%)`,
    text: `hsl(${hue}, 60%, 30%)`,
  };
};

export function appleShade(hex: string, amount: number) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const channel = (i: number) => {
    const value = parseInt(m[i], 16);
    const next = Math.max(0, Math.min(255, Math.round(value * (1 + amount))));
    return next.toString(16).padStart(2, '0');
  };
  return `#${channel(1)}${channel(2)}${channel(3)}`;
}

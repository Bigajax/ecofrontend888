import { getEmotionToken } from './emotionTokens';

export const getEmotionColor = (emotion?: string) => getEmotionToken(emotion).accent;

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

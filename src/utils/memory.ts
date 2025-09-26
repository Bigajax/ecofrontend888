import { Memoria } from '../api/memoriaApi';

export const EMOTION_COLORS: Record<string, string> = {
  raiva: '#DB2777',
  irritado: '#EC4899',
  frustracao: '#BE185D',
  medo: '#DB2777',
  incerteza: '#BE185D',
  alegria: '#3B82F6',
  calmo: '#2563EB',
  surpresa: '#3B82F6',
  antecipacao: '#2563EB',
  tristeza: '#A855F7',
  neutro: '#8B5CF6',
};

export const normalize = (value: string = ''): string =>
  value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const hashStringToHue = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
};

export const generateConsistentPastelColor = (
  seed: string,
  options: { saturation?: number; lightness?: number } = {}
): string => {
  const hue = hashStringToHue(seed);
  const { saturation = 25, lightness = 88 } = options;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

export const getEmotionColor = (emotionName: string): string => {
  const normalized = normalize(emotionName);
  return EMOTION_COLORS[normalized] || generateConsistentPastelColor(emotionName);
};

export const humanDate = (raw: string): string => {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';

  const diffInDays = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (diffInDays === 0) return 'Hoje';
  if (diffInDays === 1) return 'Ontem';
  return `${diffInDays} dias atrás`;
};

export const clamp = (value: number, min = -1, max = 1): number =>
  Math.max(min, Math.min(max, value));

export const bucketLabelForDate = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Antigas';

  const now = new Date();
  const diffDays = Math.floor((+now - +date) / 86_400_000);
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';

  const startOfWeek = new Date(now);
  const day = startOfWeek.getDay();
  const diffToMonday = (day + 6) % 7;
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);
  if (date >= startOfWeek) return 'Esta semana';

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  if (date >= startOfMonth) return 'Este mês';

  return 'Antigas';
};

export type GroupedMemories = Record<string, Memoria[]>;

export const groupMemories = (memories: Memoria[]): GroupedMemories =>
  memories.reduce<GroupedMemories>((acc, memory) => {
    const label = memory.created_at ? bucketLabelForDate(memory.created_at) : 'Antigas';
    if (!acc[label]) acc[label] = [];
    acc[label].push(memory);
    return acc;
  }, {});

export const FILTER_GROUP_ORDER = ['Hoje', 'Ontem', 'Esta semana', 'Este mês', 'Antigas'] as const;

export const filtersAreActive = (
  emotionFilter: string,
  searchQuery: string,
  minIntensity: number
): boolean => emotionFilter !== 'all' || !!searchQuery || minIntensity > 0;

export const normalizeTextFields = (...values: (string | null | undefined)[]): string =>
  values
    .map((value) => (value ? normalize(value) : ''))
    .filter(Boolean)
    .join(' ');

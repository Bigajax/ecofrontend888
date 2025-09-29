import type { Memoria as MemoriaAPI } from '../../api/memoriaApi';

export type Memoria = MemoriaAPI & {
  id?: string | number;
  created_at?: string;
  createdAt?: string;
  emocao_principal?: string;
  emocao?: string;
  emotion?: string;
  intensidade?: number;
  intensity?: number;
  contexto?: string;
  tags?: string[] | string | null;

  dominio_vida?: string;
  dominio?: string;
  domain?: string;
  padrao_comportamento?: string;
  padrao_comportamental?: string;
  padrao?: string;

  analise_resumo?: string;
  resumo_eco?: string;
  categoria?: string;
};

export const normalizeText = (s = '') =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const getCreatedAt = (m: Memoria) => m.created_at ?? m.createdAt ?? undefined;
export const getEmotion = (m: Memoria) => m.emocao_principal ?? m.emocao ?? m.emotion ?? '';
export const getIntensity = (m: Memoria) =>
  typeof m.intensidade === 'number'
    ? m.intensidade
    : typeof m.intensity === 'number'
    ? m.intensity
    : 0;
export const getDomain = (m: Memoria) => m.dominio_vida ?? m.dominio ?? m.domain ?? '';
export const getPattern = (m: Memoria) =>
  m.padrao_comportamento ?? m.padrao_comportamental ?? m.padrao ?? '';
export const getTags = (m: Memoria): string[] => {
  const raw = Array.isArray(m.tags)
    ? m.tags
    : typeof m.tags === 'string'
    ? m.tags.split(/[;,]/)
    : [];
  return Array.from(new Set(raw.map((t) => (t || '').trim()).filter(Boolean)));
};

export const capitalize = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

export const toDate = (raw?: string) => {
  if (!raw) return new Date('1970-01-01');
  const d = new Date(raw);
  return isNaN(d.getTime()) ? new Date('1970-01-01') : d;
};

export const humanDate = (raw?: string) => {
  const d = toDate(raw);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return 'Agora há pouco';
  if (diffHours < 24) return `${diffHours}h atrás`;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `${diffDays} dias atrás`;
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
};

export const intensityOf = (m: Memoria) => {
  const v = Number(getIntensity(m));
  return Number.isFinite(v) ? Math.min(10, Math.max(0, v)) : 0;
};

export const bucketLabelForDate = (iso?: string) => {
  const d = toDate(iso);
  const now = new Date();
  const diffDays = Math.floor((+now - +d) / 86400000);
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return 'Esta semana';
  if (diffDays < 30) return 'Este mês';
  return 'Anteriores';
};

export type GroupedMemories = Record<string, Memoria[]>;

export const groupMemories = (mems: Memoria[]): GroupedMemories =>
  mems.reduce((acc: GroupedMemories, m) => {
    const label = bucketLabelForDate(getCreatedAt(m));
    (acc[label] ||= []).push(m);
    return acc;
  }, {} as GroupedMemories);

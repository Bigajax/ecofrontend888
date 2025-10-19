import { Memoria } from '../../api/memoriaApi';
import { normalize as normalizeText } from '../../utils/memory';
import { appleShade } from './palette';
import { getEmotionToken, resolveEmotionKey } from './emotionTokens';

type Maybe<T> = T | null | undefined;

export type EmotionThemeKey =
  | 'alegria'
  | 'tristeza'
  | 'raiva'
  | 'medo'
  | 'surpresa'
  | 'nojo'
  | 'calma'
  | 'neutra';

export type EmotionTheme = {
  key: EmotionThemeKey;
  className: string;
  accent: string;
  accentSoft: string;
  accentSofter: string;
  accentTextClass: string;
  metaTextClass: string;
  chipClass: string;
  meterTrackClass: string;
};

export type MemoryCardDTO = {
  id: string;
  titulo: string;
  subtitulo: string;
  intensidade: number | null;
  intensidadeLabel: string;
  tags: string[];
  timeAgo: string;
  fallbackDate: string;
  resumo: string | null;
  resumoCompleto: string | null;
  nivelAbertura: number | null;
  domain: string;
  categoria: string | null;
  contexto: string | null;
  padrao: string | null;
  mensagemId: string | null;
  createdAtIso: string | null;
  createdAtDate: Date | null;
  emocao: string;
  emocaoNormalizada: string;
  emotionKey: EmotionThemeKey;
  emotionTheme: EmotionTheme;
  accent: string;
  raw: Memoria;
};

const THEME_CLASS_BASE = 'emotion-theme';

const emotionThemeMap: Record<EmotionThemeKey, Omit<EmotionTheme, 'accent' | 'accentSoft' | 'accentSofter'>> = {
  alegria: {
    key: 'alegria',
    className: `${THEME_CLASS_BASE}-alegria`,
    accentTextClass: 'text-emerald-600',
    metaTextClass: 'text-emerald-600',
    chipClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200/70',
    meterTrackClass: 'bg-emerald-100/60',
  },
  tristeza: {
    key: 'tristeza',
    className: `${THEME_CLASS_BASE}-tristeza`,
    accentTextClass: 'text-slate-600',
    metaTextClass: 'text-slate-600',
    chipClass: 'bg-slate-50 text-slate-700 border border-slate-200/70',
    meterTrackClass: 'bg-slate-200/60',
  },
  raiva: {
    key: 'raiva',
    className: `${THEME_CLASS_BASE}-raiva`,
    accentTextClass: 'text-rose-600',
    metaTextClass: 'text-rose-600',
    chipClass: 'bg-rose-50 text-rose-700 border border-rose-200/70',
    meterTrackClass: 'bg-rose-100/60',
  },
  medo: {
    key: 'medo',
    className: `${THEME_CLASS_BASE}-medo`,
    accentTextClass: 'text-indigo-600',
    metaTextClass: 'text-indigo-600',
    chipClass: 'bg-indigo-50 text-indigo-700 border border-indigo-200/70',
    meterTrackClass: 'bg-indigo-100/60',
  },
  surpresa: {
    key: 'surpresa',
    className: `${THEME_CLASS_BASE}-surpresa`,
    accentTextClass: 'text-orange-600',
    metaTextClass: 'text-orange-600',
    chipClass: 'bg-orange-50 text-orange-700 border border-orange-200/70',
    meterTrackClass: 'bg-orange-100/60',
  },
  nojo: {
    key: 'nojo',
    className: `${THEME_CLASS_BASE}-nojo`,
    accentTextClass: 'text-lime-600',
    metaTextClass: 'text-lime-600',
    chipClass: 'bg-lime-50 text-lime-700 border border-lime-200/70',
    meterTrackClass: 'bg-lime-100/60',
  },
  calma: {
    key: 'calma',
    className: `${THEME_CLASS_BASE}-calma`,
    accentTextClass: 'text-violet-600',
    metaTextClass: 'text-violet-600',
    chipClass: 'bg-violet-50 text-violet-700 border border-violet-200/70',
    meterTrackClass: 'bg-violet-100/60',
  },
  neutra: {
    key: 'neutra',
    className: `${THEME_CLASS_BASE}-neutra`,
    accentTextClass: 'text-slate-500',
    metaTextClass: 'text-slate-500',
    chipClass: 'bg-slate-50 text-slate-600 border border-slate-200/70',
    meterTrackClass: 'bg-slate-200/70',
  },
};

const UNDEFINED_LABELS = new Set([
  'indefinida',
  'indefinido',
  'sem emocao',
  'sememocao',
  'sem sentimento',
  'sememocao_principal',
  'sem_emocao',
  'sem emocao principal',
  'nao classificada',
  'nao classificado',
  'nao identificado',
  'nao identificada',
  'nao informado',
  'nao informada',
  'desconhecido',
  'desconhecida',
  'n/a',
  'none',
  'na',
]);

const shouldIgnoreLabel = (value: string) => {
  const normalized = normalizeText(value);
  return !normalized || UNDEFINED_LABELS.has(normalized);
};

const normalizeTitle = (value: string) => {
  if (!value) return '';
  if (shouldIgnoreLabel(value)) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

const normalizeTags = (tags: Maybe<string[] | string>) => {
  if (Array.isArray(tags)) {
    return Array.from(new Set(tags.map((tag) => tag?.trim()).filter(Boolean))) as string[];
  }

  if (typeof tags === 'string') {
    return Array.from(
      new Set(
        tags
          .split(/[;,]/)
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
    );
  }

  return [];
};

const parseDate = (iso: Maybe<string>) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const formatShortDate = (date: Maybe<Date>) => {
  if (!date) return '—';
  try {
    const formatted = date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
    return formatted.replace('.', '');
  } catch (error) {
    return '—';
  }
};

const formatTimeAgo = (date: Maybe<Date>) => {
  if (!date) return null;
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (!Number.isFinite(diff)) return null;
  if (diff < 0) return null;

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'agora há pouco';
  if (minutes < 60) return `${minutes} min atrás`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'Ontem';
  if (days < 7) return `${days} dias atrás`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} sem atrás`;

  return null;
};

const sanitizeSummary = (text: Maybe<string>, limit = 190) => {
  if (!text) return null;
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;
  if (cleaned.length <= limit) return cleaned;

  const truncated = cleaned.slice(0, limit).trim();
  const lastSpace = truncated.lastIndexOf(' ');
  const safeSlice = lastSpace > 140 ? truncated.slice(0, lastSpace) : truncated;
  return `${safeSlice.trim()}…`;
};

const coerceIntensity = (value: Maybe<number | string>) => {
  if (value === null || value === undefined) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  const clamped = Math.min(10, Math.max(0, numeric));
  return Number(clamped.toFixed(1));
};

const THEME_ALIAS: Record<string, EmotionThemeKey> = {
  alegria: 'alegria',
  feliz: 'alegria',
  felicidade: 'alegria',
  gratidao: 'alegria',
  gratidão: 'alegria',
  entusiasmo: 'alegria',
  animado: 'alegria',
  animada: 'alegria',
  contente: 'alegria',
  calma: 'calma',
  calmo: 'calma',
  tranquilo: 'calma',
  tranquilidade: 'calma',
  paz: 'calma',
  serenidade: 'calma',
  tristeza: 'tristeza',
  triste: 'tristeza',
  melancolia: 'tristeza',
  saudade: 'tristeza',
  desanimo: 'tristeza',
  desânimo: 'tristeza',
  raiva: 'raiva',
  irritado: 'raiva',
  irritacao: 'raiva',
  irritação: 'raiva',
  frustracao: 'raiva',
  frustração: 'raiva',
  chateado: 'raiva',
  chateada: 'raiva',
  nojo: 'nojo',
  repulsa: 'nojo',
  aversao: 'nojo',
  aversão: 'nojo',
  desgosto: 'nojo',
  medo: 'medo',
  apreensao: 'medo',
  apreensão: 'medo',
  ansiedade: 'medo',
  ansioso: 'medo',
  ansiosa: 'medo',
  inseguro: 'medo',
  insegura: 'medo',
  incerteza: 'medo',
  surpresa: 'surpresa',
  espanto: 'surpresa',
  admiracao: 'surpresa',
  admiração: 'surpresa',
  antecipacao: 'surpresa',
  antecipação: 'surpresa',
};

const resolveThemeKey = (emotion?: string) => {
  const normalized = normalizeText(emotion ?? '');
  if (normalized && THEME_ALIAS[normalized]) {
    return THEME_ALIAS[normalized];
  }

  const emotionKey = resolveEmotionKey(emotion);
  switch (emotionKey) {
    case 'alegria':
      return 'alegria';
    case 'calmo':
      return 'calma';
    case 'tristeza':
      return 'tristeza';
    case 'surpresa':
    case 'antecipacao':
      return 'surpresa';
    case 'raiva':
    case 'irritado':
    case 'frustracao':
      return 'raiva';
    case 'nojo':
      return 'nojo';
    case 'medo':
    case 'incerteza':
      return 'medo';
    case 'neutro':
    default:
      return 'neutra';
  }
};

type EmotionCandidate = {
  label: string;
  normalized: string;
  token: ReturnType<typeof getEmotionToken>;
  themeKey: EmotionThemeKey;
};

const toEmotionCandidate = (
  value: Maybe<string>,
  { allowNeutral = false }: { allowNeutral?: boolean } = {},
): EmotionCandidate | null => {
  if (!value) return null;
  if (shouldIgnoreLabel(value)) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const token = getEmotionToken(trimmed);
  if (!allowNeutral && token.key === 'neutro') {
    return null;
  }

  return {
    label: token.label,
    normalized: normalizeText(trimmed),
    token,
    themeKey: resolveThemeKey(trimmed),
  };
};

const resolveEmotionFromTags = (tags: string[]): EmotionCandidate | null => {
  for (const tag of tags) {
    const candidate = toEmotionCandidate(tag, { allowNeutral: false });
    if (candidate) return candidate;
  }
  return null;
};

const buildEmotionTheme = (emotionKey: EmotionThemeKey, accent: string): EmotionTheme => {
  const base = emotionThemeMap[emotionKey];
  return {
    ...base,
    accent,
    accentSoft: appleShade(accent, 0.25),
    accentSofter: appleShade(accent, 0.45),
  };
};

const buildTitle = (emotionLabel: string, categoria: Maybe<string>, tags: string[]) => {
  const emotion = normalizeTitle(emotionLabel);
  if (emotion) return emotion;

  const categoriaTitle = normalizeTitle(categoria ?? '');
  if (categoriaTitle) return categoriaTitle;

  const tagTitle = normalizeTitle(tags[0] ?? '');
  if (tagTitle) return tagTitle;

  return 'Memória';
};

export const normalizeMemoryCard = (memory: Memoria): MemoryCardDTO => {
  const createdAtIso = (memory.created_at ?? (memory as any).createdAt ?? null) as Maybe<string>;
  const createdAtDate = parseDate(createdAtIso);
  const fallbackDate = formatShortDate(createdAtDate);
  const timeAgo = formatTimeAgo(createdAtDate) ?? fallbackDate;

  const tags = normalizeTags(memory.tags as Maybe<string[] | string>);
  const domainRaw =
    (memory.dominio_vida ?? (memory as any).dominio ?? (memory as any).domain ?? '') as Maybe<string>;
  const domain = normalizeTitle(domainRaw ?? '');
  const subtitulo = domain || 'Pessoal';

  const intensitySource =
    (memory.intensidade ?? (memory as any).intensity ?? (memory as any).nivel_intensidade ?? null) as Maybe<
      number | string
    >;
  const intensidade = coerceIntensity(intensitySource);
  const intensidadeLabel = intensidade == null ? '—/10' : `${Number(intensidade.toFixed(1))}/10`;

  const summaryRaw = (memory.analise_resumo ?? memory.resumo_eco ?? null) as Maybe<string>;
  const resumoCompleto = summaryRaw?.trim() ? summaryRaw.trim() : null;
  const resumo = sanitizeSummary(summaryRaw);

  const nivelAbertura = (memory.nivel_abertura ?? (memory as any).nivelAbertura ?? null) as Maybe<number>;
  const padrao =
    (memory.padrao_comportamental ??
      (memory as any).padrao_comportamento ??
      (memory as any).padrao ??
      null) as Maybe<string>;

  const rawEmotion =
    (memory.emocao_principal ?? (memory as any).emocao ?? (memory as any).emotion ?? '') as Maybe<string>;
  const primaryEmotion = toEmotionCandidate(rawEmotion, { allowNeutral: true });
  const categoryEmotion = toEmotionCandidate(memory.categoria, { allowNeutral: false });
  const tagEmotion = resolveEmotionFromTags(tags);
  const fallbackEmotion = toEmotionCandidate('Neutro', { allowNeutral: true })!;

  const resolvedEmotion = primaryEmotion ?? categoryEmotion ?? tagEmotion ?? fallbackEmotion;
  const theme = buildEmotionTheme(resolvedEmotion.themeKey, resolvedEmotion.token.accent);

  const emotionLabel = resolvedEmotion.label ?? '';
  const titulo = buildTitle(emotionLabel, memory.categoria ?? null, tags);

  const emocaoNormalizada = resolvedEmotion.normalized;

  return {
    id: String(memory.id ?? memory.mensagem_id ?? memory.created_at ?? Math.random().toString(36).slice(2)),
    titulo,
    subtitulo,
    intensidade,
    intensidadeLabel,
    tags,
    timeAgo,
    fallbackDate,
    resumo,
    resumoCompleto,
    nivelAbertura: nivelAbertura ?? null,
    domain: domain || 'Pessoal',
    categoria: memory.categoria ?? null,
    contexto: (memory.contexto ?? (memory as any).context ?? null) as Maybe<string> ?? null,
    padrao: padrao ?? null,
    mensagemId: (memory.mensagem_id ?? null) as Maybe<string> ?? null,
    createdAtIso,
    createdAtDate,
    emocao: emotionLabel,
    emocaoNormalizada,
    emotionKey: resolvedEmotion.themeKey,
    emotionTheme: theme,
    accent: resolvedEmotion.token.accent,
    raw: memory,
  };
};

export const normalizeMemoryCollection = (memories: Memoria[]): MemoryCardDTO[] =>
  memories.map(normalizeMemoryCard).sort((a, b) => {
    const timeA = a.createdAtDate ? a.createdAtDate.getTime() : -Infinity;
    const timeB = b.createdAtDate ? b.createdAtDate.getTime() : -Infinity;
    return timeB - timeA;
  });

export const sortMemoriesByCreatedAtDesc = <T extends Memoria>(memories: T[]): T[] =>
  [...memories].sort((a, b) => {
    const dateA = parseDate((a.created_at ?? (a as any).createdAt ?? null) as Maybe<string>);
    const dateB = parseDate((b.created_at ?? (b as any).createdAt ?? null) as Maybe<string>);
    const timeA = dateA ? dateA.getTime() : -Infinity;
    const timeB = dateB ? dateB.getTime() : -Infinity;
    return timeB - timeA;
  });

export type MemoryBucket = 'Hoje' | 'Ontem' | 'Esta semana' | 'Este mês' | 'Anteriores';

export const BUCKET_ORDER: MemoryBucket[] = ['Hoje', 'Ontem', 'Esta semana', 'Este mês', 'Anteriores'];

const diffInDays = (date: Date) => {
  const now = new Date();
  const ms = now.getTime() - date.getTime();
  return Math.floor(ms / 86400000);
};

export const bucketLabelForCard = (memory: MemoryCardDTO): MemoryBucket => {
  const date = memory.createdAtDate;
  if (!date) return 'Anteriores';
  const days = diffInDays(date);
  if (days <= 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  if (days < 7) return 'Esta semana';
  if (days < 30) return 'Este mês';
  return 'Anteriores';
};

export const groupMemoryCards = (cards: MemoryCardDTO[]) => {
  return cards.reduce<Record<MemoryBucket, MemoryCardDTO[]>>((acc, memory) => {
    const bucket = bucketLabelForCard(memory);
    if (!acc[bucket]) acc[bucket] = [];
    acc[bucket]!.push(memory);
    return acc;
  }, { Hoje: [], Ontem: [], 'Esta semana': [], 'Este mês': [], Anteriores: [] });
};

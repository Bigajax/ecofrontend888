// src/pages/memory/MemoriesSection.tsx
import React, { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useMemoryData } from './memoryData';
import type { Memoria as MemoriaAPI } from '../../api/memoriaApi';

// ⬇️ Loader (bolha respirando)
import EcoBubbleLoading from '../../components/EcoBubbleLoading';

/* ---------- Tipagem de UI (flexível aos campos snake_case) ---------- */
type Memoria = MemoriaAPI & {
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

  dominio_vida?: string; dominio?: string; domain?: string;
  padrao_comportamento?: string; padrao_comportamental?: string; padrao?: string;

  analise_resumo?: string; resumo_eco?: string;
};

/* ---------- Getters seguros ---------- */
const getCreatedAt = (m: Memoria) => m.created_at ?? m.createdAt ?? undefined;
const getEmotion   = (m: Memoria) => m.emocao_principal ?? m.emocao ?? m.emotion ?? '';
const getIntensity = (m: Memoria) =>
  typeof m.intensidade === 'number' ? m.intensidade
  : typeof m.intensity === 'number' ? m.intensity : 0;
const getDomain  = (m: Memoria) => m.dominio_vida ?? m.dominio ?? m.domain ?? '';
const getPattern = (m: Memoria) => m.padrao_comportamento ?? m.padrao_comportamental ?? m.padrao ?? '';
const getTags = (m: Memoria): string[] => {
  const raw = Array.isArray(m.tags) ? m.tags : typeof m.tags === 'string' ? m.tags.split(/[;,]/) : [];
  return Array.from(new Set(raw.map(t => (t || '').trim()).filter(Boolean)));
};

/* ---------- Helpers ---------- */
const capitalize = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

/* ---------- Paleta Apple refinada ---------- */
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
  calma: 'calmo', 'bem-estar': 'alegria', 'bem estar': 'alegria', bemestar: 'alegria', plenitude: 'alegria',
};
const normalize = (s = '') => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const colorFor = (emo?: string) => {
  const key = normalize(emo || '');
  const mapped = EMOTION_ALIASES[key] || key;
  return EMOTION_COLORS[mapped] ?? EMOTION_COLORS.neutro;
};
const hashStringToHue = (str: string) => {
  let h = 0; for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h) % 360;
};
// Cores Apple-like para tags
const appleTagColor = (seed: string) => {
  const hue = hashStringToHue(seed);
  return { bg: `hsl(${hue}, 40%, 96%)`, border: `hsl(${hue}, 45%, 85%)`, text: `hsl(${hue}, 60%, 30%)` };
};
function appleShade(hex: string, amount: number) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const ch = (i: number) => {
    const v = parseInt(m[i], 16);
    const n = Math.max(0, Math.min(255, Math.round(v * (1 + amount))));
    return n.toString(16).padStart(2, '0');
  };
  return `#${ch(1)}${ch(2)}${ch(3)}`;
}

/* ---------- Data utils ---------- */
const toDate = (raw?: string) => {
  if (!raw) return new Date('1970-01-01');
  const d = new Date(raw);
  return isNaN(d.getTime()) ? new Date('1970-01-01') : d;
};
const humanDate = (raw?: string) => {
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
const intensityOf = (m: Memoria) => {
  const v = Number(getIntensity(m));
  return Number.isFinite(v) ? Math.min(10, Math.max(0, v)) : 0;
};
const bucketLabelForDate = (iso?: string) => {
  const d = toDate(iso);
  const now = new Date();
  const diffDays = Math.floor((+now - +d) / 86400000);
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return 'Esta semana';
  if (diffDays < 30) return 'Este mês';
  return 'Anteriores';
};
type Grouped = Record<string, Memoria[]>;
const groupMemories = (mems: Memoria[]): Grouped =>
  mems.reduce((acc: Grouped, m) => {
    const label = bucketLabelForDate(getCreatedAt(m));
    (acc[label] ||= []).push(m);
    return acc;
  }, {});

/* ---------- Componentes visuais ---------- */
const EmotionBubble: React.FC<{ color?: string; className?: string; 'aria-label'?: string }> = ({
  color = '#007aff', className = '', ...rest
}) => (
  <div
    {...rest}
    className={`h-11 w-11 rounded-full shrink-0 relative ${className}`}
    style={{
      background: `linear-gradient(135deg, ${color} 0%, ${appleShade(color, -0.15)} 100%)`,
      boxShadow: `
        0 0 0 0.5px rgba(0,0,0,0.04),
        0 1px 2px rgba(0,0,0,0.06),
        0 8px 16px ${color}25,
        inset 0 0.5px 1px rgba(255,255,255,0.4)
      `,
    }}
  >
    <div 
      className="absolute inset-1 rounded-full"
      style={{ background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.5) 0%, transparent 60%)` }}
    />
  </div>
);

const Chip: React.FC<React.PropsWithChildren<{ title?: string; variant?: 'default' | 'colorful'; seedColor?: string }>> =
({ title, children, variant = 'default', seedColor }) => {
  if (variant === 'colorful' && seedColor) {
    const colors = appleTagColor(seedColor);
    return (
      <div
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] leading-4 font-medium max-w-full"
        style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}
      >
        {title ? <span className="opacity-70">{title}:</span> : null}
        <span className="truncate">{children}</span>
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-black/[0.06] bg-white/90 backdrop-blur-sm text-[12px] leading-4 text-gray-600 max-w-full">
      {title ? <span className="font-medium text-gray-800">{title}:</span> : null}
      <span className="truncate">{children}</span>
    </div>
  );
};

const ExpandButton: React.FC<{ open: boolean; onClick: () => void; controlsId: string }> = ({ open, onClick, controlsId }) => (
  <button
    type="button"
    onClick={onClick}
    aria-expanded={open}
    aria-controls={controlsId}
    aria-label={open ? 'Recolher detalhes' : 'Ver detalhes'}
    className="h-8 w-8 rounded-full bg-white/80 backdrop-blur-sm border border-black/[0.06] hover:bg-white hover:border-black/[0.08] active:scale-[0.96] transition-all duration-150 grid place-items-center shadow-sm"
  >
    <svg viewBox="0 0 20 20" className={`h-3.5 w-3.5 text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
      <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </button>
);

/* ---------- Card Apple Health style ---------- */
const MemoryCard = React.memo(({ mem }: { mem: Memoria }) => {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen(v => !v), []);
  const detailsId = `mem-details-${mem.id ?? Math.random().toString(36).slice(2)}`;

  const primaryColor = colorFor(getEmotion(mem));
  const when = humanDate(getCreatedAt(mem));
  const intensidade = intensityOf(mem);

  const domain = getDomain(mem);
  const padrao = getPattern(mem);
  const tags = getTags(mem);

  return (
    <motion.li
      layout
      className="w-full max-w-full rounded-2xl bg-white/95 backdrop-blur-sm border border-black/[0.08] shadow-[0_1px_2px_rgba(0,0,0,0.05),0_8px_32px_rgba(0,0,0,0.04)] p-5 transition-all duration-200 hover:shadow-[0_1px_2px_rgba(0,0,0,0.08),0_12px_40px_rgba(0,0,0,0.06)] hover:border-black/[0.12]"
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        <EmotionBubble aria-label={`Emoção: ${getEmotion(mem) || 'Neutro'}`} color={primaryColor} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-[17px] leading-[1.35] font-semibold text-gray-900 truncate mb-0.5">
                {capitalize(getEmotion(mem)) || 'Registro emocional'}
              </h3>
              <p className="text-[13px] leading-[1.4] text-gray-500 font-medium">{when}</p>
            </div>
            <ExpandButton open={open} onClick={toggle} controlsId={detailsId} />
          </div>

          {/* Intensidade */}
          <div className="mt-3 mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] font-medium text-gray-600">Intensidade</span>
              <span className="text-[12px] font-semibold text-gray-800">{intensidade}/10</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(intensidade / 10) * 100}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${primaryColor}, ${appleShade(primaryColor, -0.2)})` }}
              />
            </div>
          </div>

          {/* Domínio */}
          {domain && (
            <div className="mb-3">
              <Chip variant="colorful" seedColor={domain}>{domain}</Chip>
            </div>
          )}
        </div>
      </div>

      {/* Tags */}
      {!!tags.length && (
        <div className="mt-3 flex flex-wrap gap-2">
          {tags.slice(0, 3).map((tag, i) => (
            <Chip key={`${tag}-${i}`} variant="colorful" seedColor={tag}>{tag}</Chip>
          ))}
          {tags.length > 3 && <Chip>+{tags.length - 3} mais</Chip>}
        </div>
      )}

      {/* Detalhes */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={detailsId}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            <div className="space-y-4 mt-4 pt-4 border-t border-gray-100">
              <div className="flex flex-wrap gap-2">
                <Chip title="Criado em">
                  {toDate(getCreatedAt(mem)).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Chip>
                {tags.length > 3 && <Chip title="Todas as tags">{tags.join(', ')}</Chip>}
              </div>

              {padrao && (
                <div className="rounded-xl p-4 bg-gray-50/80 backdrop-blur-sm border border-gray-100">
                  <div className="font-semibold text-[14px] text-gray-900 mb-2">Padrão identificado</div>
                  <div className="text-[14px] leading-[1.5] text-gray-700">{padrao}</div>
                </div>
              )}

              {(mem.analise_resumo || mem.resumo_eco) && (
                <div className="rounded-xl p-4 bg-blue-50/50 backdrop-blur-sm border border-blue-100/60">
                  <div className="font-semibold text-[14px] text-blue-900 mb-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    Reflexão da Eco
                  </div>
                  <div className="text-[14px] leading-[1.5] text-blue-800">
                    {mem.analise_resumo || mem.resumo_eco}
                  </div>
                </div>
              )}

              {mem.contexto && (
                <div className="rounded-xl p-4 bg-gray-50/80 backdrop-blur-sm border border-gray-100">
                  <div className="font-semibold text-[14px] text-gray-900 mb-2">Seu registro</div>
                  <div className="text-[14px] leading-[1.5] text-gray-700">{mem.contexto}</div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
});
MemoryCard.displayName = 'MemoryCard';

/* ---------- Seção principal ---------- */
const MemoriesSection: React.FC = () => {
  const { memories, loading, error } = useMemoryData();
  const navigate = useNavigate();

  const [emoFilter, setEmoFilter] = useState<'all' | string>('all');
  const [query, setQuery] = useState('');

  const emotionOptions = useMemo(() => {
    const set = new Set<string>();
    memories.forEach((m) => getEmotion(m as Memoria) && set.add(getEmotion(m as Memoria)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [memories]);

  const filteredSorted = useMemo(() => {
    const q = normalize(query);
    return memories
      .filter((m0) => {
        const m = m0 as Memoria;
        if (emoFilter !== 'all' && normalize(getEmotion(m)) !== normalize(emoFilter)) return false;
        if (q) {
          const searchString = [
            (m as any).analise_resumo || '',
            (m as any).resumo_eco || '',
            m.contexto || '',
            getTags(m).join(' '),
            (m as any).categoria || '',
            (m as any).dominio_vida || '',
          ].map(normalize).join(' ');
          if (!searchString.includes(q)) return false;
        }
        return true;
      })
      .sort((a0, b0) => {
        const a = a0 as Memoria, b = b0 as Memoria;
        return toDate(getCreatedAt(b)).getTime() - toDate(getCreatedAt(a)).getTime();
      });
  }, [memories, emoFilter, query]);

  const grouped = useMemo(() => groupMemories(filteredSorted as Memoria[]), [filteredSorted]);
  const filtersActive = emoFilter !== 'all' || !!query;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <EcoBubbleLoading size={120} text="Carregando memórias..." breathingSec={2} />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500 text-[15px]">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-0 h-full max-h-[calc(100vh-96px)] overflow-y-auto overflow-x-hidden">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        {/* ----- CARD do cabeçalho (Apple style) ----- */}
        <section className="rounded-[28px] border border-black/[0.08] bg-white/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(0,0,0,0.05),0_16px_60px_rgba(0,0,0,0.04)] p-6 md:p-8 mb-8">
          <header className="mb-6">
            <h1 className="font-display text-[36px] md:text-[48px] leading-[1.06] font-semibold text-gray-900 tracking-tight">
              Memórias
            </h1>
            <p className="mt-3 text-[13px] md:text-[14px] leading-[1.7] text-gray-600 font-medium max-w-2xl">
              Padrões, insights e reflexões organizados pela Eco.
            </p>
          </header>

          {/* filtros dentro do card */}
          <div className="p-4 rounded-2xl bg-white/80 border border-black/[0.06] shadow-sm">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="sr-only" htmlFor="emotion-filter">Filtrar por emoção</label>
                <select
                  id="emotion-filter"
                  value={emoFilter}
                  onChange={(e) => setEmoFilter(e.target.value)}
                  className="w-full h-11 rounded-xl px-4 bg-white/90 backdrop-blur-sm border border-black/[0.06] text-[15px] text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-150"
                >
                  <option value="all">Todas as emoções</option>
                  {emotionOptions.map((emo) => (
                    <option key={emo} value={emo}>
                      {capitalize(emo)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-[2]">
                <label className="sr-only" htmlFor="search">Buscar</label>
                <input
                  id="search"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar em reflexões, tags, domínios..."
                  className="w-full h-11 rounded-xl px-4 bg-white/90 backdrop-blur-sm border border-black/[0.06] text-[15px] text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-150"
                />
              </div>

              {filtersActive && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => { setEmoFilter('all'); setQuery(''); }}
                  className="h-11 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-[14px] font-medium text-gray-700 transition-colors duration-150 shrink-0"
                >
                  Limpar
                </motion.button>
              )}
            </div>
          </div>
        </section>

        {/* ----- LISTA / EMPTY ----- */}
        {(filteredSorted as Memoria[]).length ? (
          <motion.div layout className="space-y-8">
            {(['Hoje','Ontem','Esta semana','Este mês','Anteriores'] as const)
              .filter((bucket) => grouped[bucket]?.length)
              .map((bucket) => (
                <motion.section 
                  key={bucket}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-4">{bucket}</h3>
                  <ul className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
                    {grouped[bucket]!.map((m) => (
                      <MemoryCard
                        key={(m as any).id ?? `${getCreatedAt(m)}-${getEmotion(m)}-${Math.random()}`}
                        mem={m}
                      />
                    ))}
                  </ul>
                </motion.section>
              ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center py-16"
          >
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 18 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <p className="text-[19px] font-semibold text-gray-900 mb-2">
              {filtersActive ? 'Nenhum resultado encontrado' : 'Nenhuma memória ainda'}
            </p>
            <p className="text-[15px] text-gray-500 mb-6 max-w-sm leading-[1.4]">
              {filtersActive ? 'Tente ajustar os filtros para ver mais resultados.'
                              : 'Suas conversas com a Eco aparecerão aqui organizadas por data.'}
            </p>
            {!filtersActive && (
              <button
                onClick={() => navigate('/chat')}
                className="px-6 py-3 rounded-full bg-blue-500 hover:bg-blue-600 text-white font-medium text-[15px] transition-colors duration-150 shadow-sm"
              >
                Começar conversa
              </button>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default MemoriesSection;

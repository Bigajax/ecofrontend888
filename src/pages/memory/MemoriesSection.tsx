// src/pages/memory/MemoriesSection.tsx
import React, { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useMemoryData } from './memoryData';
import type { Memoria } from '../../api/memoriaApi';

/* ---------- Paleta, utilitários ---------- */
const EMOTION_COLORS: Record<string, string> = {
  raiva: '#ef4444',
  irritado: '#f97316',
  frustracao: '#f43f5e',
  medo: '#ea580c',
  incerteza: '#f59e0b',
  alegria: '#22c55e',
  calmo: '#10b981',
  surpresa: '#06b6d4',
  antecipacao: '#3b82f6',
  tristeza: '#8b5cf6',
  neutro: '#94a3b8',
};

const EMOTION_ALIASES: Record<string, string> = {
  calma: 'calmo',
  'bem-estar': 'alegria',
  'bem estar': 'alegria',
  bemestar: 'alegria',
  plenitude: 'alegria',
};

const normalize = (s = '') =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const colorFor = (emo?: string) => {
  const key = normalize(emo || '');
  const mapped = EMOTION_ALIASES[key] || key;
  return EMOTION_COLORS[mapped] ?? EMOTION_COLORS.neutro;
};

const hashStringToHue = (str: string) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h) % 360;
};

const pastelVibrant = (seed: string) =>
  `hsl(${hashStringToHue(seed)}, 70%, 90%)`;

function shade(hex: string, pct: number) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const ch = (i: number) => {
    const v = parseInt(m[i], 16);
    const n = Math.max(0, Math.min(255, Math.round(v + (pct / 100) * 255)));
    return n.toString(16).padStart(2, '0');
  };
  return `#${ch(1)}${ch(2)}${ch(3)}`;
}

/* datas mais tolerantes a formato */
const toDate = (raw?: string) => {
  if (!raw) return new Date('1970-01-01');
  const d = new Date(raw);
  return isNaN(d.getTime()) ? new Date('1970-01-01') : d;
};

const humanDate = (raw?: string) => {
  const d = toDate(raw);
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Ontem';
  return `${diff} dias atrás`;
};

const intensityOf = (m: any) => {
  const v = Number(m?.intensidade ?? m?.intensity ?? 0);
  return Number.isFinite(v) ? Math.min(10, Math.max(0, v)) : 0;
};

const bucketLabelForDate = (iso?: string) => {
  const d = toDate(iso);
  const now = new Date();
  const msDay = 86400000;
  const diffDays = Math.floor((+now - +d) / msDay);
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  const startOfWeek = new Date(now);
  const diffToMonday = ((startOfWeek.getDay() + 6) % 7);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);
  if (d >= startOfWeek) return 'Esta semana';
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  if (d >= startOfMonth) return 'Este mês';
  return 'Antigas';
};

type Grouped = Record<string, Memoria[]>;
const groupMemories = (mems: Memoria[]): Grouped =>
  mems.reduce((acc: Grouped, m) => {
    const label = bucketLabelForDate(m.created_at);
    (acc[label] ||= []).push(m);
    return acc;
  }, {});

/* ---------- Peças Health-like ---------- */
const AccentBubble: React.FC<{ color?: string; className?: string; 'aria-label'?: string }> = ({
  color = '#ff3b30', className = '', ...rest
}) => (
  <span
    {...rest}
    className={`h-10 w-10 rounded-full shrink-0 ${className}`}
    style={{
      background: `
        radial-gradient(circle at 35% 30%, rgba(255,255,255,.95) 0%, rgba(255,255,255,.5) 30%, rgba(255,255,255,0) 34%),
        radial-gradient(circle at 60% 65%, ${color}33 0%, ${color}55 60%, ${color}88 100%)
      `,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.9), 0 10px 30px rgba(2,6,23,.08)',
      border: `1px solid ${color}22`,
      backdropFilter: 'blur(4px)',
    }}
  />
);

const Chip: React.FC<React.PropsWithChildren<{ title?: string }>> = ({ title, children }) => (
  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-white/85 text-[12px] leading-5 text-slate-700 max-w-full">
    {title ? <span className="font-medium text-slate-900">{title}:</span> : null}
    <span className="truncate">{children}</span>
  </div>
);

const ChevronBtn: React.FC<{ open: boolean; onClick: () => void; controlsId: string }> = ({ open, onClick, controlsId }) => (
  <button
    type="button"
    onClick={onClick}
    aria-expanded={open}
    aria-controls={controlsId}
    aria-label={open ? 'Fechar detalhes' : 'Abrir detalhes'}
    className="h-9 w-9 rounded-full border border-slate-200 bg-white/80 hover:bg-white transition grid place-items-center shadow-sm"
  >
    <svg viewBox="0 0 20 20" className={`h-4 w-4 text-slate-700 transition-transform ${open ? 'rotate-180' : ''}`}>
      <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </button>
);

/* ---------- Card Apple-like ---------- */
const MemoryCard: React.FC<{ mem: Memoria }> = React.memo(({ mem }) => {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen(v => !v), []);
  const detailsId = `mem-details-${mem.id ?? Math.random().toString(36).slice(2)}`;

  const cap = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

  const primaryColor = colorFor(mem.emocao_principal);
  const when = humanDate(mem.created_at);
  const intensidade = intensityOf(mem);

  const domain = (mem as any).dominio_vida || (mem as any).dominio || (mem as any).domain || '';

  const padrao =
    (mem as any).padrao_comportamento ||
    (mem as any).padrao_comportamental ||
    (mem as any).padrao ||
    '';

  const tags: string[] = useMemo(() => {
    const raw = (Array.isArray(mem.tags) ? mem.tags : typeof mem.tags === 'string' ? mem.tags.split(/[;,]/) : [])
      .map(t => (t || '').trim())
      .filter(Boolean);
    return Array.from(new Set(raw));
  }, [mem.tags]);

  return (
    <li className="w-full rounded-[22px] border border-black/10 bg-white/90 backdrop-blur shadow-[0_1px_0_rgba(255,255,255,.9),0_8px_28px_rgba(2,6,23,.06)] p-4 md:p-5">
      {/* Header estilo Saúde */}
      <div className="flex items-start gap-3">
        <AccentBubble aria-label={`Emoção: ${mem.emocao_principal || 'Neutro'}`} color={primaryColor} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-[17px] md:text-[18px] leading-snug font-semibold text-slate-900 truncate">
              {cap(mem.emocao_principal) || 'Emoção registrada'}
            </h3>
            <span className="text-[12px] leading-5 text-slate-500 shrink-0">{when}</span>
          </div>

          {domain && (
            <div className="mt-2">
              <p className="text-[13px] font-medium text-slate-500">Domínio</p>
              <div className="mt-1"><Chip>{domain}</Chip></div>
            </div>
          )}
        </div>
      </div>

      {/* Intensidade */}
      <div className="mt-4 h-[6px] rounded-full bg-slate-200/80 overflow-hidden" aria-label={`Intensidade ${intensidade}/10`}>
        <span
          className="block h-full rounded-full"
          style={{ width: `${(intensidade / 10) * 100}%`, background: `linear-gradient(90deg, ${primaryColor}, ${shade(primaryColor, -25)})` }}
        />
      </div>

      {/* Tags (máx 3, vibrantes) */}
      {!!tags.length && (
        <div className="mt-3 flex flex-wrap gap-2">
          {tags.slice(0, 3).map((tag, i) => (
            <span
              key={`${tag}-${i}`}
              className="text-[12px] leading-5 px-3 py-1 rounded-full font-medium border shadow-sm border-slate-200"
              style={{ background: pastelVibrant(tag), color: '#0f172a' }}
            >
              {tag[0].toUpperCase() + tag.slice(1)}
            </span>
          ))}
        </div>
      )}

      {/* Chevron */}
      <div className="mt-3 flex justify-end">
        <ChevronBtn open={open} onClick={toggle} controlsId={detailsId} />
      </div>

      {/* Detalhes com AnimatePresence */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={detailsId}
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 6, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 mt-3 pt-3 border-t border-slate-200/70 text-[14px] leading-[1.6] text-slate-700">
              <div className="flex flex-wrap items-center gap-2">
                <Chip title="Intensidade">{intensidade}/10</Chip>
                {padrao && (
                  <div className="w-full sm:w-auto">
                    <div className="inline-flex items-start gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-white/85 text-[12px] leading-5 text-slate-700 max-w-full">
                      <span className="font-medium text-slate-900">Padrão:</span>
                      <span className="whitespace-normal break-words">{padrao}</span>
                    </div>
                  </div>
                )}
                <Chip title="Criado em">{toDate(mem.created_at).toLocaleDateString('pt-BR')}</Chip>
              </div>

              {(mem as any).analise_resumo && (
                <div className="rounded-xl p-3 bg-white/85 backdrop-blur border border-slate-200 shadow-sm">
                  <div className="font-semibold mb-1 text-slate-900">Reflexão da Eco</div>
                  <div>{(mem as any).analise_resumo}</div>
                </div>
              )}

              {!(mem as any).analise_resumo && (mem as any).resumo_eco && (
                <div className="rounded-xl p-3 bg-white/85 backdrop-blur border border-slate-200 shadow-sm">
                  <div className="font-semibold mb-1 text-slate-900">Reflexão da Eco</div>
                  <div>{(mem as any).resumo_eco}</div>
                </div>
              )}

              {mem.contexto && (
                <div className="rounded-xl p-3 bg-white/85 backdrop-blur border border-slate-200 shadow-sm">
                  <div className="font-semibold mb-1 text-slate-900">Seu pensamento</div>
                  <div>{mem.contexto}</div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
});
MemoryCard.displayName = 'MemoryCard';

/* ---------- Seção ---------- */
const MemoriesSection: React.FC = () => {
  const { memories, loading, error } = useMemoryData();
  const navigate = useNavigate();

  const [emoFilter, setEmoFilter] = useState<'all' | string>('all');
  const [query, setQuery] = useState('');

  const emotionOptions = useMemo(() => {
    const set = new Set<string>();
    memories.forEach((m) => m.emocao_principal && set.add(m.emocao_principal));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [memories]);

  const filteredSorted = useMemo(() => {
    const q = normalize(query);
    return memories
      .filter((m) => {
        if (emoFilter !== 'all' && normalize(m.emocao_principal || '') !== normalize(emoFilter)) return false;
        if (q) {
          const hay = [
            (m as any).analise_resumo || '',
            (m as any).resumo_eco || '',
            m.contexto || '',
            Array.isArray(m.tags) ? m.tags.join(' ') : typeof m.tags === 'string' ? m.tags : '',
            (m as any).categoria || '',
            (m as any).dominio_vida || '',
          ]
            .map(normalize)
            .join(' ');
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => toDate(b.created_at).getTime() - toDate(a.created_at).getTime());
  }, [memories, emoFilter, query]);

  const grouped = useMemo(() => groupMemories(filteredSorted), [filteredSorted]);
  const groupOrder = ['Hoje', 'Ontem', 'Esta semana', 'Este mês', 'Antigas'] as const;
  const filtersActive = emoFilter !== 'all' || !!query;

  if (loading) return <div className="text-neutral-500 text-sm">Carregando…</div>;
  if (error) return <div className="text-rose-500 text-sm">{error}</div>;

  return (
    <div className="min-h-0 h-full max-h-[calc(100vh-96px)] overflow-y-auto pr-1 md:pr-2">
      {/* Header Apple-like */}
      <header className="max-w-[1100px] mx-auto px-2 md:px-0">
        <h1 className="text-[40px] md:text-[52px] leading-[1.05] font-semibold text-slate-900 tracking-tight">
          Memória Emocional
        </h1>
        <p className="mt-2 md:mt-3 text-[16px] md:text-[18px] leading-relaxed text-slate-700 max-w-3xl">
          Uma visão clara e gentil das suas memórias: emoção, domínio da vida, tags e reflexões.
        </p>

        {/* Filtros compactos */}
        <div className="mt-4 p-3 rounded-[22px] bg-white/70 border border-slate-200">
          <div className="flex flex-wrap gap-2 items-stretch">
            <div className="min-w-[220px]">
              <label className="sr-only" htmlFor="f-emo">Filtrar por emoção</label>
              <select
                id="f-emo"
                value={emoFilter}
                onChange={(e) => setEmoFilter(e.target.value)}
                className="h-10 w-full rounded-xl px-3 bg-white/80 border border-slate-200 text-sm"
                aria-label="Filtrar por emoção"
              >
                <option value="all">Todas as emoções</option>
                {emotionOptions.map((emo) => (
                  <option key={emo} value={emo}>
                    {emo[0].toUpperCase() + emo.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[240px]">
              <label className="sr-only" htmlFor="f-q">Buscar</label>
              <input
                id="f-q"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar (tags, domínio, categoria, reflexão)…"
                className="h-10 w-full rounded-xl px-3 bg-white/80 border border-slate-200 text-sm"
                aria-label="Buscar"
              />
            </div>

            {filtersActive && (
              <button
                onClick={() => { setEmoFilter('all'); setQuery(''); }}
                className="h-10 px-3 rounded-xl border border-slate-200 bg-white/80 hover:bg-white text-sm"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Grupos em grid responsivo (auto-fill) */}
      {filteredSorted.length ? (
        <div className="space-y-8 max-w-[1100px] mx-auto mt-6 px-2 md:px-0">
          {groupOrder
            .filter((b) => grouped[b]?.length)
            .map((bucket) => (
              <section key={bucket}>
                <h3 className="text-sm font-semibold text-neutral-500 mb-3">{bucket}</h3>
                <ul className="grid [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))] gap-4">
                  {grouped[bucket]!.map((m) => (
                    <MemoryCard key={m.id ?? `${m.created_at}-${m.emocao_principal}-${Math.random()}`} mem={m} />
                  ))}
                </ul>
              </section>
            ))}
        </div>
      ) : (
        <div className="flex flex-col items-center text-center mt-16 text-neutral-500 px-6">
          <p className="text-lg font-medium mb-2 text-neutral-900">
            {filtersActive ? 'Nenhuma memória coincide com a busca' : 'Você ainda não tem memórias salvas'}
          </p>
          <p className="text-sm mb-6 max-w-xs">
            {filtersActive ? 'Ajuste os filtros para ver mais resultados.' : 'Crie sua primeira agora mesmo.'}
          </p>
          {!filtersActive && (
            <button
              onClick={() => navigate('/chat')}
              className="px-4 py-2 rounded-full text-sm font-medium border border-slate-200 bg-white/70 hover:bg-white transition text-slate-900"
            >
              + Nova memória
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MemoriesSection;

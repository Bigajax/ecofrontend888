// src/pages/memory/MemoriesSection.tsx
import React, { useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useMemoryData } from './memoryData';
import type { Memoria } from '../../api/memoriaApi';

/* ------- helpers de cor / data ------- */
const EMOTION_COLORS: Record<string, string> = {
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

const normalize = (s = '') =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const normalizeEmotion = (s: string) => normalize(s);

const hashStringToHue = (str: string) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h) % 360;
};
const generateConsistentPastelColor = (str: string, o: any = {}) =>
  `hsl(${hashStringToHue(str)}, ${o.saturation ?? 25}%, ${o.lightness ?? 88}%)`;

const getEmotionColor = (n: string) =>
  EMOTION_COLORS[normalizeEmotion(n)] || generateConsistentPastelColor(n);

const toDate = (raw?: string) => {
  const d = raw ? new Date(raw) : new Date('1970-01-01');
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
  const day = startOfWeek.getDay();
  const diffToMonday = (day + 6) % 7;
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

/* ------- Card ------- */
const MemoryCard: React.FC<{ mem: Memoria }> = React.memo(({ mem }) => {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  const cap = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
  const color = getEmotionColor(mem.emocao_principal || 'neutro');
  const when = humanDate(mem.created_at);
  const intensidade = intensityOf(mem);
  const preview = (mem.analise_resumo || mem.contexto || '').trim();

  // tags podem vir como string simples, array ou undefined
  const tags: string[] = useMemo(() => {
    const raw = (Array.isArray(mem.tags) ? mem.tags : typeof mem.tags === 'string' ? mem.tags.split(/[;,]/) : [])
      .map((t) => (t || '').trim())
      .filter(Boolean);
    // remove duplicadas
    return Array.from(new Set(raw));
  }, [mem.tags]);

  return (
    <li className="rounded-3xl border border-black/10 bg-white/70 backdrop-blur-md shadow-md p-4 transition-all">
      <button type="button" onClick={toggle} aria-expanded={open} className="w-full text-left">
        <div className="flex items-center gap-3">
          <span
            className="h-9 w-9 rounded-full ring-2 ring-white/70 shadow-sm shrink-0"
            style={{ background: color, boxShadow: 'inset 0 1px 0 rgba(255,255,255,.6)' }}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[15px] font-semibold text-neutral-900 truncate">
                {cap(mem.emocao_principal) || 'Emoção'}
              </h3>
              <span className="text-[12px] text-neutral-500 shrink-0">{when}</span>
            </div>
            {preview && (
              <p
                className="text-sm text-neutral-700 mt-0.5"
                style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
              >
                {preview}
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 h-1.5 rounded-full bg-neutral-200/60 overflow-hidden" aria-label={`Intensidade ${intensidade}/10`}>
          <span
            className="block h-full rounded-full"
            style={{ width: `${(intensidade / 10) * 100}%`, background: `linear-gradient(90deg, ${color}, rgba(0,0,0,0.08))` }}
          />
        </div>

        {!!tags.length && (
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((tag, i) => (
              <span
                key={`${tag}-${i}`}
                className="text-xs px-3 py-1 rounded-full font-medium border border-black/10 shadow-sm"
                style={{ background: generateConsistentPastelColor(tag), color: '#0f172a' }}
              >
                {tag[0].toUpperCase() + tag.slice(1)}
              </span>
            ))}
          </div>
        )}

        <div className="mt-3 flex justify-end">
          <span className="text-xs font-medium text-sky-700">{open ? 'Fechar ↑' : 'Ver mais ↓'}</span>
        </div>
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 mt-3 pt-3 border-t border-neutral-200 text-sm text-neutral-700"
        >
          {mem.analise_resumo && (
            <div className="rounded-xl p-3 bg-white/70 backdrop-blur border border-neutral-200 shadow-sm">
              <div className="font-semibold mb-1 text-neutral-900">Reflexão da Eco</div>
              <div>{mem.analise_resumo}</div>
            </div>
          )}
          {mem.contexto && (
            <div className="rounded-xl p-3 bg-white/70 backdrop-blur border border-neutral-200 shadow-sm">
              <div className="font-semibold mb-1 text-neutral-900">Seu pensamento</div>
              <div>{mem.contexto}</div>
            </div>
          )}
        </motion.div>
      )}
    </li>
  );
});
MemoryCard.displayName = 'MemoryCard';

/* ------- Seção ------- */
const MemoriesSection: React.FC = () => {
  const { memories, loading, error } = useMemoryData();
  const navigate = useNavigate();

  const [emoFilter, setEmoFilter] = useState<'all' | string>('all');
  const [query, setQuery] = useState('');
  const [minIntensity, setMinIntensity] = useState(0);

  // opções únicas de emoção (ordenadas alfabeticamente)
  const emotionOptions = useMemo(() => {
    const set = new Set<string>();
    memories.forEach((m) => m.emocao_principal && set.add(m.emocao_principal));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [memories]);

  // aplica filtros + ordena por data desc ANTES de agrupar
  const filteredSorted = useMemo(() => {
    const q = normalize(query);
    return memories
      .filter((m) => {
        if (emoFilter !== 'all' && normalize(m.emocao_principal || '') !== normalize(emoFilter)) return false;
        if (Number.isFinite(minIntensity)) {
          const inten = intensityOf(m);
          if (inten < minIntensity) return false;
        }
        if (q) {
          const hay = [
            m.analise_resumo || '',
            m.contexto || '',
            Array.isArray(m.tags) ? m.tags.join(' ') : typeof m.tags === 'string' ? m.tags : '',
          ]
            .map(normalize)
            .join(' ');
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => toDate(b.created_at).getTime() - toDate(a.created_at).getTime());
  }, [memories, emoFilter, minIntensity, query]);

  const grouped = useMemo(() => groupMemories(filteredSorted), [filteredSorted]);

  const groupOrder = ['Hoje', 'Ontem', 'Esta semana', 'Este mês', 'Antigas'] as const;
  const filtersActive = emoFilter !== 'all' || !!query || minIntensity > 0;

  if (loading) return <div className="flex justify-center items-center h-full text-neutral-500 text-sm">Carregando…</div>;
  if (error)   return <div className="flex justify-center items-center h-full text-rose-500 text-sm">{error}</div>;

  return (
    <>
      {/* filtros rápidos */}
      <div className="glass-panel p-3 rounded-2xl mb-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <label className="sr-only" htmlFor="emoSelect">Filtrar por emoção</label>
          <select
            id="emoSelect"
            value={emoFilter}
            onChange={(e) => setEmoFilter(e.target.value)}
            className="h-10 rounded-xl px-3 bg-white/80 border border-black/10 text-sm"
          >
            <option value="all">Todas as emoções</option>
            {emotionOptions.map((emo) => (
              <option key={emo} value={emo}>
                {emo[0].toUpperCase() + emo.slice(1)}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="searchInput">Buscar</label>
          <input
            id="searchInput"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar em tags, reflexão ou pensamento…"
            className="h-10 rounded-xl px-3 bg-white/80 border border-black/10 text-sm"
          />

          <div className="flex items-center gap-3">
            <label className="text-xs text-neutral-600 w-24" htmlFor="intensityRange">
              Intensidade ≥ {minIntensity}
            </label>
            <input
              id="intensityRange"
              type="range"
              min={0}
              max={10}
              step={1}
              value={minIntensity}
              onChange={(e) => setMinIntensity(Number(e.target.value))}
              className="flex-1"
              aria-label={`Intensidade mínima ${minIntensity}`}
            />
          </div>
        </div>

        {filtersActive && (
          <div className="mt-2 flex justify-end">
            <button
              onClick={() => {
                setEmoFilter('all');
                setQuery('');
                setMinIntensity(0);
              }}
              className="text-xs px-3 py-1 rounded-full border border-black/10 bg-white/70 hover:bg-white transition"
            >
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      {/* lista */}
      {filteredSorted.length ? (
        <div className="space-y-6">
          {groupOrder
            .filter((b) => grouped[b]?.length)
            .map((bucket) => (
              <section key={bucket}>
                <h3 className="text-sm font-semibold text-neutral-500 mb-2">{bucket}</h3>
                <ul className="space-y-3">
                  {grouped[bucket]!.map((m) => (
                    <MemoryCard key={m.id ?? `${m.created_at}-${m.emocao_principal}`} mem={m} />
                  ))}
                </ul>
              </section>
            ))}
        </div>
      ) : (
        <div className="flex flex-col items-center text-center mt-16 text-neutral-500 px-6">
          <p className="text-lg font-medium mb-2 text-neutral-900">
            {filtersActive ? 'Nenhuma memória coincide com os filtros' : 'Você ainda não tem memórias salvas'}
          </p>
          <p className="text-sm mb-6 max-w-xs">
            {filtersActive ? 'Ajuste os filtros para ver mais resultados.' : 'Crie sua primeira agora mesmo.'}
          </p>
          {!filtersActive && (
            <button
              onClick={() => navigate('/chat')}
              className="px-4 py-2 rounded-full text-sm font-medium border border-neutral-300 bg-white/60 backdrop-blur hover:bg-white transition text-neutral-900"
            >
              + Nova memória
            </button>
          )}
        </div>
      )}
    </>
  );
};

export default MemoriesSection;

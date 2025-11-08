import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Bookmark, Share2 } from 'lucide-react';

import EcoEyeBadge from '../EcoEyeBadge';
import type { MemoryCardDTO } from '../../pages/memory/memoryCardDto';

const toRgb = (hex?: string) => {
  if (!hex) return null;
  const sanitized = hex.replace('#', '');
  if (sanitized.length !== 6) return null;
  const bigint = Number.parseInt(sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b };
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// Helper para gerar gradiente sutil baseado na cor principal
const getGradientBg = (accentColor?: string) => {
  if (!accentColor) return 'from-slate-50 to-slate-100/50';

  const colorMap: Record<string, string> = {
    '#10b981': 'from-emerald-50/60 to-emerald-100/30',
    '#64748b': 'from-slate-50/60 to-slate-100/30',
    '#e11d48': 'from-rose-50/60 to-rose-100/30',
    '#4f46e5': 'from-indigo-50/60 to-indigo-100/30',
    '#f97316': 'from-orange-50/60 to-orange-100/30',
    '#8b5cf6': 'from-violet-50/60 to-violet-100/30',
    '#0ea5e9': 'from-sky-50/60 to-sky-100/30',
  };

  return colorMap[accentColor] || 'from-slate-50 to-slate-100/50';
};

const CONTEXT_PREVIEW_LIMIT = 260;
const TAG_DISPLAY_LIMIT = 5;

type MemoryCardProps = {
  mem: MemoryCardDTO;
  onOpenChat?: (memory: MemoryCardDTO) => void;
  onToggleFavorite?: (memory: MemoryCardDTO, next: boolean) => void;
  onEditTags?: (memory: MemoryCardDTO) => void;
};

const MemoryCard: React.FC<MemoryCardProps> = ({ mem, onOpenChat, onToggleFavorite, onEditTags }) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [excerptExpanded, setExcerptExpanded] = useState(false);

  const detailsId = `memory-details-${mem.id}`;
  const excerptId = `memory-excerpt-${mem.id}`;
  const accentRgb = useMemo(() => toRgb(mem.accent), [mem.accent]);

  const intensityPercent = mem.intensidade == null ? 0 : clamp((mem.intensidade / 10) * 100, 0, 100);
  const intensityLabel = mem.intensidade == null ? '—' : `${mem.intensidade}/10`;
  const intensityValueText = mem.intensidade == null ? 'Sem dado' : `${mem.intensidade} de 10`;
  const intensityLabelId = `memory-intensity-${mem.id}`;

  const tags = mem.tags ?? [];
  const showTagOverflow = tags.length > TAG_DISPLAY_LIMIT;
  const visibleTags = showTagOverflow ? tags.slice(0, TAG_DISPLAY_LIMIT - 1) : tags.slice(0, TAG_DISPLAY_LIMIT);
  const normalizedTags = visibleTags.map((tag) => tag.charAt(0).toUpperCase() + tag.slice(1));
  const extraTags = showTagOverflow ? tags.length - visibleTags.length : 0;

  const context = mem.contexto?.trim() || mem.resumo?.trim() || '';
  const hasExcerpt = Boolean(context);
  const shouldShowExcerptToggle = hasExcerpt && context.length > CONTEXT_PREVIEW_LIMIT;

  const metadataParts = useMemo(() => {
    const parts: string[] = [];
    if (mem.nivelAbertura != null) {
      parts.push(`Abertura ${mem.nivelAbertura}`);
    }
    if (mem.timeAgo) {
      parts.push(mem.timeAgo);
    } else if (mem.fallbackDate) {
      parts.push(mem.fallbackDate);
    }
    if (mem.domain) {
      parts.push(mem.domain);
    }
    return parts;
  }, [mem.domain, mem.fallbackDate, mem.nivelAbertura, mem.timeAgo]);

  const handleToggleDetails = () => setDetailsOpen((value) => !value);
  const handleOpenChat = () => {
    if (onOpenChat) {
      onOpenChat(mem);
      return;
    }
    window.dispatchEvent(
      new CustomEvent('eco:memory-open-chat', {
        detail: {
          memoryId: mem.id,
          mensagemId: mem.mensagemId,
          contexto: mem.contexto,
        },
      }),
    );
  };

  const handleToggleFavorite = () => {
    setIsFavorite((previous) => {
      const next = !previous;
      onToggleFavorite?.(mem, next);
      return next;
    });
  };

  const handleEditTags = () => {
    onEditTags?.(mem);
  };

  return (
    <motion.li
      layout
      className={clsx(
        'group relative flex flex-col rounded-2xl border border-black/5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-sky-500/40',
        `bg-gradient-to-br ${getGradientBg(mem.accent)}`,
        isFavorite && 'ring-2 ring-sky-400/60 shadow-md',
      )}
    >
      {/* Header com emoção + actions */}
      <div className="flex items-start justify-between gap-3 border-b border-black/5 px-4 pt-4 pb-3 md:px-5 md:pt-5">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <EcoEyeBadge emotion={mem.emocao} className="shrink-0 mt-1" size={40} />
          <div className="min-w-0 flex-1">
            <h3 className="break-words text-lg font-bold leading-tight text-slate-900">{mem.titulo || mem.emocao}</h3>
            <p className="mt-1 text-xs font-medium text-slate-600">{mem.timeAgo || mem.fallbackDate}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleDetails}
          aria-expanded={detailsOpen}
          aria-controls={detailsId}
          aria-label={detailsOpen ? 'Recolher detalhes da memória' : 'Expandir detalhes da memória'}
          className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-black/5 text-slate-500 transition-all duration-150 hover:bg-white/50 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500/40"
        >
          <ChevronDown className={clsx('h-4 w-4 transition-transform duration-300', detailsOpen && 'rotate-180')} />
        </button>
      </div>

      {/* Intensidade - Visual Prominente */}
      <div className="space-y-2 px-4 pt-3 pb-4 md:px-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">Intensidade</span>
          <span
            className="inline-flex items-center justify-center rounded-full font-bold text-white w-10 h-10"
            style={{ backgroundColor: mem.accent || '#64748b' }}
          >
            {mem.intensidade ?? '—'}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-black/10 overflow-hidden">
          <div
            role="progressbar"
            aria-labelledby={intensityLabelId}
            aria-valuenow={mem.intensidade ?? undefined}
            aria-valuemin={0}
            aria-valuemax={10}
            aria-valuetext={intensityValueText}
            className={clsx(
              'h-full rounded-full transition-[width] duration-500 ease-out',
              mem.intensidade == null && 'opacity-0',
            )}
            style={{
              width: `${intensityPercent}%`,
              background: mem.accent || '#64748b',
            }}
          />
        </div>
      </div>

      {/* Domínio, Categoria, Padrão - Badges Estruturados */}
      <div className="flex flex-wrap gap-2 border-b border-black/5 px-4 py-3 md:px-5">
        {mem.domain && (
          <div className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium" style={{
            backgroundColor: `${mem.accent}20`,
            color: mem.accent,
            border: `1px solid ${mem.accent}40`,
          }}>
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: mem.accent }} />
            <span className="font-semibold capitalize">{mem.domain}</span>
          </div>
        )}
        {mem.categoria && (
          <div className="inline-flex items-center gap-2 rounded-lg bg-purple-100/70 px-3 py-1.5 text-xs font-medium text-purple-700 border border-purple-200/60">
            <span>📁</span>
            <span className="capitalize">{mem.categoria}</span>
          </div>
        )}
      </div>

      {/* Contexto e Tags */}
      <div className="space-y-3 px-4 py-3 md:px-5 flex-1 min-w-0">
        {hasExcerpt ? (
          <motion.div
            layout
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="relative"
            id={excerptId}
          >
            <p
              className={clsx(
                'text-sm leading-relaxed text-slate-700 whitespace-pre-line',
                !excerptExpanded &&
                  'overflow-hidden [display:-webkit-box] [-webkit-line-clamp:3] [-webkit-box-orient:vertical]',
              )}
            >
              {context}
            </p>
            {shouldShowExcerptToggle && (
              <button
                type="button"
                onClick={() => setExcerptExpanded((value) => !value)}
                className="mt-2 text-xs font-semibold text-slate-600 underline underline-offset-2 transition-colors duration-150 hover:text-slate-800"
                aria-expanded={excerptExpanded}
                aria-controls={excerptId}
              >
                {excerptExpanded ? 'Ver menos' : 'Ver mais'}
              </button>
            )}
          </motion.div>
        ) : null}

        {normalizedTags.length > 0 || extraTags > 0 ? (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {normalizedTags.map((tag, index) => (
              <span
                key={`${tag}-${index}`}
                className="inline-flex items-center gap-1 rounded-full bg-white/70 border border-black/5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white/90 transition-colors"
              >
                #{tag.toLowerCase()}
              </span>
            ))}
            {extraTags > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/70 border border-black/5 px-3 py-1.5 text-xs font-medium text-slate-600">
                +{extraTags}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <AnimatePresence initial={false}>
        {detailsOpen ? (
          <motion.div
            key="details"
            id={detailsId}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="space-y-3 border-t border-black/5 px-4 pt-4 pb-4 md:px-5"
          >
            {mem.padrao ? (
              <div className="space-y-2 rounded-xl border border-black/5 bg-white/50 p-3.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 block">Padrão comportamental</span>
                <p className="text-sm leading-relaxed text-slate-700">{mem.padrao}</p>
              </div>
            ) : null}

            {mem.resumo ? (
              <div className="space-y-2 rounded-xl border border-black/5 bg-white/50 p-3.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 block">Análise da ECO</span>
                <p className="text-sm leading-relaxed text-slate-700">{mem.resumo}</p>
                {mem.resumoCompleto && mem.resumoCompleto !== mem.resumo ? (
                  <p className="text-xs text-slate-500 italic">→ Texto encurtado para caber no cartão</p>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={handleOpenChat}
                className={clsx(
                  'inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500/40',
                  'border border-black/10 bg-white text-slate-700 hover:bg-slate-50 active:scale-95'
                )}
                aria-label="Abrir memória no chat"
              >
                💬 Abrir no chat
              </button>
              <button
                type="button"
                onClick={handleToggleFavorite}
                className={clsx(
                  'inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500/40 active:scale-95',
                  isFavorite
                    ? 'border border-sky-300/70 bg-sky-100/60 text-sky-700 hover:bg-sky-100'
                    : 'border border-black/10 bg-white text-slate-700 hover:bg-slate-50',
                )}
                aria-label={isFavorite ? 'Remover memória dos favoritos' : 'Marcar memória como favorita'}
              >
                {isFavorite ? '⭐ Favorita' : '☆ Favoritar'}
              </button>
              {onEditTags ? (
                <button
                  type="button"
                  onClick={handleEditTags}
                  className={clsx(
                    'inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition-all duration-150 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500/40 active:scale-95'
                  )}
                  aria-label="Editar tags da memória"
                >
                  ✏️ Tags
                </button>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.li>
  );
};

export default React.memo(MemoryCard);

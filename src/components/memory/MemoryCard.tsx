import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';

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
        'group relative flex flex-col gap-3 rounded-2xl border border-black/5 bg-white p-4 shadow-sm shadow-black/5 transition-[box-shadow,transform] duration-200 hover:-translate-y-[1px] hover:shadow-md hover:shadow-black/10 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-sky-500/40 md:p-5',
        isFavorite && 'ring-1 ring-sky-300/40',
      )}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-5">
        <EcoEyeBadge emotion={mem.emocao} className="mx-auto md:mx-0" />

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <h3 className="break-words text-base font-semibold leading-snug text-slate-900">{mem.titulo || mem.emocao}</h3>
              {metadataParts.length > 0 ? (
                <p className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  {metadataParts.map((part, index) => (
                    <React.Fragment key={`${part}-${index}`}>
                      {index > 0 ? <span aria-hidden className="text-slate-300">•</span> : null}
                      <span className="truncate text-sm text-slate-500">{part}</span>
                    </React.Fragment>
                  ))}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={handleToggleDetails}
              aria-expanded={detailsOpen}
              aria-controls={detailsId}
              aria-label={detailsOpen ? 'Recolher detalhes da memória' : 'Expandir detalhes da memória'}
              className="ml-1 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-black/5 text-slate-500 transition-colors duration-150 hover:border-black/10 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500/40"
            >
              <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4">
                <circle cx="4" cy="10" r="1.5" fill="currentColor" />
                <circle cx="10" cy="10" r="1.5" fill="currentColor" />
                <circle cx="16" cy="10" r="1.5" fill="currentColor" />
              </svg>
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span id={intensityLabelId}>Intensidade</span>
              <span className="font-semibold text-slate-900">{intensityLabel}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-200">
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
                  boxShadow: accentRgb
                    ? `0 6px 14px rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.24)`
                    : '0 6px 14px rgba(15, 23, 42, 0.18)',
                }}
              />
            </div>
          </div>

          {hasExcerpt ? (
            <div className="space-y-2">
              <motion.div
                layout
                transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                className="relative"
                id={excerptId}
              >
                <p
                  className={clsx(
                    'whitespace-pre-line text-sm leading-relaxed text-slate-600',
                    !excerptExpanded &&
                      'overflow-hidden [display:-webkit-box] [-webkit-line-clamp:4] [-webkit-box-orient:vertical]',
                  )}
                >
                  {context}
                </p>
              </motion.div>
              {shouldShowExcerptToggle ? (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setExcerptExpanded((value) => !value)}
                    className="text-sm font-medium text-slate-500 underline-offset-2 transition-colors duration-150 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500/40"
                    aria-expanded={excerptExpanded}
                    aria-controls={excerptId}
                  >
                    {excerptExpanded ? 'Ver menos' : 'Ver mais'}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {normalizedTags.length > 0 || extraTags > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {normalizedTags.map((tag, index) => (
                <span
                  key={`${tag}-${index}`}
                  className="inline-flex items-center gap-1 rounded-full border border-black/5 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                >
                  {tag}
                </span>
              ))}
              {extraTags > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-black/5 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  +{extraTags}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
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
            className="space-y-3 border-t border-slate-100 pt-4"
          >
            {mem.resumo ? (
              <div className="space-y-2 rounded-2xl border border-black/5 bg-slate-50 p-4">
                <span className="text-sm font-semibold text-slate-800">Resumo da Eco</span>
                <p className="text-sm leading-relaxed text-slate-600">{mem.resumo}</p>
                {mem.resumoCompleto && mem.resumoCompleto !== mem.resumo ? (
                  <p className="text-xs text-slate-400">Texto encurtado para caber no cartão.</p>
                ) : null}
              </div>
            ) : null}

            {mem.padrao ? (
              <div className="space-y-2 rounded-2xl border border-black/5 bg-slate-50 p-4">
                <span className="text-sm font-semibold text-slate-800">Padrão comportamental</span>
                <p className="text-sm leading-relaxed text-slate-600">{mem.padrao}</p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2 text-sm text-slate-500">
              <span className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: mem.accent }} aria-hidden />
                {mem.domain}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white px-3 py-1">
                Registrada em {mem.fallbackDate}
              </span>
              {mem.categoria ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white px-3 py-1">
                  Categoria {mem.categoria}
                </span>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={handleOpenChat}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors duration-150 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500/40"
                aria-label="Abrir memória no chat"
              >
                Abrir no chat
              </button>
              <button
                type="button"
                onClick={handleToggleFavorite}
                className={clsx(
                  'inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-black/10 px-4 py-2 text-sm font-semibold transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500/40',
                  isFavorite
                    ? 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100/70'
                    : 'bg-white text-slate-700 hover:bg-slate-50',
                )}
                aria-label={isFavorite ? 'Remover memória dos favoritos' : 'Marcar memória como favorita'}
              >
                {isFavorite ? 'Favorita' : 'Marcar como favorita'}
              </button>
              {onEditTags ? (
                <button
                  type="button"
                  onClick={handleEditTags}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors duration-150 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500/40"
                  aria-label="Editar tags da memória"
                >
                  Editar tags
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

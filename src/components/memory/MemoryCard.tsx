import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

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
        'group relative flex flex-col rounded-2xl border border-[#E8E3DD] bg-white/60 backdrop-blur-md',
        'transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1)',
        'hover:shadow-[0_4px_30px_rgba(0,0,0,0.08)] hover:-translate-y-0.5',
        'focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#A7846C]/40',
        'shadow-[0_4px_30px_rgba(0,0,0,0.04)]',
        isFavorite && 'ring-1 ring-[#C6A995]/60 shadow-[0_4px_30px_rgba(0,0,0,0.08)]',
      )}
    >
      {/* Header: Emoção + Título + Data */}
      <div className="flex items-start gap-4 px-5 pt-5 pb-4 border-b border-[#E8E3DD]/60">
        <EcoEyeBadge emotion={mem.emocao} className="shrink-0" size={36} />

        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg font-normal text-[#38322A] leading-tight break-words">
            {mem.titulo || mem.emocao}
          </h3>
          <p className="mt-2 text-xs text-[#9C938A] font-primary">
            {mem.timeAgo || mem.fallbackDate}
          </p>
        </div>

        <button
          type="button"
          onClick={handleToggleDetails}
          aria-expanded={detailsOpen}
          aria-controls={detailsId}
          aria-label={detailsOpen ? 'Recolher detalhes da memória' : 'Expandir detalhes da memória'}
          className={clsx(
            'shrink-0 mt-0.5 rounded-full p-1.5 text-[#A7846C]',
            'transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1)',
            'hover:bg-white/60 hover:text-[#38322A]',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A7846C]/40'
          )}
        >
          <ChevronDown
            className={clsx('h-5 w-5 transition-transform duration-300', detailsOpen && 'rotate-180')}
            strokeWidth={1.5}
          />
        </button>
      </div>

      {/* Intensidade */}
      <div className="px-5 pt-4 pb-3 border-b border-[#E8E3DD]/60">
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <label htmlFor={intensityLabelId} className="text-xs font-display font-normal text-[#A7846C] uppercase tracking-wide">
            Intensidade
          </label>
          <span id={intensityLabelId} className="text-sm font-primary font-semibold text-[#38322A]">
            {intensityLabel}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-[#E8E3DD] overflow-hidden">
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
              background: mem.accent || '#A7846C',
            }}
          />
        </div>
      </div>

      {/* Domínio + Categoria */}
      {(mem.domain || mem.categoria) && (
        <div className="flex flex-wrap gap-2 px-5 py-3 border-b border-[#E8E3DD]/60">
          {mem.domain && (
            <span className="inline-flex items-center gap-2 rounded-lg px-3 py-1 text-xs font-primary font-medium text-[#A7846C] bg-[#F3EEE7]/60 border border-[#E8E3DD]">
              {mem.domain}
            </span>
          )}
          {mem.categoria && (
            <span className="inline-flex items-center gap-2 rounded-lg px-3 py-1 text-xs font-primary font-medium text-[#A7846C] bg-[#F3EEE7]/60 border border-[#E8E3DD]">
              {mem.categoria}
            </span>
          )}
        </div>
      )}

      {/* Contexto + Tags */}
      <div className="px-5 py-4 space-y-3 flex-1 min-w-0">
        {hasExcerpt ? (
          <motion.div
            layout
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="relative"
            id={excerptId}
          >
            <p
              className={clsx(
                'text-sm font-primary font-light text-[#38322A] leading-relaxed whitespace-pre-line',
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
                className={clsx(
                  'mt-2 text-xs font-primary font-medium text-[#A7846C]',
                  'transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1)',
                  'hover:text-[#38322A]'
                )}
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
                className={clsx(
                  'inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-primary font-medium',
                  'bg-[#F3EEE7]/60 border border-[#E8E3DD] text-[#A7846C]',
                  'transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1)',
                  'hover:bg-[#F3EEE7]/80 hover:-translate-y-0.5'
                )}
              >
                {tag}
              </span>
            ))}
            {extraTags > 0 ? (
              <span className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-primary font-medium bg-[#F3EEE7]/60 border border-[#E8E3DD] text-[#9C938A]">
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
            className="space-y-3 border-t border-[#E8E3DD]/60 px-5 pt-4 pb-5"
          >
            {mem.padrao ? (
              <div className="space-y-2 rounded-lg border border-[#E8E3DD] bg-[#F3EEE7]/40 p-3.5">
                <span className="text-xs font-display font-normal text-[#A7846C] uppercase tracking-wide block">Padrão</span>
                <p className="text-sm font-primary font-light text-[#38322A] leading-relaxed">{mem.padrao}</p>
              </div>
            ) : null}

            {mem.resumo ? (
              <div className="space-y-2 rounded-lg border border-[#E8E3DD] bg-[#F3EEE7]/40 p-3.5">
                <span className="text-xs font-display font-normal text-[#A7846C] uppercase tracking-wide block">Análise</span>
                <p className="text-sm font-primary font-light text-[#38322A] leading-relaxed">{mem.resumo}</p>
                {mem.resumoCompleto && mem.resumoCompleto !== mem.resumo ? (
                  <p className="text-xs text-[#9C938A] italic">→ Resumido</p>
                ) : null}
              </div>
            ) : null}

            {mem.resumoEco ? (
              <div className="space-y-2 rounded-lg border border-[#E8E3DD] bg-[#F3EEE7]/40 p-3.5">
                <span className="text-xs font-display font-normal text-[#A7846C] uppercase tracking-wide block">
                  Resumo da Eco
                </span>
                <p className="text-sm font-primary font-light text-[#38322A] leading-relaxed">{mem.resumoEco}</p>
              </div>
            ) : null}

            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={handleOpenChat}
                className={clsx(
                  'flex-1 px-4 py-2.5 rounded-lg text-sm font-primary font-medium',
                  'border border-[#E8E3DD] bg-white/60 text-[#A7846C]',
                  'transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1)',
                  'hover:bg-white hover:-translate-y-0.5 hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)]',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A7846C]/40'
                )}
                aria-label="Abrir memória no chat"
              >
                Abrir no chat
              </button>
              <button
                type="button"
                onClick={handleToggleFavorite}
                className={clsx(
                  'flex-1 px-4 py-2.5 rounded-lg text-sm font-primary font-medium',
                  'transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1)',
                  'hover:-translate-y-0.5',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A7846C]/40',
                  isFavorite
                    ? 'border border-[#C6A995] bg-[#F3EEE7]/60 text-[#A7846C] hover:bg-[#F3EEE7]/80 hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)]'
                    : 'border border-[#E8E3DD] bg-white/60 text-[#A7846C] hover:bg-white hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)]',
                )}
                aria-label={isFavorite ? 'Remover memória dos favoritos' : 'Marcar memória como favorita'}
              >
                {isFavorite ? 'Desfavoritar' : 'Favoritar'}
              </button>
              {onEditTags ? (
                <button
                  type="button"
                  onClick={handleEditTags}
                  className={clsx(
                    'flex-1 px-4 py-2.5 rounded-lg text-sm font-primary font-medium',
                    'border border-[#E8E3DD] bg-white/60 text-[#A7846C]',
                    'transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1)',
                    'hover:bg-white hover:-translate-y-0.5 hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)]',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A7846C]/40'
                  )}
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

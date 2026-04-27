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
        'group relative flex flex-col rounded-2xl bg-white',
        'transition-all duration-300',
        'border border-black/[0.07] shadow-[0_4px_24px_rgba(13,52,97,0.06)]',
        'hover:shadow-[0_8px_40px_rgba(13,52,97,0.12)] hover:-translate-y-0.5',
        'focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#1A4FB5]/40',
        isFavorite && 'ring-1 ring-[#1A4FB5]/30 shadow-[0_8px_40px_rgba(26,79,181,0.10)]',
      )}
    >
      {/* Header: Emoção + Título + Data */}
      <div className="flex items-start gap-4 px-5 pt-5 pb-4 border-b border-black/[0.06]">
        <EcoEyeBadge emotion={mem.emocao} className="shrink-0" size={36} />

        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg font-normal text-[#0D3461] leading-tight break-words">
            {mem.titulo || mem.emocao}
          </h3>
          <p className="mt-2 text-xs text-[#5A8AAD] font-primary">
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
            'shrink-0 mt-0.5 rounded-full p-1.5 text-[#5A8AAD]',
            'transition-all duration-300',
            'hover:bg-[#EDF4FF] hover:text-[#0D3461]',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A4FB5]/40'
          )}
        >
          <ChevronDown
            className={clsx('h-5 w-5 transition-transform duration-300', detailsOpen && 'rotate-180')}
            strokeWidth={1.5}
          />
        </button>
      </div>

      {/* Intensidade */}
      <div className="px-5 pt-4 pb-3 border-b border-black/[0.06]">
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <label htmlFor={intensityLabelId} className="text-xs font-display font-normal text-[#5A8AAD] uppercase tracking-widest">
            Intensidade
          </label>
          <span id={intensityLabelId} className="text-sm font-primary font-semibold text-[#0D3461]">
            {intensityLabel}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-black/[0.06] overflow-hidden">
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
              background: 'linear-gradient(90deg, #1A4FB5, #0A6BBF)',
            }}
          />
        </div>
      </div>

      {/* Domínio + Categoria */}
      {(mem.domain || mem.categoria) && (
        <div className="flex flex-wrap gap-2 px-5 py-3 border-b border-black/[0.06]">
          {mem.domain && (
            <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-primary font-medium text-[#1A4FB5] bg-[#EDF4FF] border border-[#1A4FB5]/10">
              {mem.domain}
            </span>
          )}
          {mem.categoria && (
            <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-primary font-medium text-[#1A4FB5] bg-[#EDF4FF] border border-[#1A4FB5]/10">
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
                'text-sm font-primary font-light text-[#1A3A5C] leading-relaxed whitespace-pre-line',
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
                  'mt-2 text-xs font-primary font-medium text-[#1A4FB5]',
                  'transition-all duration-200',
                  'hover:text-[#0D3461]'
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
                  'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-primary font-medium',
                  'bg-[#EDF4FF] border border-[#1A4FB5]/10 text-[#1A4FB5]',
                  'transition-all duration-200',
                  'hover:bg-[#D8EBFF] hover:-translate-y-0.5'
                )}
              >
                {tag}
              </span>
            ))}
            {extraTags > 0 ? (
              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-primary font-medium bg-[#EDF4FF] border border-[#1A4FB5]/10 text-[#5A8AAD]">
                +{extraTags}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* ECO Insight Preview — visible without expanding */}
      {mem.resumoEco && mem.resumoEco !== mem.contexto && (
        <div
          className="mx-5 mb-4 rounded-xl p-3.5 flex gap-2.5"
          style={{ backgroundColor: '#EDF4FF', border: '1px solid rgba(26,79,181,0.08)' }}
        >
          <div className="shrink-0 mt-0.5">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1A4FB5, #0D3461)' }}
            >
              <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" aria-hidden>
                <circle cx="12" cy="12" r="4.5" fill="white" fillOpacity="0.9" />
                <path d="M3 12c2.4-4 5.4-6.5 9-6.5S18.6 8 21 12c-2.4 4-5.4 6.5-9 6.5S5.4 16 3 12Z"
                  stroke="white" strokeOpacity="0.6" strokeWidth="1.2" fill="none" strokeLinecap="round" />
              </svg>
            </div>
          </div>
          <p className="text-[12px] leading-relaxed flex-1" style={{ color: '#1A3A5C' }}>
            {mem.resumoEco.length > 120 ? mem.resumoEco.slice(0, 120) + '…' : mem.resumoEco}
          </p>
        </div>
      )}

      <AnimatePresence initial={false}>
        {detailsOpen ? (
          <motion.div
            key="details"
            id={detailsId}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="space-y-3 border-t border-black/[0.06] px-5 pt-4 pb-5"
          >
            {mem.padrao ? (
              <div className="space-y-2 rounded-xl border border-black/[0.06] bg-[#EDF4FF]/40 p-3.5">
                <span className="text-xs font-display font-normal text-[#5A8AAD] uppercase tracking-widest block">Padrão</span>
                <p className="text-sm font-primary font-light text-[#1A3A5C] leading-relaxed">{mem.padrao}</p>
              </div>
            ) : null}

            {mem.resumo ? (
              <div className="space-y-2 rounded-xl border border-black/[0.06] bg-[#EDF4FF]/40 p-3.5">
                <span className="text-xs font-display font-normal text-[#5A8AAD] uppercase tracking-widest block">Análise</span>
                <p className="text-sm font-primary font-light text-[#1A3A5C] leading-relaxed">{mem.resumo}</p>
                {mem.resumoCompleto && mem.resumoCompleto !== mem.resumo ? (
                  <p className="text-xs text-[#5A8AAD] italic">→ Resumido</p>
                ) : null}
              </div>
            ) : null}

            {mem.resumoEco ? (
              <div className="space-y-2 rounded-xl border border-black/[0.06] bg-[#EDF4FF]/40 p-3.5">
                <span className="text-xs font-display font-normal text-[#5A8AAD] uppercase tracking-widest block">
                  Resumo da Eco
                </span>
                <p className="text-sm font-primary font-light text-[#1A3A5C] leading-relaxed">{mem.resumoEco}</p>
              </div>
            ) : null}

            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={handleOpenChat}
                className={clsx(
                  'flex-1 px-4 py-2.5 rounded-xl text-sm font-primary font-medium',
                  'border border-black/[0.07] bg-white text-[#1A4FB5]',
                  'transition-all duration-200',
                  'hover:bg-[#EDF4FF] hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(26,79,181,0.12)]',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A4FB5]/40'
                )}
                aria-label="Abrir memória no chat"
              >
                Abrir no chat
              </button>
              <button
                type="button"
                onClick={handleToggleFavorite}
                className={clsx(
                  'flex-1 px-4 py-2.5 rounded-xl text-sm font-primary font-medium',
                  'transition-all duration-200',
                  'hover:-translate-y-0.5',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A4FB5]/40',
                  isFavorite
                    ? 'border border-[#1A4FB5]/30 bg-[#EDF4FF] text-[#1A4FB5] hover:bg-[#D8EBFF] hover:shadow-[0_4px_16px_rgba(26,79,181,0.12)]'
                    : 'border border-black/[0.07] bg-white text-[#1A4FB5] hover:bg-[#EDF4FF] hover:shadow-[0_4px_16px_rgba(26,79,181,0.10)]',
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
                    'flex-1 px-4 py-2.5 rounded-xl text-sm font-primary font-medium',
                    'border border-black/[0.07] bg-white text-[#1A4FB5]',
                    'transition-all duration-200',
                    'hover:bg-[#EDF4FF] hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(26,79,181,0.12)]',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A4FB5]/40'
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

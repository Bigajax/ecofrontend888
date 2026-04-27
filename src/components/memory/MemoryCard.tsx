import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

import EmotionOrb from '../EmotionOrb';
import { getEmotionToken } from '../../pages/memory/emotionTokens';
import type { MemoryCardDTO } from '../../pages/memory/memoryCardDto';

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

  const emotionToken = useMemo(() => getEmotionToken(mem.emocao), [mem.emocao]);
  const [gradStart, gradEnd] = emotionToken.gradient;
  const accent = emotionToken.accent;

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

  const handleToggleDetails = () => setDetailsOpen((v) => !v);
  const handleOpenChat = () => {
    if (onOpenChat) { onOpenChat(mem); return; }
    window.dispatchEvent(
      new CustomEvent('eco:memory-open-chat', {
        detail: { memoryId: mem.id, mensagemId: mem.mensagemId, contexto: mem.contexto },
      }),
    );
  };
  const handleToggleFavorite = () => {
    setIsFavorite((prev) => { const next = !prev; onToggleFavorite?.(mem, next); return next; });
  };
  const handleEditTags = () => { onEditTags?.(mem); };

  return (
    <motion.li
      layout
      className={clsx(
        'group relative flex flex-col rounded-2xl bg-white overflow-hidden',
        'transition-all duration-300',
        'border border-black/[0.07] shadow-[0_4px_24px_rgba(13,52,97,0.06)]',
        'hover:shadow-[0_8px_40px_rgba(13,52,97,0.12)] hover:-translate-y-0.5',
        'focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#1A4FB5]/40',
        isFavorite && 'ring-1 ring-[#1A4FB5]/30',
      )}
    >
      {/* Emotion accent strip — left edge */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-full"
        style={{ background: `linear-gradient(180deg, ${gradStart}, ${gradEnd})` }}
        aria-hidden
      />

      {/* Header — emotion tinted background */}
      <div
        className="flex items-start gap-4 pl-6 pr-5 pt-5 pb-4 border-b border-black/[0.06]"
        style={{ background: `linear-gradient(135deg, ${gradStart}10 0%, transparent 55%)` }}
      >
        <EmotionOrb emotion={mem.emocao} size={44} className="shrink-0 mt-0.5" />

        <div className="flex-1 min-w-0">
          <h3 className="font-display text-[17px] font-normal text-[#0D3461] leading-snug break-words">
            {mem.titulo || mem.emocao}
          </h3>
          <p className="mt-1.5 text-[11px] text-[#5A8AAD] font-primary flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span>{mem.timeAgo || mem.fallbackDate}</span>
            {mem.domain && (
              <>
                <span className="opacity-40">·</span>
                <span>{mem.domain}</span>
              </>
            )}
            {mem.categoria && mem.categoria !== mem.domain && (
              <>
                <span className="opacity-40">·</span>
                <span>{mem.categoria}</span>
              </>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={handleToggleDetails}
          aria-expanded={detailsOpen}
          aria-controls={detailsId}
          aria-label={detailsOpen ? 'Recolher detalhes' : 'Expandir detalhes'}
          className={clsx(
            'shrink-0 mt-0.5 rounded-full p-1.5 text-[#5A8AAD]',
            'transition-all duration-300',
            'hover:bg-[#EDF4FF] hover:text-[#0D3461]',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A4FB5]/40',
          )}
        >
          <ChevronDown
            className={clsx('h-4 w-4 transition-transform duration-300', detailsOpen && 'rotate-180')}
            strokeWidth={2}
          />
        </button>
      </div>

      {/* Intensity */}
      <div className="pl-6 pr-5 pt-3.5 pb-3 border-b border-black/[0.05]">
        <div className="flex items-center justify-between gap-3 mb-2">
          <label
            htmlFor={intensityLabelId}
            className="text-[10px] font-primary font-semibold text-[#5A8AAD] uppercase tracking-widest"
          >
            Intensidade
          </label>
          <span id={intensityLabelId} className="text-[12px] font-primary font-semibold text-[#0D3461]">
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
              background: `linear-gradient(90deg, ${gradStart}, ${gradEnd})`,
            }}
          />
        </div>
      </div>

      {/* Context + Tags */}
      <div className="pl-6 pr-5 py-4 space-y-3 flex-1 min-w-0">
        {hasExcerpt && (
          <motion.div layout transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }} id={excerptId}>
            <p
              className={clsx(
                'text-[13px] font-primary font-light text-[#1A3A5C] leading-relaxed whitespace-pre-line',
                !excerptExpanded &&
                  'overflow-hidden [display:-webkit-box] [-webkit-line-clamp:3] [-webkit-box-orient:vertical]',
              )}
            >
              {context}
            </p>
            {shouldShowExcerptToggle && (
              <button
                type="button"
                onClick={() => setExcerptExpanded((v) => !v)}
                className="mt-1.5 text-[11px] font-primary font-semibold transition-colors duration-200"
                style={{ color: accent }}
                aria-expanded={excerptExpanded}
                aria-controls={excerptId}
              >
                {excerptExpanded ? 'Ver menos' : 'Ver mais'}
              </button>
            )}
          </motion.div>
        )}

        {(normalizedTags.length > 0 || extraTags > 0) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {normalizedTags.map((tag, index) => (
              <span
                key={`${tag}-${index}`}
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-primary font-medium transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  backgroundColor: `${accent}12`,
                  border: `1px solid ${accent}28`,
                  color: accent,
                }}
              >
                {tag}
              </span>
            ))}
            {extraTags > 0 && (
              <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-primary font-medium"
                style={{
                  backgroundColor: '#EDF4FF',
                  border: '1px solid rgba(26,79,181,0.10)',
                  color: '#5A8AAD',
                }}
              >
                +{extraTags}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ECO Insight */}
      {mem.resumoEco && mem.resumoEco !== mem.contexto && (
        <div
          className="mx-5 mb-4 rounded-xl p-3 flex gap-2.5"
          style={{
            backgroundColor: `${gradStart}0E`,
            border: `1px solid ${accent}22`,
          }}
        >
          <div className="shrink-0 mt-0.5">
            <div
              className="w-4.5 h-4.5 rounded-full flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${gradStart}, ${gradEnd})`, width: 18, height: 18 }}
            >
              <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" fill="none" aria-hidden>
                <circle cx="12" cy="12" r="4.5" fill="white" fillOpacity="0.9" />
                <path
                  d="M3 12c2.4-4 5.4-6.5 9-6.5S18.6 8 21 12c-2.4 4-5.4 6.5-9 6.5S5.4 16 3 12Z"
                  stroke="white" strokeOpacity="0.5" strokeWidth="1.2" fill="none" strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
          <p className="text-[11.5px] leading-relaxed flex-1" style={{ color: '#1A3A5C' }}>
            {mem.resumoEco.length > 120 ? mem.resumoEco.slice(0, 120) + '…' : mem.resumoEco}
          </p>
        </div>
      )}

      {/* Expandable details */}
      <AnimatePresence initial={false}>
        {detailsOpen && (
          <motion.div
            key="details"
            id={detailsId}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="space-y-3 border-t border-black/[0.06] pl-6 pr-5 pt-4 pb-5"
          >
            {mem.padrao && (
              <div
                className="space-y-1.5 rounded-xl p-3"
                style={{ backgroundColor: `${gradStart}0A`, border: `1px solid ${accent}18` }}
              >
                <span
                  className="text-[10px] font-display font-normal uppercase tracking-widest block"
                  style={{ color: accent }}
                >
                  Padrão
                </span>
                <p className="text-[12.5px] font-primary font-light text-[#1A3A5C] leading-relaxed">{mem.padrao}</p>
              </div>
            )}

            {mem.resumo && (
              <div
                className="space-y-1.5 rounded-xl p-3"
                style={{ backgroundColor: `${gradStart}0A`, border: `1px solid ${accent}18` }}
              >
                <span
                  className="text-[10px] font-display font-normal uppercase tracking-widest block"
                  style={{ color: accent }}
                >
                  Análise
                </span>
                <p className="text-[12.5px] font-primary font-light text-[#1A3A5C] leading-relaxed">{mem.resumo}</p>
                {mem.resumoCompleto && mem.resumoCompleto !== mem.resumo && (
                  <p className="text-[11px] text-[#5A8AAD] italic">→ Resumido</p>
                )}
              </div>
            )}

            {mem.resumoEco && (
              <div
                className="space-y-1.5 rounded-xl p-3"
                style={{ backgroundColor: `${gradStart}0A`, border: `1px solid ${accent}18` }}
              >
                <span
                  className="text-[10px] font-display font-normal uppercase tracking-widest block"
                  style={{ color: accent }}
                >
                  Resumo da Eco
                </span>
                <p className="text-[12.5px] font-primary font-light text-[#1A3A5C] leading-relaxed">{mem.resumoEco}</p>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={handleOpenChat}
                className={clsx(
                  'flex-1 px-4 py-2.5 rounded-xl text-[12.5px] font-primary font-semibold',
                  'transition-all duration-200',
                  'hover:-translate-y-0.5',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A4FB5]/40',
                )}
                style={{
                  backgroundColor: `${gradStart}14`,
                  border: `1px solid ${accent}28`,
                  color: accent,
                }}
                aria-label="Abrir memória no chat"
              >
                Abrir no chat
              </button>
              <button
                type="button"
                onClick={handleToggleFavorite}
                className={clsx(
                  'flex-1 px-4 py-2.5 rounded-xl text-[12.5px] font-primary font-semibold',
                  'transition-all duration-200',
                  'hover:-translate-y-0.5',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A4FB5]/40',
                )}
                style={
                  isFavorite
                    ? { backgroundColor: `${gradStart}22`, border: `1px solid ${accent}40`, color: accent }
                    : { backgroundColor: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', color: '#5A8AAD' }
                }
                aria-label={isFavorite ? 'Remover dos favoritos' : 'Marcar como favorito'}
              >
                {isFavorite ? 'Desfavoritar' : 'Favoritar'}
              </button>
              {onEditTags && (
                <button
                  type="button"
                  onClick={handleEditTags}
                  className={clsx(
                    'flex-1 px-4 py-2.5 rounded-xl text-[12.5px] font-primary font-semibold',
                    'border border-black/[0.07] bg-white text-[#5A8AAD]',
                    'transition-all duration-200',
                    'hover:bg-[#EDF4FF] hover:-translate-y-0.5',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A4FB5]/40',
                  )}
                  aria-label="Editar tags"
                >
                  Editar tags
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
};

export default React.memo(MemoryCard);

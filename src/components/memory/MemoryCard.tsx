import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import EmotionBubble from './EmotionBubble';
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

type MemoryCardProps = {
  mem: MemoryCardDTO;
  onOpenChat?: (memory: MemoryCardDTO) => void;
  onToggleFavorite?: (memory: MemoryCardDTO, next: boolean) => void;
  onEditTags?: (memory: MemoryCardDTO) => void;
};

const MemoryCard: React.FC<MemoryCardProps> = ({ mem, onOpenChat, onToggleFavorite, onEditTags }) => {
  const [open, setOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [contextExpanded, setContextExpanded] = useState(false);

  const detailsId = `memory-details-${mem.id}`;
  const accentRgb = useMemo(() => toRgb(mem.accent), [mem.accent]);
  const cardShadow = accentRgb
    ? `0 20px 50px rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.22), 0 12px 24px rgba(15, 23, 42, 0.12)`
    : '0 20px 50px rgba(15, 23, 42, 0.12), 0 12px 24px rgba(15, 23, 42, 0.08)';
  const meterShadow = accentRgb
    ? `0 8px 16px rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.28)`
    : '0 8px 16px rgba(15, 23, 42, 0.2)';

  const intensityPercent = mem.intensidade == null ? 0 : clamp((mem.intensidade / 10) * 100, 0, 100);
  const hasTags = mem.tags.length > 0;
  const visibleTags = mem.tags.slice(0, 3);
  const extraTags = mem.tags.length - visibleTags.length;

  const context = mem.contexto?.trim() ?? '';
  const showContextToggle = context.length > CONTEXT_PREVIEW_LIMIT;
  const contextDisplay = contextExpanded || !showContextToggle
    ? context
    : `${context.slice(0, CONTEXT_PREVIEW_LIMIT).trim()}…`;

  const timeLabel = mem.timeAgo || mem.fallbackDate;

  const handleToggle = () => setOpen((value) => !value);

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
      })
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
      className={`group relative flex flex-col gap-5 overflow-hidden glass-card px-6 py-6 transition-[box-shadow,transform] duration-300 ${mem.emotionTheme.className}`}
      style={{
        boxShadow: cardShadow,
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background: `linear-gradient(135deg, ${mem.emotionTheme.accentSofter}, rgba(255,255,255,0.55))`,
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-[30px] opacity-0 transition duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:opacity-70"
        style={{
          background: accentRgb
            ? `radial-gradient(140% 140% at 85% 12%, rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.2), transparent 70%)`
            : 'radial-gradient(140% 140% at 85% 12%, rgba(79,70,229,0.2), transparent 70%)',
        }}
      />

      <div className="relative flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <EmotionBubble emotion={mem.emocao} size={56} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-[17px] font-semibold leading-[1.35] text-slate-900">
                    {mem.titulo}
                  </h3>
                  {mem.nivelAbertura != null ? (
                    <span className="glass-chip px-2 py-0.5 text-[11px] font-medium text-[color:var(--color-text-muted)]">
                      Abertura {mem.nivelAbertura}
                    </span>
                  ) : null}
                </div>
                <p
                  className={`mt-1 flex items-center gap-2 text-[13px] font-medium tracking-tight ${mem.emotionTheme.metaTextClass}`}
                >
                  <span>{timeLabel}</span>
                  <span className="inline-block h-1 w-1 rounded-full bg-current opacity-60" aria-hidden />
                  <span className="truncate">{mem.subtitulo}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggle}
                aria-expanded={open}
                aria-controls={detailsId}
                aria-label={open ? 'Recolher detalhes da memória' : 'Expandir detalhes da memória'}
                className="mt-1 grid h-10 w-10 shrink-0 place-items-center glass-chip text-[color:var(--color-text-muted)] transition-transform duration-200 hover:-translate-y-[1px]"
              >
                <svg
                  viewBox="0 0 20 20"
                  className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                  aria-hidden
                >
                  <path
                    d="M6 8l4 4 4-4"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-[12px] font-medium text-[color:var(--color-text-muted)]">
                <span>Intensidade</span>
                <span className={`font-semibold ${mem.emotionTheme.accentTextClass}`}>{mem.intensidadeLabel}</span>
              </div>
              <div className={`relative mt-2 h-2 w-full overflow-hidden rounded-full ${mem.emotionTheme.meterTrackClass}`}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${intensityPercent}%` }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  aria-hidden
                  className="absolute inset-y-0 rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${mem.accent}, ${mem.emotionTheme.accentSoft})`,
                    boxShadow: meterShadow,
                  }}
                />
                {mem.intensidade == null ? (
                  <span className="absolute inset-0 grid place-items-center text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    Sem dado
                  </span>
                ) : null}
              </div>
            </div>

            {hasTags ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {visibleTags.map((tag, index) => (
                  <span
                    key={`${tag}-${index}`}
                    className={`glass-chip px-3 py-1 text-xs font-medium ${mem.emotionTheme.chipClass}`}
                  >
                    {tag.charAt(0).toUpperCase() + tag.slice(1)}
                  </span>
                ))}
                {extraTags > 0 ? (
                  <span className="glass-chip px-3 py-1 text-xs font-medium text-[color:var(--color-text-muted)]">
                    +{extraTags}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="details"
            id={detailsId}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative overflow-hidden"
          >
            <div className="mt-4 space-y-4 rounded-[22px] border border-white/70 bg-white/80 p-4 shadow-[0_12px_32px_rgba(15,23,42,0.08)] backdrop-blur-xl">
              {mem.resumo ? (
                <div className="rounded-2xl border border-black/5 bg-white/85 p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-900">
                    <span
                      aria-hidden
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: mem.accent }}
                    />
                    Resumo da Eco
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed text-slate-700">{mem.resumo}</p>
                  {mem.resumoCompleto && mem.resumoCompleto !== mem.resumo ? (
                    <p className="mt-2 text-[11px] text-slate-400">Texto encurtado para caber no cartão.</p>
                  ) : null}
                </div>
              ) : null}

              {context ? (
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px] font-semibold text-slate-800">Seu registro</span>
                    {showContextToggle ? (
                      <button
                        type="button"
                        onClick={() => setContextExpanded((value) => !value)}
                        className="text-[12px] font-medium text-slate-500 underline-offset-2 transition hover:text-slate-600"
                      >
                        {contextExpanded ? 'Ver menos' : 'Ver mais'}
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-slate-700">{contextDisplay}</p>
                </div>
              ) : null}

              {mem.padrao ? (
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <span className="text-[13px] font-semibold text-slate-800">Padrão comportamental</span>
                  <p className="mt-2 text-[13px] leading-relaxed text-slate-700">{mem.padrao}</p>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3 text-[12px] text-slate-500">
                <span className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/90 px-3 py-1 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: mem.accent }} aria-hidden />
                  {mem.domain}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/90 px-3 py-1 font-medium">
                  Registrada em {mem.fallbackDate}
                </span>
                {mem.categoria ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/90 px-3 py-1 font-medium">
                    Categoria {mem.categoria}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={handleOpenChat}
                  className="flex-1 rounded-full border border-black/10 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white"
                  aria-label="Abrir memória no chat"
                >
                  Abrir no chat
                </button>
                <button
                  type="button"
                  onClick={handleToggleFavorite}
                  className={`flex-1 rounded-full border border-black/10 px-4 py-2 text-sm font-semibold shadow-sm transition ${
                    isFavorite
                      ? 'bg-amber-100 text-amber-700 hover:bg-amber-200/80 border-amber-200'
                      : 'bg-white/90 text-slate-700 hover:bg-white'
                  }`}
                  aria-label={isFavorite ? 'Remover memória dos favoritos' : 'Marcar memória como favorita'}
                >
                  {isFavorite ? 'Favorita' : 'Marcar como favorita'}
                </button>
                {onEditTags ? (
                  <button
                    type="button"
                    onClick={handleEditTags}
                    className="flex-1 rounded-full border border-black/10 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white"
                    aria-label="Editar tags da memória"
                  >
                    Editar tags
                  </button>
                ) : null}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.li>
  );
};

export default React.memo(MemoryCard);

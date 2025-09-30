import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';

import type { Memoria } from '../../../api/memoriaApi';
import EmotionBubble from '../../../components/memory/EmotionBubble';
import { getEmotionToken } from '../emotionTokens';
import { generateConsistentPastelColor, humanDate } from '../../../utils/memory';

type Props = {
  mem: Memoria;
};

const capitalize = (value?: string | null) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : '';

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

const MemoryCard: React.FC<Props> = ({ mem }) => {
  const [open, setOpen] = useState(false);

  const emotionName = mem.emocao_principal || mem.emocao || 'neutro';
  const token = getEmotionToken(emotionName);
  const color = token.accent;
  const colorRgb = useMemo(() => toRgb(color), [color]);
  const when = mem.created_at ? humanDate(mem.created_at) : '';
  const intensidade = Math.max(0, Math.min(10, Number((mem as any).intensidade ?? 0)));
  const preview = (mem.analise_resumo || mem.contexto || '').trim();

  return (
    <li
      className="group relative overflow-hidden rounded-[26px] border border-white/60 bg-white/80 px-5 py-5 backdrop-blur-2xl transition-shadow duration-300"
      style={{
        boxShadow: colorRgb
          ? `0 18px 46px rgba(${colorRgb.r}, ${colorRgb.g}, ${colorRgb.b}, 0.2), 0 12px 28px rgba(15,23,42,0.08)`
          : '0 18px 46px rgba(15,23,42,0.14)',
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[26px] opacity-70"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.75), rgba(255,255,255,0.28))',
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-[28px] opacity-0 transition duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:opacity-60"
        style={{
          background: colorRgb
            ? `radial-gradient(140% 140% at 85% 12%, rgba(${colorRgb.r}, ${colorRgb.g}, ${colorRgb.b}, 0.22), transparent 65%)`
            : 'radial-gradient(140% 140% at 85% 12%, rgba(79,70,229,0.2), transparent 65%)',
        }}
      />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="relative w-full text-left"
      >
        <div className="flex items-start gap-5">
          <EmotionBubble emotion={emotionName} size={54} />
          <div className="min-w-0 flex-1 pt-1">
            <div className="flex items-center justify-between gap-3">
              <h3 className="truncate text-[17px] font-semibold leading-[1.35] text-neutral-900">
                {capitalize(mem.emocao_principal) || 'Emoção'}
              </h3>
              <span className="shrink-0 text-[12px] font-medium text-neutral-500">{when}</span>
            </div>

            {preview && (
              <p
                className="mt-1 text-[13.5px] leading-[1.45] text-neutral-700"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {preview}
              </p>
            )}
          </div>
        </div>

        <div className="relative mt-4 h-2 rounded-full bg-neutral-200/70">
          <span
            className="absolute inset-y-0 block rounded-full"
            style={{
              width: `${(intensidade / 10) * 100}%`,
              background: `linear-gradient(90deg, ${color}, rgba(0,0,0,0.08))`,
              boxShadow: colorRgb
                ? `0 8px 16px rgba(${colorRgb.r}, ${colorRgb.g}, ${colorRgb.b}, 0.22)`
                : undefined,
            }}
            aria-hidden
          />
        </div>

        {!!mem.tags?.length && (
        <div className="mt-4 flex flex-wrap gap-2">
          {mem.tags.map((tag, i) => (
            <span
              key={`${tag}-${i}`}
                className="text-xs px-3 py-1 rounded-full font-medium border border-black/10 shadow-sm"
                style={{ background: generateConsistentPastelColor(tag), color: '#0f172a' }}
              >
                {tag && tag[0].toUpperCase() + tag.slice(1)}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex justify-end">
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

          {(mem.dominio_vida || mem.categoria) && (
            <div className="flex flex-col sm:flex-row gap-2">
              {mem.dominio_vida && (
                <div className="flex-1 rounded-xl p-3 bg-white/70 backdrop-blur border border-neutral-200 shadow-sm">
                  <div className="font-semibold mb-1 text-neutral-900">Domínio</div>
                  <div>{mem.dominio_vida}</div>
                </div>
              )}
              {mem.categoria && (
                <div className="flex-1 rounded-xl p-3 bg-white/70 backdrop-blur border border-neutral-200 shadow-sm">
                  <div className="font-semibold mb-1 text-neutral-900">Categoria</div>
                  <div>{mem.categoria}</div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </li>
  );
};

export default MemoryCard;

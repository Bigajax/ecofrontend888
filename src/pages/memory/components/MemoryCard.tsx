import React, { useState } from 'react';
import type { Memoria } from '../../../api/memoriaApi';
import {
  generateConsistentPastelColor,
  getEmotionColor,
  humanDate,
} from '../../../utils/memory';
import { motion } from 'framer-motion';

type Props = {
  mem: Memoria;
};

const capitalize = (value?: string | null) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : '';

const MemoryCard: React.FC<Props> = ({ mem }) => {
  const [open, setOpen] = useState(false);

  const color = getEmotionColor(mem.emocao_principal || 'neutro');
  const when = mem.created_at ? humanDate(mem.created_at) : '';
  const intensidade = Math.max(0, Math.min(10, Number((mem as any).intensidade ?? 0)));
  const preview = (mem.analise_resumo || mem.contexto || '').trim();

  return (
    <li className="rounded-3xl border border-black/10 bg-white/70 backdrop-blur-md shadow-md p-4 transition-all">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full text-left"
      >
        <div className="flex items-center gap-3">
          <span
            className="h-9 w-9 rounded-full ring-2 ring-white/70 shadow-sm shrink-0"
            style={{ background: color, boxShadow: 'inset 0 1px 0 rgba(255,255,255,.6)' }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[15px] font-semibold text-neutral-900 truncate">
                {capitalize(mem.emocao_principal) || 'Emoção'}
              </h3>
              <span className="text-[12px] text-neutral-500 shrink-0">{when}</span>
            </div>

            {preview && (
              <p
                className="text-sm text-neutral-700 mt-0.5"
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

        <div className="mt-3 h-1.5 rounded-full bg-neutral-200/60 overflow-hidden">
          <span
            className="block h-full rounded-full"
            style={{
              width: `${(intensidade / 10) * 100}%`,
              background: `linear-gradient(90deg, ${color}, rgba(0,0,0,0.08))`,
            }}
            aria-hidden
          />
        </div>

        {!!mem.tags?.length && (
          <div className="mt-3 flex flex-wrap gap-2">
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

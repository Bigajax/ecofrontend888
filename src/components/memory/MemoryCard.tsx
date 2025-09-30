import React, { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import EmotionBubble from './EmotionBubble';
import Chip from './Chip';
import ExpandButton from './ExpandButton';
import {
  Memoria,
  capitalize,
  getCreatedAt,
  getDomain,
  getEmotion,
  getPattern,
  getTags,
  humanDate,
  intensityOf,
  toDate,
} from '../../pages/memory/utils';
import { appleShade } from '../../pages/memory/palette';
import { getEmotionToken } from '../../pages/memory/emotionTokens';

type MemoryCardProps = {
  mem: Memoria;
};

const MemoryCardComponent: React.FC<MemoryCardProps> = ({ mem }) => {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((value) => !value), []);
  const detailsId = `mem-details-${mem.id ?? Math.random().toString(36).slice(2)}`;

  const emotionName = getEmotion(mem);
  const token = getEmotionToken(emotionName);
  const primaryColor = token.accent;
  const when = humanDate(getCreatedAt(mem));
  const intensidade = intensityOf(mem);

  const domain = getDomain(mem);
  const padrao = getPattern(mem);
  const tags = getTags(mem);

  return (
    <motion.li
      layout
      className="w-full max-w-full rounded-2xl bg-white/95 backdrop-blur-sm border border-black/[0.08] shadow-[0_1px_2px_rgba(0,0,0,0.05),0_8px_32px_rgba(0,0,0,0.04)] p-5 transition-all duration-200 hover:shadow-[0_1px_2px_rgba(0,0,0,0.08),0_12px_40px_rgba(0,0,0,0.06)] hover:border-black/[0.12]"
    >
      <div className="flex items-start gap-4">
        <EmotionBubble emotion={emotionName} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-[17px] leading-[1.35] font-semibold text-gray-900 truncate mb-0.5">
                {capitalize(getEmotion(mem)) || 'Registro emocional'}
              </h3>
              <p className="text-[13px] leading-[1.4] text-gray-500 font-medium">{when}</p>
            </div>
            <ExpandButton open={open} onClick={toggle} controlsId={detailsId} />
          </div>

          <div className="mt-3 mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] font-medium text-gray-600">Intensidade</span>
              <span className="text-[12px] font-semibold text-gray-800">{intensidade}/10</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(intensidade / 10) * 100}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${primaryColor}, ${appleShade(primaryColor, -0.2)})` }}
              />
            </div>
          </div>

          {domain && (
            <div className="mb-3">
              <Chip variant="colorful" seedColor={domain}>
                {domain}
              </Chip>
            </div>
          )}
        </div>
      </div>

      {!!tags.length && (
        <div className="mt-3 flex flex-wrap gap-2">
          {tags.slice(0, 3).map((tag, index) => (
            <Chip key={`${tag}-${index}`} variant="colorful" seedColor={tag}>
              {tag}
            </Chip>
          ))}
          {tags.length > 3 && <Chip>+{tags.length - 3} mais</Chip>}
        </div>
      )}

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={detailsId}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            <div className="space-y-4 mt-4 pt-4 border-t border-gray-100">
              <div className="flex flex-wrap gap-2">
                <Chip title="Criado em">
                  {toDate(getCreatedAt(mem)).toLocaleDateString('pt-BR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Chip>
                {tags.length > 3 && <Chip title="Todas as tags">{tags.join(', ')}</Chip>}
              </div>

              {padrao && (
                <div className="rounded-xl p-4 bg-gray-50/80 backdrop-blur-sm border border-gray-100">
                  <div className="font-semibold text-[14px] text-gray-900 mb-2">Padrão identificado</div>
                  <div className="text-[14px] leading-[1.5] text-gray-700">{padrao}</div>
                </div>
              )}

              {(mem.analise_resumo || mem.resumo_eco) && (
                <div className="rounded-xl p-4 bg-blue-50/50 backdrop-blur-sm border border-blue-100/60">
                  <div className="font-semibold text-[14px] text-blue-900 mb-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    Reflexão da Eco
                  </div>
                  <div className="text-[14px] leading-[1.5] text-blue-800">{mem.analise_resumo || mem.resumo_eco}</div>
                </div>
              )}

              {mem.contexto && (
                <div className="rounded-xl p-4 bg-gray-50/80 backdrop-blur-sm border border-gray-100">
                  <div className="font-semibold text-[14px] text-gray-900 mb-2">Seu registro</div>
                  <div className="text-[14px] leading-[1.5] text-gray-700">{mem.contexto}</div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
};

const MemoryCard = React.memo(MemoryCardComponent);
MemoryCard.displayName = 'MemoryCard';

export default MemoryCard;

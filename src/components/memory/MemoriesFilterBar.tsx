import React from 'react';
import { motion } from 'framer-motion';

import { capitalize } from '../../pages/memory/utils';

type MemoriesFilterBarProps = {
  emotionOptions: string[];
  filters: {
    emotion: 'all' | string;
    query: string;
  };
  filtersActive: boolean;
  onEmotionChange: (value: 'all' | string) => void;
  onQueryChange: (value: string) => void;
  onReset: () => void;
};

const MemoriesFilterBar: React.FC<MemoriesFilterBarProps> = ({
  emotionOptions,
  filters,
  filtersActive,
  onEmotionChange,
  onQueryChange,
  onReset,
}) => (
  <div
    className="p-3.5 rounded-2xl border backdrop-blur-sm"
    style={{ borderColor: 'var(--eco-line,#E8E3DD)', backgroundColor: 'rgba(255,255,255,0.75)' }}
  >
    <div className="flex flex-col sm:flex-row gap-2.5">
      <div className="flex-1">
        <label className="sr-only" htmlFor="emotion-filter">
          Filtrar por emoção
        </label>
        <select
          id="emotion-filter"
          value={filters.emotion}
          onChange={(event) => onEmotionChange(event.target.value)}
          className="w-full h-10 rounded-xl px-3.5 backdrop-blur-sm border text-[14px] transition-all duration-150 focus:outline-none focus:ring-2"
          style={{
            backgroundColor: 'rgba(255,255,255,0.9)',
            borderColor: 'var(--eco-line,#E8E3DD)',
            color: 'var(--eco-text,#38322A)',
          }}
        >
          <option value="all">Todas as emoções</option>
          {emotionOptions.map((emo) => (
            <option key={emo} value={emo}>
              {capitalize(emo)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-[2]">
        <label className="sr-only" htmlFor="search">
          Buscar
        </label>
        <input
          id="search"
          type="text"
          value={filters.query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar em reflexões, tags, domínios..."
          className="w-full h-10 rounded-xl px-3.5 backdrop-blur-sm border text-[14px] transition-all duration-150 focus:outline-none focus:ring-2"
          style={{
            backgroundColor: 'rgba(255,255,255,0.9)',
            borderColor: 'var(--eco-line,#E8E3DD)',
            color: 'var(--eco-text,#38322A)',
          }}
        />
      </div>

      {filtersActive && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={onReset}
          className="h-10 px-4 rounded-xl border text-[13px] font-medium transition-all duration-150 shrink-0 hover:opacity-80"
          style={{
            borderColor: 'var(--eco-line,#E8E3DD)',
            backgroundColor: 'rgba(243,238,231,0.6)',
            color: 'var(--eco-muted,#9C938A)',
          }}
        >
          Limpar
        </motion.button>
      )}
    </div>
  </div>
);

export default MemoriesFilterBar;

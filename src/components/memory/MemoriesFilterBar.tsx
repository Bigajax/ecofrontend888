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
  <div className="p-4 rounded-2xl bg-white/80 border border-black/[0.06] shadow-sm">
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="flex-1">
        <label className="sr-only" htmlFor="emotion-filter">
          Filtrar por emoção
        </label>
        <select
          id="emotion-filter"
          value={filters.emotion}
          onChange={(event) => onEmotionChange(event.target.value)}
          className="w-full h-11 rounded-xl px-4 bg-white/90 backdrop-blur-sm border border-black/[0.06] text-[15px] text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-150"
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
          className="w-full h-11 rounded-xl px-4 bg-white/90 backdrop-blur-sm border border-black/[0.06] text-[15px] text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-150"
        />
      </div>

      {filtersActive && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={onReset}
          className="h-11 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-[14px] font-medium text-gray-700 transition-colors duration-150 shrink-0"
        >
          Limpar
        </motion.button>
      )}
    </div>
  </div>
);

export default MemoriesFilterBar;

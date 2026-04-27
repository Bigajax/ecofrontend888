import React from 'react';
import { motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { capitalize } from '../../pages/memory/utils';
import { getEmotionToken } from '../../pages/memory/emotionTokens';

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
  <div className="space-y-3">
    {/* Search input */}
    <div className="relative">
      <Search
        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
        style={{ color: '#5A8AAD' }}
        strokeWidth={2}
      />
      <input
        id="search"
        type="text"
        value={filters.query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Buscar reflexões, tags, domínios…"
        className="w-full h-11 rounded-2xl pl-10 pr-10 text-[14px] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#1A4FB5]/20"
        style={{
          border: '1px solid rgba(0,0,0,0.08)',
          color: '#0D3461',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}
      />
      {filters.query && (
        <button
          type="button"
          onClick={() => onQueryChange('')}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 transition-colors duration-150"
          style={{ color: '#5A8AAD' }}
          aria-label="Limpar busca"
        >
          <X className="w-3.5 h-3.5" strokeWidth={2.5} />
        </button>
      )}
    </div>

    {/* Emotion pills — scroll horizontal sem barra visível */}
    {emotionOptions.length > 0 && (
      <div
        className="flex items-center gap-1.5 overflow-x-auto"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        {/* "Todas" pill */}
        <button
          type="button"
          onClick={() => onEmotionChange('all')}
          className="shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all duration-200"
          style={
            filters.emotion === 'all'
              ? {
                  background: 'linear-gradient(135deg, #1A4FB5 0%, #0D3461 100%)',
                  color: 'white',
                  boxShadow: '0 2px 8px rgba(26,79,181,0.28)',
                }
              : {
                  border: '1px solid rgba(0,0,0,0.08)',
                  backgroundColor: '#FFFFFF',
                  color: '#5A8AAD',
                }
          }
        >
          Todas
        </button>

        {emotionOptions.map((emo) => {
          const token = getEmotionToken(emo);
          const isActive = filters.emotion === emo;
          return (
            <motion.button
              key={emo}
              type="button"
              onClick={() => onEmotionChange(emo)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-all duration-200"
              style={
                isActive
                  ? {
                      background: `linear-gradient(135deg, ${token.gradient[0]} 0%, ${token.gradient[1]} 100%)`,
                      color: 'white',
                      boxShadow: `0 2px 10px ${token.accent}55`,
                    }
                  : {
                      border: `1px solid ${token.accent}30`,
                      backgroundColor: `${token.gradient[0]}10`,
                      color: token.accent,
                    }
              }
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{
                  background: isActive
                    ? 'rgba(255,255,255,0.7)'
                    : `linear-gradient(135deg, ${token.gradient[0]}, ${token.gradient[1]})`,
                }}
              />
              {capitalize(emo)}
            </motion.button>
          );
        })}

        {/* Limpar button — only when filters active */}
        {filtersActive && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={onReset}
            className="shrink-0 flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-medium ml-1 transition-all duration-150"
            style={{
              border: '1px solid rgba(0,0,0,0.08)',
              backgroundColor: '#FFFFFF',
              color: '#5A8AAD',
            }}
            aria-label="Limpar todos os filtros"
          >
            <X className="w-3 h-3" strokeWidth={2.5} />
            Limpar
          </motion.button>
        )}
      </div>
    )}
  </div>
);

export default MemoriesFilterBar;

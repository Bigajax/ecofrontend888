import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

type MemoryEmptyStateProps = {
  hasFilters: boolean;
};

const MemoryEmptyState: React.FC<MemoryEmptyStateProps> = ({ hasFilters }) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center text-center py-16"
    >
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-slate-50">
        <svg className="h-12 w-12 text-slate-300" viewBox="0 0 48 48" fill="none" aria-hidden>
          <path
            d="M24 8c-6.627 0-12 5.373-12 12v6c0 2.21-1.79 4-4 4h0"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.4}
          />
          <path
            d="M38 30c-2.21 0-4 1.79-4 4v6"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.6}
          />
          <circle cx={24} cy={20} r={6} stroke="currentColor" strokeWidth={2} opacity={0.7} />
        </svg>
      </div>
      <p className="text-[19px] font-semibold text-slate-900 mb-2">
        {hasFilters ? 'Nenhum resultado com esses filtros' : 'Você ainda não registrou memórias'}
      </p>
      <p className="text-[15px] text-slate-500 mb-6 max-w-sm leading-[1.5]">
        {hasFilters
          ? 'Experimente remover alguns filtros ou ajustar a busca para ver mais lembranças.'
          : 'Comece gravando um momento marcante com a Eco. Ele aparece aqui organizado por intensidade e emoção.'}
      </p>
      {!hasFilters && (
        <button
          onClick={() => navigate('/app')}
          className="px-6 py-3 rounded-full border border-slate-200 bg-white/90 text-slate-700 font-semibold text-[15px] transition hover:bg-white"
        >
          Grave sua primeira memória
        </button>
      )}
    </motion.div>
  );
};

export default MemoryEmptyState;

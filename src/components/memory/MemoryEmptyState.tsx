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
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
      </div>
      <p className="text-[19px] font-semibold text-gray-900 mb-2">
        {hasFilters ? 'Nenhum resultado encontrado' : 'Nenhuma memória ainda'}
      </p>
      <p className="text-[15px] text-gray-500 mb-6 max-w-sm leading-[1.4]">
        {hasFilters
          ? 'Tente ajustar os filtros para ver mais resultados.'
          : 'Suas conversas com a Eco aparecerão aqui organizadas por data.'}
      </p>
      {!hasFilters && (
        <button
          onClick={() => navigate('/chat')}
          className="px-6 py-3 rounded-full bg-blue-500 hover:bg-blue-600 text-white font-medium text-[15px] transition-colors duration-150 shadow-sm"
        >
          Começar conversa
        </button>
      )}
    </motion.div>
  );
};

export default MemoryEmptyState;

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
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex flex-col items-center text-center py-16 px-4"
    >
      <div
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border"
        style={{
          backgroundColor: 'rgba(243,238,231,0.7)',
          borderColor: 'var(--eco-line,#E8E3DD)',
          boxShadow: '0 4px 24px rgba(167,132,108,0.10)',
        }}
      >
        <svg className="h-9 w-9" viewBox="0 0 36 36" fill="none" aria-hidden>
          <circle cx="18" cy="18" r="7.5" stroke="var(--eco-user,#A7846C)" strokeWidth="1.4" opacity="0.65" />
          <path d="M18 6C18 6 10 12 10 18" stroke="var(--eco-user,#A7846C)" strokeWidth="1.4" strokeLinecap="round" opacity="0.35" />
          <path d="M18 30C18 30 26 24 26 18" stroke="var(--eco-accent,#C6A995)" strokeWidth="1.4" strokeLinecap="round" opacity="0.35" />
          <circle cx="18" cy="18" r="2.5" fill="var(--eco-user,#A7846C)" opacity="0.55" />
        </svg>
      </div>

      <p
        className="text-[18px] font-semibold mb-2"
        style={{
          color: 'var(--eco-text,#38322A)',
          fontFamily: 'var(--font-display,Playfair Display,Georgia,serif)',
        }}
      >
        {hasFilters ? 'Nenhum resultado com esses filtros' : 'Seus registros aparecem aqui'}
      </p>

      <p className="text-[14px] mb-7 max-w-xs leading-relaxed" style={{ color: 'var(--eco-muted,#9C938A)' }}>
        {hasFilters
          ? 'Experimente remover alguns filtros ou ajustar a busca para ver mais lembranças.'
          : 'Comece uma conversa com a Eco e compartilhe um momento marcante. Ele aparece aqui organizado por emoção e intensidade.'}
      </p>

      {!hasFilters && (
        <button
          onClick={() => navigate('/app')}
          className="rounded-full border px-6 py-2.5 text-[14px] font-medium transition-all duration-300 hover:-translate-y-0.5"
          style={{
            borderColor: 'var(--eco-line,#E8E3DD)',
            backgroundColor: 'rgba(255,255,255,0.9)',
            color: 'var(--eco-user,#A7846C)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(167,132,108,0.18)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; }}
        >
          Conversar com a Eco
        </button>
      )}
    </motion.div>
  );
};

export default MemoryEmptyState;

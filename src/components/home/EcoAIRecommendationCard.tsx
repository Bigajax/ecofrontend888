import { useNavigate } from 'react-router-dom';
import { Heart, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import EcoBubbleOneEye from '@/components/EcoBubbleOneEye';

const tileVariant = {
  hidden: { opacity: 0, scale: 0.86, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, stiffness: 220, damping: 18 } },
};

const tileStyle = {
  background: '#FFFFFF',
  border: '1px solid rgba(0,0,0,0.07)',
  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
};

interface EcoAIRecommendationCardProps {
  onStartChat: () => void;
}

export default function EcoAIRecommendationCard({ onStartChat }: EcoAIRecommendationCardProps) {
  const navigate = useNavigate();

  return (
    <section className="mx-auto max-w-6xl px-4 py-4 md:px-8 md:py-5">
      <motion.div
        className="grid grid-cols-3 gap-3"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
        variants={{ visible: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } } }}
      >
        <motion.button
          variants={tileVariant}
          whileHover={{ scale: 1.02, boxShadow: '0 4px 12px rgba(0,0,0,0.09)' }}
          whileTap={{ scale: 0.97 }}
          onClick={onStartChat}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl px-3 py-4 text-center cursor-pointer min-h-[72px] transition-all duration-150"
          style={tileStyle}
        >
          <EcoBubbleOneEye size={28} />
          <span className="text-[12px] font-medium text-[#0D3461] leading-none">ECO AI</span>
        </motion.button>

        <motion.button
          variants={tileVariant}
          whileHover={{ scale: 1.02, boxShadow: '0 4px 12px rgba(0,0,0,0.09)' }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/app/configuracoes?menu=favoritos')}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl px-3 py-4 text-center cursor-pointer min-h-[72px] transition-all duration-150"
          style={tileStyle}
        >
          <Heart size={20} color="#0D3461" strokeWidth={1.5} />
          <span className="text-[12px] font-medium text-[#0D3461] leading-none">Salvos</span>
        </motion.button>

        <motion.button
          variants={tileVariant}
          whileHover={{ scale: 1.02, boxShadow: '0 4px 12px rgba(0,0,0,0.09)' }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/app/diario-estoico')}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl px-3 py-4 text-center cursor-pointer min-h-[72px] transition-all duration-150"
          style={tileStyle}
        >
          <BookOpen size={20} color="#0D3461" strokeWidth={1.5} />
          <span className="text-[12px] font-medium text-[#0D3461] leading-none">Diário</span>
        </motion.button>
      </motion.div>
    </section>
  );
}

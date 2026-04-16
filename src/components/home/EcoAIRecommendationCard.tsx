import { useNavigate } from 'react-router-dom';
import { Heart, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import EcoBubbleOneEye from '@/components/EcoBubbleOneEye';

const tileVariant = {
  hidden: { opacity: 0, scale: 0.86, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, stiffness: 220, damping: 18 } },
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
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.96 }}
          onClick={onStartChat}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl px-3 py-4 text-center cursor-pointer min-h-[72px] transition-all duration-150 active:scale-95"
          style={{
            background: 'linear-gradient(145deg, rgba(110,200,255,0.14) 0%, rgba(75,174,232,0.08) 100%)',
            border: '1px solid rgba(110,200,255,0.30)',
            boxShadow: '0 2px 12px rgba(110,200,255,0.10)',
          }}
        >
          <EcoBubbleOneEye size={26} />
          <span className="text-[13px] font-semibold text-[#1E6FA5] leading-none">ECO AI</span>
        </motion.button>

        <motion.button
          variants={tileVariant}
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate('/app/configuracoes?menu=favoritos')}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl px-3 py-4 text-center cursor-pointer min-h-[72px] transition-all duration-150 active:scale-95"
          style={{
            background: 'linear-gradient(145deg, rgba(110,200,255,0.14) 0%, rgba(75,174,232,0.08) 100%)',
            border: '1px solid rgba(110,200,255,0.30)',
            boxShadow: '0 2px 12px rgba(110,200,255,0.10)',
          }}
        >
          <Heart size={22} color="#6EC8FF" fill="#6EC8FF" strokeWidth={0} />
          <span className="text-[13px] font-semibold text-[#1E6FA5] leading-none">Salvos</span>
        </motion.button>

        <motion.button
          variants={tileVariant}
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate('/app/diario-estoico')}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl px-3 py-4 text-center cursor-pointer min-h-[72px] transition-all duration-150 active:scale-95"
          style={{
            background: 'linear-gradient(145deg, rgba(110,200,255,0.14) 0%, rgba(75,174,232,0.08) 100%)',
            border: '1px solid rgba(110,200,255,0.30)',
            boxShadow: '0 2px 12px rgba(110,200,255,0.10)',
          }}
        >
          <BookOpen size={22} color="#6EC8FF" strokeWidth={1.5} />
          <span className="text-[13px] font-semibold text-[#1E6FA5] leading-none">Diário</span>
        </motion.button>
      </motion.div>
    </section>
  );
}

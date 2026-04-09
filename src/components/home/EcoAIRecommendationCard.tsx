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

  const tileClass = 'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left cursor-pointer';
  const tileStyle = { background: 'rgba(110,200,255,0.09)', border: '1px solid rgba(110,200,255,0.22)' };

  return (
    <section className="mx-auto max-w-6xl px-4 py-3 md:px-8 md:py-4">
      <motion.div
        className="grid grid-cols-3 gap-2"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
        variants={{ visible: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } } }}
      >
        <motion.button
          variants={tileVariant}
          whileHover={{ scale: 1.04, y: -1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onStartChat}
          className={tileClass}
          style={tileStyle}
        >
          <EcoBubbleOneEye size={22} />
          <span className="text-xs font-semibold text-[#2E7FB8] truncate">ECO AI</span>
        </motion.button>

        <motion.button
          variants={tileVariant}
          whileHover={{ scale: 1.04, y: -1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/app/configuracoes?menu=favoritos')}
          className={tileClass}
          style={tileStyle}
        >
          <Heart size={18} color="#6EC8FF" fill="#6EC8FF" strokeWidth={0} />
          <span className="text-xs font-semibold text-[#2E7FB8] truncate">Salvos</span>
        </motion.button>

        <motion.button
          variants={tileVariant}
          whileHover={{ scale: 1.04, y: -1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/app/diario-estoico')}
          className={tileClass}
          style={tileStyle}
        >
          <BookOpen size={18} color="#6EC8FF" strokeWidth={1.5} />
          <span className="text-xs font-semibold text-[#2E7FB8] truncate">Diário</span>
        </motion.button>
      </motion.div>
    </section>
  );
}

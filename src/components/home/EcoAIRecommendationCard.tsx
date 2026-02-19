import { useNavigate } from 'react-router-dom';
import { Heart, BookOpen } from 'lucide-react';
import EcoBubbleOneEye from '@/components/EcoBubbleOneEye';

interface EcoAIRecommendationCardProps {
  onStartChat: () => void;
}

export default function EcoAIRecommendationCard({ onStartChat }: EcoAIRecommendationCardProps) {
  const navigate = useNavigate();

  const tileClass =
    'flex items-center gap-2.5 rounded-xl bg-[#F0F9FF] px-3 py-2.5 text-left transition-all duration-150 hover:bg-[#E0F3FF] active:scale-95 cursor-pointer';

  return (
    <section className="mx-auto max-w-6xl px-4 py-3 md:px-8 md:py-4">
      <div className="grid grid-cols-3 gap-2">

        <button onClick={onStartChat} className={tileClass}>
          <EcoBubbleOneEye size={22} />
          <span className="text-xs font-medium text-gray-700 truncate">ECO AI</span>
        </button>

        <button onClick={() => navigate('/app/configuracoes?menu=favoritos')} className={tileClass}>
          <Heart size={18} color="#6EC8FF" fill="#6EC8FF" strokeWidth={0} />
          <span className="text-xs font-medium text-gray-700 truncate">Favoritos</span>
        </button>

        <button onClick={() => navigate('/app/diario-estoico')} className={tileClass}>
          <BookOpen size={18} color="#6EC8FF" strokeWidth={1.5} />
          <span className="text-xs font-medium text-gray-700 truncate">Diário</span>
        </button>

      </div>
    </section>
  );
}

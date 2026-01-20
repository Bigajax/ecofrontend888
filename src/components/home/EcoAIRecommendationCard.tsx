import EcoBubbleOneEye from '@/components/EcoBubbleOneEye';

interface EcoAIRecommendationCardProps {
  onStartChat: () => void;
}

export default function EcoAIRecommendationCard({ onStartChat }: EcoAIRecommendationCardProps) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <button
        onClick={onStartChat}
        className="group w-full flex items-center gap-4 rounded-3xl bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 px-6 py-6 transition-all duration-300 hover:border-purple-400 hover:shadow-[0_8px_30px_rgba(147,51,234,0.15)] hover:-translate-y-1 active:scale-98 cursor-pointer md:px-8 md:py-7"
      >
        {/* Logo ECO - Maior e mais destacado */}
        <div className="flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-white shadow-lg flex-shrink-0 transition-transform duration-300 group-hover:scale-110">
          <EcoBubbleOneEye size={56} />
        </div>

        {/* Texto com mais presença */}
        <div className="flex-1 text-left">
          <h3 className="font-display text-xl md:text-2xl font-semibold text-gray-900 mb-1">
            ECO AI
          </h3>
          <p className="text-sm md:text-base text-gray-700 leading-relaxed">
            Quer falar sobre o que está passando agora?
          </p>
        </div>

        {/* Indicador visual de ação */}
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-600 text-white transition-all duration-300 group-hover:bg-purple-700 flex-shrink-0">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-transform duration-300 group-hover:translate-x-1"
          >
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </div>
      </button>
    </section>
  );
}

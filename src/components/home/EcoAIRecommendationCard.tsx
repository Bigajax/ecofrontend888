import EcoBubbleOneEye from '@/components/EcoBubbleOneEye';

interface EcoAIRecommendationCardProps {
  onStartChat: () => void;
}

export default function EcoAIRecommendationCard({ onStartChat }: EcoAIRecommendationCardProps) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-2 md:px-8">
      <button
        onClick={onStartChat}
        className="group flex items-center gap-3 rounded-2xl bg-white border border-gray-200 px-4 py-3 transition-all duration-200 hover:border-purple-300 hover:bg-purple-50/30 active:scale-95 cursor-pointer"
      >
        {/* Logo ECO */}
        <div className="flex items-center justify-center w-10 h-10">
          <EcoBubbleOneEye size={40} />
        </div>

        {/* Texto */}
        <span className="text-sm font-semibold text-gray-800">
          ECO AI
        </span>
      </button>
    </section>
  );
}

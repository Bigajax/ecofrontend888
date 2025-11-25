import React from 'react';
import { Play, Lock } from 'lucide-react';

interface Recommendation {
  id: string;
  title: string;
  description: string;
  duration: string;
  image: string;
  isPremium?: boolean;
}

interface DailyRecommendationsSectionProps {
  recommendations: Recommendation[];
  onRecommendationClick?: (recommendationId: string) => void;
}

export default function DailyRecommendationsSection({
  recommendations,
  onRecommendationClick,
}: DailyRecommendationsSectionProps) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      {/* Title */}
      <div className="mb-8">
        <h2 className="font-display text-xl font-bold text-[var(--eco-text)]">
          Recomendações diárias
        </h2>
        <p className="mt-2 text-[14px] text-[var(--eco-muted)]">
          {new Date().toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Desktop: Grid - 3 colunas com linha horizontal */}
      <div className="mb-8 hidden md:block">
        {/* Linha horizontal com bolinhas conectadas */}
        <div className="relative mb-8">
          <div className="flex items-center justify-between max-w-4xl mx-auto px-8">
            {recommendations.map((_, index) => (
              <React.Fragment key={index}>
                {/* Bolinha */}
                <div className="w-6 h-6 rounded-full border-[2px] border-purple-700 bg-white relative z-10" />

                {/* Linha conectora (exceto depois da última bolinha) */}
                {index < recommendations.length - 1 && (
                  <div className="flex-1 h-[1px] bg-gray-300 mx-4" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-3 gap-6">
          {recommendations.map((rec) => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              onClick={() => onRecommendationClick?.(rec.id)}
            />
          ))}
        </div>
      </div>

      {/* Mobile: Layout vertical com linha vertical */}
      <div className="block md:hidden">
        <div className="relative">
          {/* Linha vertical */}
          <div className="absolute left-3 top-0 bottom-0 w-[1px] bg-gray-300" />

          {/* Cards verticais com bolinhas */}
          <div className="space-y-6">
            {recommendations.map((rec, index) => (
              <div key={rec.id} className="relative flex items-start gap-4">
                {/* Bolinha */}
                <div className="relative flex-shrink-0 z-10">
                  <div className="w-6 h-6 rounded-full border-[2px] border-purple-700 bg-white" />
                </div>

                {/* Card */}
                <div className="flex-1">
                  <RecommendationCard
                    recommendation={rec}
                    mobile
                    vertical
                    onClick={() => onRecommendationClick?.(rec.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

interface RecommendationCardProps {
  recommendation: Recommendation;
  mobile?: boolean;
  vertical?: boolean;
  onClick?: () => void;
}

function RecommendationCard({
  recommendation,
  mobile,
  vertical,
  onClick,
}: RecommendationCardProps) {
  const baseClass = vertical ? 'w-full' : mobile ? 'w-80 flex-shrink-0' : 'w-full';

  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.08)] transition-all duration-300 md:hover:shadow-[0_12px_50px_rgba(0,0,0,0.2)] active:scale-95 touch-manipulation ${baseClass}`}
      style={{
        backgroundImage: recommendation.image,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        minHeight: vertical ? '200px' : mobile ? '200px' : '220px',
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

      {/* Content */}
      <div className="relative flex h-full flex-col justify-between p-4 md:p-5">
        {/* Top: Duration Badge */}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur-md">
            <span className="text-[11px] font-medium text-white">
              {recommendation.duration}
            </span>
          </span>
          {recommendation.isPremium && (
            <div className="flex items-center justify-center rounded-full bg-black/50 p-1.5 backdrop-blur-md">
              <Lock size={14} className="text-white" />
            </div>
          )}
        </div>

        {/* Bottom: Title, Description, Play Button */}
        <div className="flex items-end justify-between gap-4">
          <div className="flex-1 text-left">
            <h3 className="font-display text-base font-normal text-white drop-shadow-lg md:text-lg">
              {recommendation.title}
            </h3>
            <p className="mt-0.5 text-[12px] text-white/85 drop-shadow-md md:text-[13px]">
              {recommendation.description}
            </p>
          </div>

          {/* Play Button - Circular Icon */}
          <button
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="shrink-0 flex items-center justify-center rounded-full bg-white/85 p-3 shadow-lg transition-all duration-300 md:hover:bg-white active:scale-95 touch-manipulation backdrop-blur-md"
          >
            <Play size={18} className="fill-black text-black ml-0.5" />
          </button>
        </div>
      </div>
    </button>
  );
}

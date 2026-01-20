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
          Para o seu momento
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

      {/* Desktop: Grid com hierarquia visual - 1 destaque + 2 secundários */}
      <div className="mb-8 hidden md:block">
        {/* Cards com hierarquia */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {recommendations.map((rec, index) => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              onClick={() => onRecommendationClick?.(rec.id)}
              featured={index === 0}
            />
          ))}
        </div>
      </div>

      {/* Mobile: Layout vertical com linha vertical */}
      <div className="block md:hidden">
        <div className="relative">
          {/* Cards verticais com bolinhas */}
          <div className="flex flex-col gap-5">
            {recommendations.map((rec, index) => (
              <div key={rec.id} className="relative flex gap-4">
                {/* Container da bolinha e linha - altura igual ao card */}
                <div className="relative flex-shrink-0 z-0 flex items-center">
                  <div className="relative flex flex-col items-center">
                    {/* Bolinha centralizada */}
                    <div className="w-6 h-6 rounded-full border-[2px] border-[#6EC8FF] bg-white" />

                    {/* Linha conectora - da borda inferior desta bolinha até a borda superior da próxima */}
                    {index < recommendations.length - 1 && (
                      <div
                        className="absolute top-full left-1/2 -translate-x-1/2 w-[2px] bg-gray-200"
                        style={{ height: 'calc(150px + 1.25rem - 24px)' }}
                      />
                    )}
                  </div>
                </div>

                {/* Card */}
                <div className="flex-1 relative z-10">
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
  featured?: boolean;
  onClick?: () => void;
}

function RecommendationCard({
  recommendation,
  mobile,
  vertical,
  featured = false,
  onClick,
}: RecommendationCardProps) {
  const baseClass = vertical ? 'w-full' : mobile ? 'w-80 flex-shrink-0' : 'w-full';

  // Featured card spans all columns and is taller
  const heightClass = featured && !mobile && !vertical
    ? 'md:col-span-3 md:min-h-[280px]'
    : vertical ? '150px' : mobile ? '150px' : '180px';

  return (
    <button
      onClick={recommendation.isPremium ? undefined : onClick}
      disabled={recommendation.isPremium}
      className={`group relative overflow-hidden rounded-3xl shadow-[0_4px_30px_rgba(0,0,0,0.08)] transition-all duration-300 ${
        recommendation.isPremium
          ? 'cursor-not-allowed'
          : 'md:hover:scale-[0.98] md:hover:shadow-[0_2px_15px_rgba(0,0,0,0.06)] md:hover:translate-y-1 active:scale-95 cursor-pointer'
      } touch-manipulation ${baseClass} ${featured && !mobile && !vertical ? heightClass : ''}`}
      style={{
        backgroundImage: recommendation.image,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        minHeight: typeof heightClass === 'string' && !heightClass.startsWith('md:') ? heightClass : vertical ? '150px' : mobile ? '150px' : '180px',
        opacity: 1,
        filter: 'none',
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

      {/* Hover overlay - darken on hover */}
      <div className="absolute inset-0 bg-black/0 md:group-hover:bg-black/20 transition-all duration-300" />

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

          {/* Play Button - Circular Icon - apenas visual, o clique é tratado pelo card pai */}
          <div
            className="shrink-0 flex items-center justify-center rounded-full bg-white/85 p-3 shadow-lg transition-all duration-300 pointer-events-none backdrop-blur-md"
          >
            <Play size={18} className="fill-black text-black ml-0.5" />
          </div>
        </div>
      </div>
    </button>
  );
}

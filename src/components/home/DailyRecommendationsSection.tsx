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
      <div className="mb-8 pb-6 border-b border-[var(--eco-line)]">
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

      {/* Desktop: Grid - 3 colunas */}
      <div className="mb-8 hidden grid-cols-3 gap-6 md:grid">
        {recommendations.map((rec) => (
          <RecommendationCard
            key={rec.id}
            recommendation={rec}
            onClick={() => onRecommendationClick?.(rec.id)}
          />
        ))}
      </div>

      {/* Mobile: Horizontal scroll */}
      <div className="block md:hidden">
        <div className="flex gap-4 overflow-x-auto pb-2">
          {recommendations.map((rec) => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              mobile
              onClick={() => onRecommendationClick?.(rec.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

interface RecommendationCardProps {
  recommendation: Recommendation;
  mobile?: boolean;
  onClick?: () => void;
}

function RecommendationCard({
  recommendation,
  mobile,
  onClick,
}: RecommendationCardProps) {
  const baseClass = mobile ? 'w-80 flex-shrink-0' : 'w-full';

  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.08)] transition-all duration-300 hover:shadow-[0_12px_50px_rgba(0,0,0,0.2)] hover:scale-95 active:scale-90 ${baseClass}`}
      style={{
        backgroundImage: recommendation.image,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        minHeight: mobile ? '200px' : '220px',
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
            className="shrink-0 flex items-center justify-center rounded-full bg-white/85 p-3 shadow-lg transition-all duration-300 hover:bg-white hover:scale-110 active:scale-95 backdrop-blur-md"
          >
            <Play size={18} className="fill-black text-black ml-0.5" />
          </button>
        </div>
      </div>
    </button>
  );
}

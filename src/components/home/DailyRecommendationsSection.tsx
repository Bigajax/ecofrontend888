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
}

export default function DailyRecommendationsSection({
  recommendations,
}: DailyRecommendationsSectionProps) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      {/* Title */}
      <div className="mb-8">
        <h2 className="font-display text-2xl font-normal text-[var(--eco-text)]">
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
          <RecommendationCard key={rec.id} recommendation={rec} />
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
}

function RecommendationCard({
  recommendation,
  mobile,
}: RecommendationCardProps) {
  const baseClass = mobile ? 'w-80 flex-shrink-0' : 'w-full';

  return (
    <button
      className={`group relative overflow-hidden rounded-2xl border border-[var(--eco-line)] shadow-[0_4px_30px_rgba(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_8px_40px_rgba(0,0,0,0.08)] hover:-translate-y-1 active:translate-y-0 ${baseClass}`}
      style={{
        backgroundImage: recommendation.image,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        minHeight: mobile ? '240px' : '280px',
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent transition-all duration-300 group-hover:from-black/70 group-hover:via-black/30" />

      {/* Content */}
      <div className="relative flex h-full flex-col justify-between p-6 md:p-8">
        {/* Top: Duration + Premium Badge */}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1 backdrop-blur-sm">
            <span className="text-[12px] font-medium text-[var(--eco-text)]">
              {recommendation.duration}
            </span>
          </span>
          {recommendation.isPremium && (
            <div className="flex items-center gap-1 rounded-full bg-white/70 px-3 py-1 backdrop-blur-sm">
              <Lock size={12} className="text-[var(--eco-user)]" />
              <span className="text-[11px] font-medium text-[var(--eco-user)]">
                Premium
              </span>
            </div>
          )}
        </div>

        {/* Bottom: Title, Description, Play Button */}
        <div className="space-y-3">
          <div>
            <h3 className="font-display text-lg font-normal text-white drop-shadow-lg md:text-xl">
              {recommendation.title}
            </h3>
            <p className="mt-1 text-[13px] text-white/80 drop-shadow-md md:text-[14px]">
              {recommendation.description}
            </p>
          </div>

          {/* Play Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-[13px] font-medium text-[var(--eco-user)] backdrop-blur-sm transition-all duration-300 hover:bg-white active:scale-95 md:text-[14px]"
          >
            <Play size={14} className="fill-[var(--eco-user)]" />
            Explorar
          </button>
        </div>
      </div>
    </button>
  );
}

import { ChevronRight, Lock, Volume2, Music } from 'lucide-react';

interface Recommendation {
  id: string;
  title: string;
  description: string;
  duration: string;
  image: string;
  imagePosition?: string;
  isPremium?: boolean;
  categoryType?: 'meditacao' | 'musica' | 'programa';
}

interface DailyRecommendationsSectionProps {
  recommendations: Recommendation[];
  onRecommendationClick?: (recommendationId: string) => void;
}

export default function DailyRecommendationsSection({
  recommendations,
  onRecommendationClick,
}: DailyRecommendationsSectionProps) {
  const dateLabel = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      {/* Title */}
      <div className="mb-5">
        <h2 className="font-display text-xl font-bold text-[var(--eco-text)]">
          Para você, hoje
        </h2>
        <p className="mt-1 text-[14px] text-[var(--eco-muted)]">{dateLabel}</p>
      </div>

      {/* List card */}
      <div className="rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.08)] overflow-hidden">
        {recommendations.map((rec, index) => (
          <button
            key={rec.id}
            onClick={() => onRecommendationClick?.(rec.id)}
            className={`w-full flex items-center gap-4 px-4 py-4 text-left transition-colors duration-150 active:bg-gray-50 md:hover:bg-gray-50 ${
              index < recommendations.length - 1 ? 'border-b border-gray-100' : ''
            }`}
          >
            {/* Thumbnail */}
            <div className="relative flex-shrink-0 w-[78px] h-[78px] rounded-xl overflow-hidden">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: rec.image,
                  backgroundPosition: rec.imagePosition || 'center',
                }}
              />
              {/* Duration badge */}
              <div className="absolute bottom-1 left-1 rounded-md bg-black/60 px-1.5 py-0.5 backdrop-blur-sm">
                <span className="text-[10px] font-semibold text-white">{rec.duration}</span>
              </div>
              {/* Lock overlay for premium */}
              {rec.isPremium && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Lock size={16} className="text-white drop-shadow" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[16px] text-[var(--eco-text)] leading-snug">
                {rec.title}
              </p>
              <p className="mt-0.5 text-[13px] text-[var(--eco-muted)] truncate">
                {rec.description}
              </p>
              {/* Category badge */}
              {rec.categoryType && (
                <div className="mt-2">
                  <CategoryBadge type={rec.categoryType} />
                </div>
              )}
            </div>

            {/* Chevron */}
            <ChevronRight size={18} className="flex-shrink-0 text-gray-400" />
          </button>
        ))}
      </div>
    </section>
  );
}

interface CategoryBadgeProps {
  type: 'meditacao' | 'musica' | 'programa';
}

function CategoryBadge({ type }: CategoryBadgeProps) {
  if (type === 'meditacao') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EDE9F9] px-3 py-1">
        <Volume2 size={11} className="text-[#7C5CBF]" />
        <span className="text-[11px] font-bold tracking-wide text-[#7C5CBF] uppercase">
          Meditação
        </span>
      </span>
    );
  }
  if (type === 'musica') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E0F0FF] px-3 py-1">
        <Music size={11} className="text-[#3B8DD4]" />
        <span className="text-[11px] font-bold tracking-wide text-[#3B8DD4] uppercase">
          Música
        </span>
      </span>
    );
  }
  // programa
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EDE9F9] px-3 py-1">
      <Volume2 size={11} className="text-[#7C5CBF]" />
      <span className="text-[11px] font-bold tracking-wide text-[#7C5CBF] uppercase">
        Programa
      </span>
    </span>
  );
}

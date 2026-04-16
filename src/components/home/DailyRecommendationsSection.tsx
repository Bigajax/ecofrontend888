import { ChevronRight, Lock, Volume2, Music } from 'lucide-react';
import { motion } from 'framer-motion';

const rowVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 100, damping: 22 } },
};

interface Recommendation {
  id: string;
  title: string;
  description: string;
  duration: string;
  image: string;
  imagePosition?: string;
  isPremium?: boolean;
  categoryType?: 'meditacao' | 'musica' | 'programa';
  progress?: number; // 0–100
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
      <div className="mb-5 flex items-start gap-3">
        <div className="mt-1 w-1 h-6 rounded-full flex-shrink-0" style={{ background: 'linear-gradient(180deg, #6EC8FF, #4BAEE8)' }} />
        <div>
          <h2 className="font-display text-xl font-bold text-[var(--eco-text)]">
            Para você, hoje
          </h2>
          <p className="mt-0.5 text-[14px] text-[var(--eco-muted)]">{dateLabel}</p>
        </div>
      </div>

      {/* List card */}
      <motion.div
        className="rounded-2xl bg-white overflow-hidden"
        style={{ border: '1px solid rgba(110,200,255,0.16)', boxShadow: '0 4px 28px rgba(110,200,255,0.10)' }}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        variants={{ visible: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } } }}
      >
        {recommendations.map((rec, index) => (
          <motion.button
            key={rec.id}
            variants={rowVariants}
            whileHover={{ x: 3 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => onRecommendationClick?.(rec.id)}
            className={`w-full flex items-center gap-4 px-5 py-5 text-left transition-colors duration-150 active:bg-gray-50 md:hover:bg-gray-50 min-h-[88px] ${
              index < recommendations.length - 1 ? 'border-b border-gray-100' : ''
            }`}
          >
            {/* Thumbnail */}
            <div className="relative flex-shrink-0 w-[88px] h-[88px] rounded-2xl overflow-hidden shadow-sm">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: rec.image,
                  backgroundPosition: rec.imagePosition || 'center',
                }}
              />
              {/* Gradient overlay for readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              {/* Duration badge */}
              <div className="absolute bottom-1.5 left-1.5 rounded-md bg-black/65 px-1.5 py-0.5 backdrop-blur-sm">
                <span className="text-[11px] font-bold text-white">{rec.duration}</span>
              </div>
              {/* Lock overlay for premium */}
              {rec.isPremium && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                  <Lock size={18} className="text-white drop-shadow" />
                </div>
              )}
              {/* Progress bar */}
              {(rec.progress ?? 0) > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/25 rounded-b-2xl overflow-hidden">
                  <div
                    className="h-full bg-eco-baby"
                    style={{ width: `${rec.progress}%` }}
                  />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[17px] text-[var(--eco-text)] leading-snug">
                {rec.title}
              </p>
              <p className="mt-1 text-[14px] text-[var(--eco-muted)] leading-snug line-clamp-2">
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
            <ChevronRight size={20} className="flex-shrink-0 text-gray-300" />
          </motion.button>
        ))}
      </motion.div>
    </section>
  );
}

interface CategoryBadgeProps {
  type: 'meditacao' | 'musica' | 'programa';
}

function CategoryBadge({ type }: CategoryBadgeProps) {
  if (type === 'meditacao') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EDE9F9] px-3 py-1.5">
        <Volume2 size={12} className="text-[#7C5CBF]" />
        <span className="text-[12px] font-bold tracking-wide text-[#7C5CBF] uppercase">
          Meditação
        </span>
      </span>
    );
  }
  if (type === 'musica') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E0F0FF] px-3 py-1.5">
        <Music size={12} className="text-[#3B8DD4]" />
        <span className="text-[12px] font-bold tracking-wide text-[#3B8DD4] uppercase">
          Música
        </span>
      </span>
    );
  }
  // programa
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F4FF] px-3 py-1.5">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2E7FB8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>
      <span className="text-[12px] font-bold tracking-wide text-[#2E7FB8] uppercase">
        Programa
      </span>
    </span>
  );
}

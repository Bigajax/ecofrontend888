import { useState, useRef } from 'react';
import { Play, Lock, ChevronLeft, ChevronRight } from 'lucide-react';

interface Blessing {
  id: string;
  title: string;
  description: string;
  duration: string;
  image: string;
  isPremium?: boolean;
  imagePosition?: string;
}

interface EnergyBlessingsSectionProps {
  blessings: Blessing[];
  onBlessingClick?: (blessingId: string) => void;
}

export default function EnergyBlessingsSection({
  blessings,
  onBlessingClick,
}: EnergyBlessingsSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 400;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
      setTimeout(checkScroll, 100);
    }
  };

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12 bg-white">
      {/* Title */}
      <div className="mb-8 pb-6 border-b border-[var(--eco-line)]">
        <h2 className="font-display text-xl font-bold text-[var(--eco-text)]">
          Meditações
        </h2>
        <p className="mt-2 text-[14px] text-[var(--eco-muted)]">
          Meditações guiadas para equilibrar sua energia
        </p>
      </div>

      {/* Desktop: Horizontal scroll with navigation buttons */}
      <div className="relative hidden md:block">
        {/* Left Arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 z-10 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg border border-[var(--eco-line)] transition-all hover:scale-110 active:scale-95"
          >
            <ChevronLeft size={20} className="text-[var(--eco-text)]" />
          </button>
        )}

        {/* Right Arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 z-10 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg border border-[var(--eco-line)] transition-all hover:scale-110 active:scale-95"
          >
            <ChevronRight size={20} className="text-[var(--eco-text)]" />
          </button>
        )}

        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-6 overflow-x-auto scrollbar-hide pb-4 pr-8 bg-white"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {blessings.map((blessing) => (
            <BlessingCard
              key={blessing.id}
              blessing={blessing}
              onClick={() => onBlessingClick?.(blessing.id)}
            />
          ))}
        </div>
      </div>

      {/* Mobile: Horizontal scroll */}
      <div className="block md:hidden bg-white">
        <div className="flex gap-4 overflow-x-auto pb-2 pr-4 scrollbar-hide bg-white" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {blessings.map((blessing) => (
            <BlessingCard
              key={blessing.id}
              blessing={blessing}
              mobile
              onClick={() => onBlessingClick?.(blessing.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

interface BlessingCardProps {
  blessing: Blessing;
  mobile?: boolean;
  onClick?: () => void;
}

function BlessingCard({
  blessing,
  mobile,
  onClick,
}: BlessingCardProps) {
  const baseClass = mobile ? 'w-80 flex-shrink-0' : 'w-96 flex-shrink-0';

  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.08)] transition-all duration-300 md:hover:scale-[0.98] md:hover:shadow-[0_2px_15px_rgba(0,0,0,0.06)] md:hover:translate-y-1 active:scale-95 touch-manipulation ${baseClass}`}
      style={{
        backgroundImage: blessing.image,
        backgroundSize: 'cover',
        backgroundPosition: blessing.imagePosition || 'center',
        minHeight: mobile ? '200px' : '220px',
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-purple-900/70 via-purple-800/30 to-transparent" />

      {/* Hover overlay - darken on hover */}
      <div className="absolute inset-0 bg-black/0 md:group-hover:bg-black/20 transition-all duration-300" />

      {/* Content */}
      <div className="relative flex h-full flex-col justify-between p-4 md:p-5">
        {/* Top: Duration Badge and Program Badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-900/50 px-3 py-1.5 backdrop-blur-md">
              <span className="text-[11px] font-medium text-white">
                {blessing.duration}
              </span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-900/50 px-3 py-1.5 backdrop-blur-md">
              <span className="text-[11px] font-medium text-white">
                Programa Dr. Joe Dispenza
              </span>
            </span>
          </div>
          {blessing.isPremium && (
            <div className="flex items-center justify-center rounded-full bg-purple-900/50 p-1.5 backdrop-blur-md">
              <Lock size={14} className="text-white" />
            </div>
          )}
        </div>

        {/* Bottom: Title, Description, Play Button */}
        <div className="flex items-end justify-between gap-4">
          <div className="flex-1 text-left">
            <h3 className="font-display text-base font-normal text-white drop-shadow-lg md:text-lg">
              {blessing.title}
            </h3>
            <p className="mt-0.5 text-[12px] text-white/85 drop-shadow-md md:text-[13px]">
              {blessing.description}
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

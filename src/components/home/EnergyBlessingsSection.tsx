import { useState, useRef, useMemo } from 'react';
import { Play, Lock, ChevronLeft, ChevronRight } from 'lucide-react';

interface Blessing {
  id: string;
  title: string;
  description: string;
  duration: string;
  image: string;
  isPremium?: boolean;
  imagePosition?: string;
  category?: string;
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
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');

  // Extract unique categories
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(blessings.map(b => b.category).filter(Boolean))
    );
    return ['Todas', ...uniqueCategories];
  }, [blessings]);

  // Filter blessings by selected category
  const filteredBlessings = useMemo(() => {
    if (selectedCategory === 'Todas') {
      return blessings;
    }
    return blessings.filter(b => b.category === selectedCategory);
  }, [blessings, selectedCategory]);

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
      <div className="mb-6 pb-4 border-b border-[var(--eco-line)]">
        <h2 className="font-display text-xl font-bold text-[var(--eco-text)]">
          Jornadas
        </h2>
        <p className="mt-2 text-[14px] text-[var(--eco-muted)]">
          Programas e meditações para sua transformação pessoal
        </p>
      </div>

      {/* Category Tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`flex-shrink-0 rounded-full px-4 py-2 text-[13px] font-medium transition-all duration-200 ${
              selectedCategory === category
                ? 'bg-[var(--eco-user)] text-white shadow-sm'
                : 'bg-gray-100 text-[var(--eco-muted)] hover:bg-gray-200'
            }`}
          >
            {category}
          </button>
        ))}
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
          {filteredBlessings.map((blessing) => (
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
          {filteredBlessings.map((blessing) => (
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
  const baseClass = mobile ? 'w-[calc(100vw-3rem)] flex-shrink-0' : 'w-96 flex-shrink-0';

  return (
    <button
      onClick={blessing.isPremium ? undefined : onClick}
      disabled={blessing.isPremium}
      className={`group relative overflow-hidden rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.08)] transition-all duration-300 ${
        blessing.isPremium
          ? 'cursor-not-allowed'
          : 'md:hover:scale-[0.98] md:hover:shadow-[0_2px_15px_rgba(0,0,0,0.06)] md:hover:translate-y-1 active:scale-95 cursor-pointer'
      } touch-manipulation ${baseClass}`}
      style={{
        backgroundImage: blessing.image,
        backgroundSize: 'cover',
        backgroundPosition: blessing.imagePosition || 'center',
        minHeight: mobile ? '160px' : '220px',
        opacity: 1,
        filter: 'none',
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

      {/* Hover overlay - darken on hover */}
      <div className="absolute inset-0 bg-black/0 md:group-hover:bg-black/20 transition-all duration-300" />

      {/* Content */}
      <div className="relative flex h-full flex-col justify-between p-3 md:p-5">
        {/* Top: Duration Badge and Category Badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 backdrop-blur-md">
              <span className="text-[10px] font-medium text-white">
                {blessing.duration}
              </span>
            </span>
            {blessing.category && (
              <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 backdrop-blur-md">
                <span className="text-[10px] font-medium text-white">
                  {blessing.category}
                </span>
              </span>
            )}
          </div>
          {blessing.isPremium && (
            <div className="flex items-center justify-center rounded-full bg-black/50 p-1 backdrop-blur-md">
              <Lock size={12} className="text-white" />
            </div>
          )}
        </div>

        {/* Bottom: Title, Description, Play Button */}
        <div className="flex items-end justify-between gap-3">
          <div className="flex-1 text-left">
            <h3 className="font-display text-[15px] font-normal text-white drop-shadow-lg md:text-lg">
              {blessing.title}
            </h3>
            <p className="mt-0.5 text-[11px] text-white/85 drop-shadow-md md:text-[13px]">
              {blessing.description}
            </p>
          </div>

          {/* Play Button - Circular Icon */}
          <button
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="shrink-0 flex items-center justify-center rounded-full bg-white/85 p-2.5 shadow-lg transition-all duration-300 md:hover:bg-white active:scale-95 touch-manipulation backdrop-blur-md"
          >
            <Play size={16} className="fill-black text-black ml-0.5" />
          </button>
        </div>
      </div>
    </button>
  );
}

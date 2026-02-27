import { useState, useRef, useMemo } from 'react';
import { Lock, ChevronLeft, ChevronRight, Headphones } from 'lucide-react';

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

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(blessings.map(b => b.category).filter(Boolean))
    );
    return ['Todas', ...uniqueCategories];
  }, [blessings]);

  const filteredBlessings = useMemo(() => {
    if (selectedCategory === 'Todas') return blessings;
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
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -300 : 300,
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
          Cada jornada foi criada para levar você de um ponto a outro — com intenção.
        </p>
      </div>

      {/* Category Tabs */}
      <div
        className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
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

      {/* Desktop: horizontal scroll with arrows */}
      <div className="relative hidden md:block">
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 z-10 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg border border-[var(--eco-line)] transition-all hover:scale-110 active:scale-95"
          >
            <ChevronLeft size={20} className="text-[var(--eco-text)]" />
          </button>
        )}
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
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 bg-white"
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

      {/* Mobile: horizontal scroll */}
      <div className="block md:hidden bg-white">
        <div
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide bg-white"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
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

function BlessingCard({ blessing, mobile, onClick }: BlessingCardProps) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex-shrink-0 overflow-hidden rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.14)] transition-all duration-300 md:hover:scale-[0.97] md:hover:shadow-[0_2px_12px_rgba(0,0,0,0.10)] active:scale-95 cursor-pointer touch-manipulation ${
        mobile ? 'w-[155px]' : 'w-[190px]'
      }`}
      style={{
        backgroundImage: blessing.image,
        backgroundSize: 'cover',
        backgroundPosition: blessing.imagePosition || 'center',
        minHeight: mobile ? '248px' : '285px',
      }}
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

      {/* Hover darken */}
      <div className="absolute inset-0 bg-black/0 md:group-hover:bg-black/15 transition-all duration-300" />

      {/* Content */}
      <div className="relative flex h-full flex-col justify-between p-3">
        {/* Top row: category badge + lock */}
        <div className="flex items-start justify-between gap-1">
          {blessing.category ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 backdrop-blur-md">
              <Headphones size={9} className="text-white/90 flex-shrink-0" />
              <span className="text-[9px] font-bold uppercase tracking-wide text-white leading-none">
                {blessing.category}
              </span>
            </span>
          ) : (
            <span />
          )}
          {blessing.isPremium && (
            <div className="flex items-center justify-center rounded-lg bg-black/55 p-1.5 backdrop-blur-md">
              <Lock size={11} className="text-white" />
            </div>
          )}
        </div>

        {/* Bottom: duration + title */}
        <div className="text-left">
          <p className="mb-1 text-[11px] font-semibold text-white/75 drop-shadow">
            {blessing.duration}
          </p>
          <h3 className="font-display text-[15px] font-bold leading-snug text-white drop-shadow-lg line-clamp-3">
            {blessing.title}
          </h3>
        </div>
      </div>
    </button>
  );
}

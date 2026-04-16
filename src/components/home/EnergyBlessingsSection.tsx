import { useState, useRef, useMemo } from 'react';
import { Lock, ChevronLeft, ChevronRight, Headphones } from 'lucide-react';
import { motion } from 'framer-motion';

interface Blessing {
  id: string;
  title: string;
  description: string;
  duration: string;
  image: string;
  isPremium?: boolean;
  imagePosition?: string;
  category?: string;
  progress?: number; // 0–100, undefined = não mostrar
  stackCount?: number; // quando > 1, renderiza cards empilhados atrás
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
      <div className="mb-6 pb-4" style={{ borderBottom: '1px solid rgba(110,200,255,0.14)' }}>
        <div className="flex items-start gap-3">
          <div className="mt-1 w-1 h-6 rounded-full flex-shrink-0" style={{ background: 'linear-gradient(180deg, #6EC8FF, #4BAEE8)' }} />
          <div>
            <h2 className="font-display text-xl font-bold text-[var(--eco-text)]">
              Jornadas
            </h2>
            <p className="mt-0.5 text-[14px] text-[var(--eco-muted)]">
              De onde você está para onde quer chegar.
            </p>
          </div>
        </div>
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
            className={`flex-shrink-0 rounded-full px-4 py-1.5 text-[13px] font-medium transition-all duration-200 ${
              selectedCategory === category
                ? 'text-white'
                : 'text-[#4A90B8] hover:bg-[rgba(110,200,255,0.14)]'
            }`}
          style={
            selectedCategory === category
              ? { background: 'linear-gradient(135deg,#6EC8FF,#4BAEE8)', boxShadow: '0 3px 14px rgba(110,200,255,0.38)' }
              : { background: 'rgba(110,200,255,0.09)', border: '1px solid rgba(110,200,255,0.20)' }
          }
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
            className="absolute left-0 top-1/2 z-10 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white transition-all hover:scale-110 active:scale-95"
            style={{ border: '1px solid rgba(110,200,255,0.28)', boxShadow: '0 2px 16px rgba(110,200,255,0.18)' }}
          >
            <ChevronLeft size={20} className="text-[var(--eco-text)]" />
          </button>
        )}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 z-10 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white transition-all hover:scale-110 active:scale-95"
            style={{ border: '1px solid rgba(110,200,255,0.28)', boxShadow: '0 2px 16px rgba(110,200,255,0.18)' }}
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
          {filteredBlessings.map((blessing, index) => (
            <motion.div
              key={blessing.id}
              className="flex-shrink-0"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ type: 'spring', stiffness: 75, damping: 20, delay: index * 0.06 }}
            >
              <BlessingCard
                blessing={blessing}
                onClick={() => onBlessingClick?.(blessing.id)}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Mobile: horizontal scroll */}
      <div className="block md:hidden bg-white">
        <div
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide bg-white"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {filteredBlessings.map((blessing, index) => (
            <motion.div
              key={blessing.id}
              className="flex-shrink-0"
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ type: 'spring', stiffness: 75, damping: 20, delay: index * 0.05 }}
            >
              <BlessingCard
                blessing={blessing}
                mobile
                onClick={() => onBlessingClick?.(blessing.id)}
              />
            </motion.div>
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
  const isStacked = (blessing.stackCount ?? 1) > 1;
  const cardW = mobile ? 'w-[165px]' : 'w-[200px]';
  const cardH = mobile ? '260px' : '295px';

  const innerContent = (
    <>
      {/* Multi-stop gradient for strong readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/40 via-50% to-black/10" />

      {/* Hover darken */}
      <div className="absolute inset-0 bg-black/0 md:group-hover:bg-black/20 transition-all duration-300" />

      {/* Content */}
      <div className="relative flex h-full flex-col justify-between p-4">
        {/* Top row: category badge + lock */}
        <div className="flex items-start justify-between gap-1">
          {blessing.category ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 backdrop-blur-md">
              <Headphones size={10} className="text-white/95 flex-shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-wide text-white leading-none">
                {blessing.category}
              </span>
            </span>
          ) : (
            <span />
          )}
          {blessing.isPremium && (
            <div className="flex items-center justify-center rounded-lg bg-black/50 p-1.5 backdrop-blur-md">
              <Lock size={12} className="text-white" />
            </div>
          )}
        </div>

        {/* Bottom: duration + title */}
        <div className="text-left">
          <p className="mb-1.5 text-[12px] font-semibold text-white/80 drop-shadow">
            {blessing.duration}
          </p>
          <h3 className="font-display text-[16px] font-bold leading-snug text-white drop-shadow-lg line-clamp-3">
            {blessing.title}
          </h3>
        </div>

        {/* Progress bar */}
        {(blessing.progress ?? 0) > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 rounded-b-2xl overflow-hidden">
            <div
              className="h-full bg-eco-baby"
              style={{ width: `${blessing.progress}%` }}
            />
          </div>
        )}
      </div>
    </>
  );

  if (isStacked) {
    // Wrapper mais alto para acomodar os cards que aparecem embaixo
    const wrapperH = mobile ? 'calc(248px + 18px)' : 'calc(285px + 18px)';

    return (
      <div
        className={`relative flex-shrink-0 ${cardW}`}
        style={{ height: wrapperH }}
      >
        {/* Card fantasma — mais atrás: deslocado 14px para baixo, mais estreito, rotação */}
        <div
          className="absolute rounded-2xl overflow-hidden"
          style={{
            top: 14,
            left: 8,
            right: 8,
            height: cardH,
            backgroundImage: blessing.image,
            backgroundSize: 'cover',
            backgroundPosition: blessing.imagePosition || 'center',
            transform: 'rotate(-2.5deg)',
            transformOrigin: 'center top',
            zIndex: 1,
          }}
        >
          <div className="absolute inset-0 bg-black/55 rounded-2xl" />
        </div>

        {/* Card fantasma — meio: deslocado 7px para baixo, levemente estreito, rotação oposta */}
        <div
          className="absolute rounded-2xl overflow-hidden"
          style={{
            top: 7,
            left: 4,
            right: 4,
            height: cardH,
            backgroundImage: blessing.image,
            backgroundSize: 'cover',
            backgroundPosition: blessing.imagePosition || 'center',
            transform: 'rotate(2deg)',
            transformOrigin: 'center top',
            zIndex: 2,
          }}
        >
          <div className="absolute inset-0 bg-black/30 rounded-2xl" />
        </div>

        {/* Card principal — ocupa o topo, cobre os fantasmas deixando apenas o fundo visível */}
        <button
          onClick={onClick}
          className="group absolute overflow-hidden rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.14)] transition-all duration-300 md:hover:scale-[0.97] md:hover:shadow-[0_2px_12px_rgba(0,0,0,0.10)] active:scale-95 cursor-pointer touch-manipulation"
          style={{
            top: 0,
            left: 0,
            right: 0,
            height: cardH,
            backgroundImage: blessing.image,
            backgroundSize: 'cover',
            backgroundPosition: blessing.imagePosition || 'center',
            zIndex: 3,
          }}
        >
          {innerContent}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`group relative flex-shrink-0 overflow-hidden rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.14)] transition-all duration-300 md:hover:scale-[0.97] md:hover:shadow-[0_2px_12px_rgba(0,0,0,0.10)] active:scale-95 cursor-pointer touch-manipulation ${cardW}`}
      style={{
        backgroundImage: blessing.image,
        backgroundSize: 'cover',
        backgroundPosition: blessing.imagePosition || 'center',
        minHeight: cardH,
      }}
    >
      {innerContent}
    </button>
  );
}

import { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import EcoBubbleOneEye from '@/components/EcoBubbleOneEye';

interface CarouselItem {
  id: number;
  title: string;
  description: string;
  background: string;
  author?: string;
}

interface HeroCarouselProps {
  variant?: 'mobile' | 'desktop';
  userName?: string;
  onStartChat?: () => void;
}

const CAROUSEL_ITEMS: CarouselItem[] = [
  {
    id: 1,
    title: 'Diário Estoico',
    description:
      'Cultive a sabedoria diária através de reflexões estoicas. Uma prática que transforma seu mindset e fortalece sua resiliência emocional.',
    background:
      'url("/images/diario-estoico.webp")',
  },
  {
    id: 2,
    title: 'Não julgue, para que não seja julgado',
    description:
      '"Quando a filosofia é exercida com arrogância e de maneira inflexível, ela é a causa para a ruína de muitos. Deixa a filosofia remover teus defeitos, em vez de uma maneira de protestar contra os defeitos dos outros!"',
    background:
      'url("https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1000&h=600&fit=crop")',
    author: '— Sêneca, Cartas Morais, 103.4B-5A',
  },
  {
    id: 3,
    title: 'Programa de Disciplina',
    description:
      'Construa sua estrutura pessoal através dos 5 Anéis da Disciplina. Um ritual diário inspirado em Miyamoto Musashi para fortalecer sua disciplina com clareza e propósito.',
    background:
      'url("https://images.unsplash.com/photo-1552664730-d307ca884978?w=1000&h=600&fit=crop")',
  },
];

export default function HeroCarousel({
  variant = 'desktop',
  userName,
  onStartChat
}: HeroCarouselProps = {}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // Compute slides array based on variant
  const slides = CAROUSEL_ITEMS;
  const totalSlides = slides.length;

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? totalSlides - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === totalSlides - 1 ? 0 : prevIndex + 1
    );
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const swipeThreshold = 50; // Minimum distance for a swipe
    const diff = touchStartX.current - touchEndX.current;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        // Swiped left - go to next
        goToNext();
      } else {
        // Swiped right - go to previous
        goToPrevious();
      }
    }

    // Reset values
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  // Render slide content based on current index and variant
  const renderSlideContent = () => {
    // Regular carousel content
    const item = CAROUSEL_ITEMS[currentIndex];

    return (
      <div className="relative flex h-full flex-col justify-between p-6">
        <div className="flex-1" />
        <div className="space-y-3">
          <h3 className="font-display text-xl font-normal text-white drop-shadow-lg">
            {item.title}
          </h3>
          <p className="text-[14px] leading-relaxed text-white/90 drop-shadow-md">
            {item.description}
          </p>
          {item.author && (
            <p className="text-[13px] font-medium text-white/80 drop-shadow-md">
              {item.author}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`group relative h-[420px] overflow-hidden select-none ${
        variant === 'mobile'
          ? 'rounded-none border-0'
          : 'rounded-2xl border border-[var(--eco-line)] shadow-[0_4px_30px_rgba(0,0,0,0.04)]'
      }`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background - animated image */}
      <div
        className="absolute inset-0 animate-ken-burns bg-cover bg-center"
        style={{
          backgroundImage: CAROUSEL_ITEMS[currentIndex].background,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col">
        {renderSlideContent()}
      </div>

      {/* Pagination Dots */}
      <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center gap-2 pb-4">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex(index);
            }}
            className={`h-2 rounded-full transition-all duration-300 ${
              currentIndex === index
                ? 'w-6 bg-white'
                : 'w-2 bg-white/40 hover:bg-white/60'
            }`}
            aria-label={`Ir para slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

import { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

interface CarouselItem {
  id: number;
  title: string;
  description: string;
  background: string;
  author?: string;
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

export default function HeroCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? CAROUSEL_ITEMS.length - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === CAROUSEL_ITEMS.length - 1 ? 0 : prevIndex + 1
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

  const currentItem = CAROUSEL_ITEMS[currentIndex];

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-[var(--eco-line)] shadow-[0_4px_30px_rgba(0,0,0,0.04)] select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Image */}
      <div
        className="absolute inset-0 animate-ken-burns bg-cover bg-center"
        style={{
          backgroundImage: currentItem.background,
        }}
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />

      {/* Content */}
      <div className="relative flex h-full flex-col justify-between p-8">
        {/* Quote Content */}
        <div className="flex-1" />

        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-display text-xl font-normal text-white drop-shadow-lg">
              {currentItem.title}
            </h3>
            <p className="text-[14px] leading-relaxed text-white/90 drop-shadow-md">
              {currentItem.description}
            </p>
            {currentItem.author && (
              <p className="text-[13px] font-medium text-white/80 drop-shadow-md">
                {currentItem.author}
              </p>
            )}
          </div>

          {/* Bottom: Pagination Dots - Centered */}
          <div className="flex items-center justify-center">
            <div className="flex gap-2">
              {CAROUSEL_ITEMS.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`h-2 w-2 rounded-full transition-all duration-300 ${
                    index === currentIndex
                      ? 'bg-white w-6'
                      : 'bg-white/40 hover:bg-white/60'
                  }`}
                  aria-label={`Ir para slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

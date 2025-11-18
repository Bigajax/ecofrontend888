import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
      'url("https://images.unsplash.com/photo-1507842072343-583f20270319?w=1000&h=600&fit=crop")',
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

  const currentItem = CAROUSEL_ITEMS[currentIndex];

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[var(--eco-line)] shadow-[0_4px_30px_rgba(0,0,0,0.04)]">
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
        {/* Top: Badge and Navigation */}
        <div className="flex items-center justify-between">
          <div className="rounded-full bg-white/80 px-4 py-2 text-[12px] font-medium text-[var(--eco-text)] backdrop-blur-sm">
            {currentIndex + 1} de {CAROUSEL_ITEMS.length}
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-2">
            <button
              onClick={goToPrevious}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 transition-all duration-300 hover:bg-white/40"
              aria-label="Anterior"
            >
              <ChevronLeft size={18} className="text-white" />
            </button>
            <button
              onClick={goToNext}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 transition-all duration-300 hover:bg-white/40"
              aria-label="Próximo"
            >
              <ChevronRight size={18} className="text-white" />
            </button>
          </div>
        </div>

        {/* Bottom: Quote */}
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
      </div>
    </div>
  );
}

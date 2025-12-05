import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, MoreHorizontal, BookOpen } from 'lucide-react';
import EcoBubbleOneEye from '@/components/EcoBubbleOneEye';

interface CarouselItem {
  id: number;
  title: string;
  description: string;
  background: string;
  author?: string;
  video?: string;
}

interface HeroCarouselProps {
  variant?: 'mobile' | 'desktop';
  userName?: string;
  onStartChat?: () => void;
}

// Função para escolher o vídeo do dia (alterna diariamente)
const getDailyReflectionVideo = (): string => {
  const today = new Date().getDate(); // Dia do mês (1-31)
  // Dias ímpares = vídeo 2 (novo), dias pares = vídeo 1 (original)
  return today % 2 === 1 ? '/videos/diario-reflexao-2.mp4' : '/videos/diario-estoico.mp4';
};

const CAROUSEL_ITEMS: CarouselItem[] = [
  {
    id: 1,
    title: 'Um minuto por dia para clarear a mente e fortalecer sua resiliência.',
    description: '',
    background:
      'url("/images/diario-estoico.webp")',
    video: getDailyReflectionVideo(),
  },
  {
    id: 2,
    title: 'Domine os 5 Anéis da Disciplina',
    description:
      'Um ritual diário poderoso inspirado em Miyamoto Musashi. Construa clareza, foco e propósito através de 5 perguntas que transformam sua disciplina.',
    background:
      'url("/images/5-aneis-hero.png")',
  },
  {
    id: 3,
    title: 'Desperte Seu Potencial Infinito',
    description:
      'Recondicione sua mente, reprograme seu corpo e manifeste uma nova realidade. Meditações cientificamente comprovadas do Dr. Joe Dispenza para transformação profunda.',
    background:
      'url("/images/dr-joe-hero.png")',
  },
];

export default function HeroCarousel({
  variant = 'desktop',
  userName,
  onStartChat
}: HeroCarouselProps = {}) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
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
    touchEndX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;

    touchEndX.current = e.touches[0].clientX;
    const diff = touchEndX.current - touchStartX.current;

    // Limit drag distance for better feel
    const maxDrag = 100;
    const limitedDiff = Math.max(-maxDrag, Math.min(maxDrag, diff));
    setDragOffset(limitedDiff);
  };

  const handleTouchEnd = () => {
    const swipeThreshold = 30; // More sensitive threshold (was 50)
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

    // Reset values with animation
    setIsDragging(false);
    setDragOffset(0);
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  // Render slide content based on current index and variant
  const renderSlideContent = () => {
    // Regular carousel content
    const item = CAROUSEL_ITEMS[currentIndex];
    const isDiarioEstoico = item.id === 1;
    const is5Aneis = item.id === 2;
    const isDrJoe = item.id === 3;

    return (
      <div className="relative flex h-full flex-col justify-between p-4 sm:p-6 pb-12 sm:pb-14">
        <div className="flex-1" />
        <div className="space-y-1.5 sm:space-y-2">
          <h3 className="font-display text-2xl font-medium text-white drop-shadow-lg leading-[1.4] tracking-[-0.2px] text-center">
            {item.title}
          </h3>
          <p className="text-[12px] sm:text-[13px] leading-relaxed text-white/85 drop-shadow-md">
            {item.description}
          </p>
          {item.author && (
            <p className="text-[12px] sm:text-[13px] font-medium text-white/80 drop-shadow-md">
              {item.author}
            </p>
          )}

          {/* CTA Button for Diário Estoico */}
          {isDiarioEstoico && (
            <div className="mt-3 sm:mt-4 flex justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/app/diario-estoico');
                }}
                className="flex items-center gap-2 rounded-full bg-white px-4 sm:px-5 py-1.5 sm:py-2 text-sky-950 shadow-md transition duration-200 hover:scale-[1.02] hover:bg-sky-50 cursor-pointer active:scale-95"
              >
                <BookOpen size={14} className="sm:w-4 sm:h-4" />
                <span className="text-[12px] sm:text-[13px] font-medium">Ler a reflexão de hoje</span>
              </button>
            </div>
          )}

          {/* CTA Button for 5 Anéis */}
          {is5Aneis && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate('/app/rings');
              }}
              className="mt-2 sm:mt-3 flex w-fit items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 px-5 sm:px-6 py-2 sm:py-2.5 text-white shadow-lg transition duration-200 hover:scale-[1.02] hover:shadow-xl cursor-pointer active:scale-95"
            >
              <span className="text-[13px] sm:text-sm font-semibold">Começar Jornada</span>
              <span className="text-sm">→</span>
            </button>
          )}

          {/* CTA Button for Dr. Joe */}
          {isDrJoe && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate('/app/dr-joe-dispenza');
              }}
              className="mt-2 sm:mt-3 flex w-fit items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-5 sm:px-6 py-2 sm:py-2.5 text-white shadow-lg transition duration-200 hover:scale-[1.02] hover:shadow-xl cursor-pointer active:scale-95"
            >
              <span className="text-[13px] sm:text-sm font-semibold">Explorar Meditações</span>
              <span className="text-sm">✨</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`group relative h-[260px] overflow-hidden select-none ${
        variant === 'mobile'
          ? 'rounded-none border-0'
          : 'rounded-2xl border border-[var(--eco-line)] shadow-[0_4px_30px_rgba(0,0,0,0.04)]'
      }`}
      style={{ touchAction: 'pan-y' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background - video or animated image with drag effect */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translateX(${dragOffset}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {CAROUSEL_ITEMS[currentIndex].video ? (
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          >
            <source src={CAROUSEL_ITEMS[currentIndex].video} type="video/mp4" />
          </video>
        ) : (
          <div
            className="absolute inset-0 animate-ken-burns bg-cover bg-center"
            style={{
              backgroundImage: CAROUSEL_ITEMS[currentIndex].background,
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
      </div>

      {/* Content with drag effect */}
      <div
        className="relative z-10 flex h-full flex-col"
        style={{
          transform: `translateX(${dragOffset}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {renderSlideContent()}
      </div>

      {/* Pagination Dots - Apple-style minimal design */}
      <div className="absolute bottom-3 sm:bottom-4 left-0 right-0 z-20 flex items-center justify-center gap-1.5">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex(index);
            }}
            className="touch-manipulation p-2"
            aria-label={`Ir para slide ${index + 1}`}
          >
            <div
              className={`rounded-full transition-all duration-300 ${
                currentIndex === index
                  ? 'h-1.5 w-1.5 bg-white opacity-100'
                  : 'h-1.5 w-1.5 bg-white opacity-30'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, MoreHorizontal, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

// Função para escolher o vídeo do dia (alterna diariamente entre 3 vídeos)
const getDailyReflectionVideo = (): string => {
  const today = new Date().getDate(); // Dia do mês (1-31)
  const videos = [
    '/videos/diario-estoico.mp4',       // Vídeo 1 (original)
    '/videos/diario-reflexao-3.mp4',    // Vídeo 3 (novo) - aparece hoje dia 13
    '/videos/diario-reflexao-2.mp4',    // Vídeo 2
  ];
  return videos[today % 3];
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
      'Construa clareza, foco e propósito com um ritual diário inspirado em Miyamoto Musashi.',
    background:
      'url("/images/5-aneis-hero.webp")',
  },
  {
    id: 3,
    title: 'Desperte Seu Potencial Infinito',
    description:
      'Recondicione sua mente e manifeste a realidade que deseja viver.',
    background:
      'url("/images/dr-joe-hero.webp")',
  },
];

export default function HeroCarousel({
  variant = 'desktop',
  userName,
  onStartChat
}: HeroCarouselProps = {}) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [progress, setProgress] = useState(0);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const SLIDE_DURATION = 5000; // 5 segundos por slide
  const PROGRESS_INTERVAL = 50; // Atualizar barra a cada 50ms

  // Animation variants for smooth transitions
  const slideVariants = {
    enter: (direction: 'left' | 'right') => ({
      x: direction === 'right' ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: 'left' | 'right') => ({
      x: direction === 'right' ? '-100%' : '100%',
      opacity: 0,
    }),
  };

  const fadeVariants = {
    enter: {
      opacity: 0,
    },
    center: {
      opacity: 1,
    },
    exit: {
      opacity: 0,
    },
  };

  // Compute slides array based on variant
  const slides = CAROUSEL_ITEMS;
  const totalSlides = slides.length;

  const goToPrevious = () => {
    setDirection('left');
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? totalSlides - 1 : prevIndex - 1
    );
    setProgress(0);
    resetTimer();
  };

  const goToNext = () => {
    setDirection('right');
    setCurrentIndex((prevIndex) =>
      prevIndex === totalSlides - 1 ? 0 : prevIndex + 1
    );
    setProgress(0);
    resetTimer();
  };

  const goToSlide = (index: number) => {
    setDirection(index > currentIndex ? 'right' : 'left');
    setCurrentIndex(index);
    setProgress(0);
    resetTimer();
  };

  const resetTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    startTimer();
  };

  const startTimer = () => {
    intervalRef.current = setInterval(() => {
      goToNext();
    }, SLIDE_DURATION);

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const increment = (PROGRESS_INTERVAL / SLIDE_DURATION) * 100;
        if (prev + increment >= 100) return 100;
        return prev + increment;
      });
    }, PROGRESS_INTERVAL);
  };

  useEffect(() => {
    startTimer();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    setProgress(0);
  }, [currentIndex]);

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
          <p className="text-[12px] sm:text-[13px] leading-relaxed text-white/85 drop-shadow-md text-center">
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
            <div className="mt-3 sm:mt-4 flex justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/app/rings');
                }}
                className="flex items-center gap-2 rounded-full bg-white px-4 sm:px-5 py-1.5 sm:py-2 text-purple-900 shadow-md transition duration-200 hover:scale-[1.02] hover:bg-gray-50 cursor-pointer active:scale-95"
              >
                <span className="text-[12px] sm:text-[13px] font-medium">Começar Jornada</span>
              </button>
            </div>
          )}

          {/* CTA Button for Dr. Joe */}
          {isDrJoe && (
            <div className="mt-3 sm:mt-4 flex justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/app/dr-joe-dispenza');
                }}
                className="flex items-center gap-2 rounded-full bg-white px-4 sm:px-5 py-1.5 sm:py-2 text-purple-900 shadow-md transition duration-200 hover:scale-[1.02] hover:bg-gray-50 cursor-pointer active:scale-95"
              >
                <span className="text-[12px] sm:text-[13px] font-medium">Explorar Meditações</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`group relative h-[280px] sm:h-[320px] overflow-hidden select-none ${
        variant === 'mobile'
          ? 'rounded-none border-0'
          : 'rounded-2xl border border-[var(--eco-line)] shadow-[0_4px_30px_rgba(0,0,0,0.04)]'
      }`}
      style={{ touchAction: 'pan-y' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background - video or animated image with smooth transitions */}
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={`bg-${currentIndex}`}
          custom={direction}
          variants={fadeVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            opacity: { duration: 0.5, ease: 'easeInOut' },
          }}
          className="absolute inset-0"
          style={{
            transform: isDragging ? `translateX(${dragOffset}px)` : undefined,
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
        </motion.div>
      </AnimatePresence>

      {/* Content with smooth slide transitions */}
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={`content-${currentIndex}`}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: 'spring', stiffness: 300, damping: 30 },
            opacity: { duration: 0.3 },
          }}
          className="relative z-10 flex h-full flex-col"
          style={{
            transform: isDragging ? `translateX(${dragOffset}px)` : undefined,
          }}
        >
          {renderSlideContent()}
        </motion.div>
      </AnimatePresence>

      {/* Barra de Progresso Ultra Minimalista */}
      <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 w-24 sm:w-32">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              goToSlide(index);
            }}
            className="flex-1 h-[2px] bg-white/20 rounded-full overflow-hidden transition-all duration-200 hover:bg-white/30 touch-manipulation"
            aria-label={`Ir para slide ${index + 1}`}
          >
            <div
              className="h-full bg-white rounded-full transition-all duration-100 ease-linear"
              style={{
                width: index === currentIndex ? `${progress}%` : index < currentIndex ? '100%' : '0%',
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

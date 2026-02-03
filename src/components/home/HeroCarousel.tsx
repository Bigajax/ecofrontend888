import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, MoreHorizontal, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EcoBubbleOneEye from '@/components/EcoBubbleOneEye';
import { getTodayMaxim } from '@/utils/diarioEstoico/getTodayMaxim';
import { trackDiarioEnteredFromCarousel } from '@/lib/mixpanelDiarioEvents';
import { useAuth } from '@/contexts/AuthContext';

interface CarouselItem {
  id: number;
  title: string;
  description: string;
  background: string;
  author?: string;
  video?: string;
  badge?: string; // Badge superior (ex: "HOJE • 02 FEV")
  mainTitle?: string; // Título principal destacado
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

// Função para obter o conteúdo dinâmico da reflexão diária
const getDailyReflectionContent = (): {
  title: string;
  description: string;
  badge?: string;
  mainTitle?: string;
} => {
  const todayMaxim = getTodayMaxim();

  if (todayMaxim) {
    const now = new Date();
    const monthNames = [
      'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
      'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'
    ];
    const day = now.getDate().toString().padStart(2, '0');
    const month = monthNames[now.getMonth()];

    return {
      badge: `HOJE • ${day} ${month}`,
      mainTitle: todayMaxim.title.toUpperCase(),
      title: 'Reflexão Diária Estoica',
      description: 'Comece seu dia com sabedoria e clareza'
    };
  }

  // Fallback quando não há reflexão disponível
  return {
    title: 'Um minuto para organizar seus pensamentos',
    description: 'Uma reflexão estoica para começar o dia com clareza.'
  };
};

// Obter conteúdo dinâmico da reflexão
const dailyContent = getDailyReflectionContent();

const CAROUSEL_ITEMS: CarouselItem[] = [
  {
    id: 1,
    title: dailyContent.title,
    description: dailyContent.description,
    badge: dailyContent.badge,
    mainTitle: dailyContent.mainTitle,
    background:
      'url("/images/diario-estoico.webp")',
    video: getDailyReflectionVideo(),
  },
  {
    id: 2,
    badge: 'JORNADA SAMURAI',
    mainTitle: 'DOMINE OS 5 ANÉIS DA DISCIPLINA',
    title: 'Ritual Diário de Miyamoto Musashi',
    description: 'Construa clareza, foco e propósito através da sabedoria do maior samurai',
    background:
      'url("/images/5-aneis-hero.webp")',
  },
  {
    id: 3,
    badge: 'TRANSFORMAÇÃO QUÂNTICA',
    mainTitle: 'DESPERTE SEU POTENCIAL INFINITO',
    title: 'Meditações Guiadas Dr. Joe Dispenza',
    description: 'Recondicione sua mente e manifeste a realidade que você deseja viver',
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
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [progress, setProgress] = useState(0);
  const [videoError, setVideoError] = useState(false);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const SLIDE_DURATION = 5000; // 5 segundos por slide
  const PROGRESS_INTERVAL = 50; // Atualizar barra a cada 50ms

  // Animation variants for smooth crossfade transitions
  const slideVariants = {
    enter: {
      opacity: 0,
      scale: 1.05,
    },
    center: {
      opacity: 1,
      scale: 1,
    },
    exit: {
      opacity: 0,
      scale: 0.95,
    },
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
    setVideoError(false);
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
    setVideoError(false);
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
        {/* Badge superior para cards especiais */}
        {(isDiarioEstoico || is5Aneis || isDrJoe) && item.badge && (
          <div className="flex justify-center pt-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 border border-white/30">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-[11px] sm:text-[12px] font-bold text-white tracking-wider">
                {item.badge}
              </span>
            </div>
          </div>
        )}

        <div className="flex-1" />

        <div className="space-y-2 sm:space-y-3">
          {/* Título principal grande para cards especiais */}
          {(isDiarioEstoico || is5Aneis || isDrJoe) && item.mainTitle ? (
            <>
              <h2 className="font-display text-[22px] sm:text-[26px] md:text-[28px] font-bold text-white drop-shadow-2xl leading-tight text-center px-2 tracking-tight">
                {item.mainTitle}
              </h2>
              <p className="text-[11px] sm:text-[12px] leading-relaxed text-white/90 drop-shadow-lg text-center font-medium">
                {item.description}
              </p>
            </>
          ) : (
            <>
              <h3 className="font-display text-2xl font-medium text-white drop-shadow-lg leading-[1.4] tracking-[-0.2px] text-center px-2">
                {item.title}
              </h3>
              <p className="text-[12px] sm:text-[13px] leading-relaxed text-white/85 drop-shadow-md text-center">
                {item.description}
              </p>
            </>
          )}

          {item.author && (
            <p className="text-[12px] sm:text-[13px] font-medium text-white/80 drop-shadow-md">
              {item.author}
            </p>
          )}

          {/* CTA Button for Diário Estoico - Melhorado */}
          {isDiarioEstoico && (
            <div className="mt-4 sm:mt-5 flex justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();

                  const todayMaxim = getTodayMaxim();
                  const currentVideo = CAROUSEL_ITEMS[currentIndex]?.video || 'unknown';

                  trackDiarioEnteredFromCarousel({
                    carousel_video: currentVideo,
                    today_title: todayMaxim?.title || 'N/A',
                    is_guest: !user,
                    user_id: user?.id,
                  });

                  sessionStorage.setItem('diario_entry_source', 'hero_carousel');
                  navigate('/app/diario-estoico');
                }}
                className="group relative flex items-center gap-2 rounded-full bg-white px-5 sm:px-6 py-2.5 sm:py-3 text-sky-950 shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer active:scale-100 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-sky-50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <BookOpen className="w-4 h-4 relative z-10" />
                <span className="text-[13px] sm:text-[14px] font-bold relative z-10">
                  Ler Reflexão de Hoje
                </span>
              </button>
            </div>
          )}

          {/* CTA Button for 5 Anéis - Melhorado */}
          {is5Aneis && (
            <div className="mt-4 sm:mt-5 flex justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/app/rings');
                }}
                className="group relative flex items-center gap-2 rounded-full bg-white px-5 sm:px-6 py-2.5 sm:py-3 text-purple-900 shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer active:scale-100 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <svg className="w-4 h-4 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-[13px] sm:text-[14px] font-bold relative z-10">
                  Começar Jornada Agora
                </span>
              </button>
            </div>
          )}

          {/* CTA Button for Dr. Joe - Melhorado */}
          {isDrJoe && (
            <div className="mt-4 sm:mt-5 flex justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/app/dr-joe-dispenza');
                }}
                className="group relative flex items-center gap-2 rounded-full bg-white px-5 sm:px-6 py-2.5 sm:py-3 text-purple-900 shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer active:scale-100 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-50 via-pink-50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <svg className="w-4 h-4 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <span className="text-[13px] sm:text-[14px] font-bold relative z-10">
                  Começar Transformação
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`group relative h-[340px] sm:h-[380px] overflow-hidden select-none ${
        variant === 'mobile'
          ? 'rounded-none border-0'
          : 'rounded-2xl border border-[var(--eco-line)] shadow-[0_4px_30px_rgba(0,0,0,0.04)]'
      }`}
      style={{ touchAction: 'pan-y' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background - video or animated image with smooth crossfade */}
      <AnimatePresence initial={false}>
        <motion.div
          key={`bg-${currentIndex}`}
          variants={fadeVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            opacity: { duration: 0.6, ease: 'easeInOut' },
          }}
          className="absolute inset-0"
          style={{
            transform: isDragging ? `translateX(${dragOffset}px)` : undefined,
          }}
        >
          {CAROUSEL_ITEMS[currentIndex].video && !videoError ? (
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 h-full w-full object-cover"
              onError={() => {
                console.error('Video failed to load, falling back to image');
                setVideoError(true);
              }}
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

      {/* Content with smooth crossfade */}
      <AnimatePresence initial={false}>
        <motion.div
          key={`content-${currentIndex}`}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            opacity: { duration: 0.5, ease: 'easeInOut' },
            scale: { duration: 0.5, ease: 'easeOut' },
          }}
          className="absolute inset-0 z-10 flex h-full flex-col"
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

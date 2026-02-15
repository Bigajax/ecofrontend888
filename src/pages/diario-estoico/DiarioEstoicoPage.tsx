import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, MoreHorizontal, BookOpen, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSwipeable } from 'react-swipeable';
import toast, { Toaster } from 'react-hot-toast';
import AnimatedSection from '@/components/AnimatedSection';
import HomeHeader from '@/components/home/HomeHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useIsPremium } from '@/hooks/usePremiumContent';
import DiarioExitModal from '@/components/DiarioExitModal';
import DiarioNavigation from '@/components/diario-estoico/DiarioNavigation';
import DiarioProgress from '@/components/diario-estoico/DiarioProgress';
import ReadingModeModal from '@/components/diario-estoico/ReadingModeModal';
import ShareReflectionModal from '@/components/diario-estoico/ShareReflectionModal';
import mixpanel from '@/lib/mixpanel';
import {
  trackDiarioPageViewed,
  trackDiarioPageExited,
  trackDiarioCardViewed,
  trackDiarioCardExpanded,
  trackDiarioCardCollapsed,
  getDeviceType,
  getCardPosition,
} from '@/lib/mixpanelDiarioEvents';
import { useGuestExperience } from '@/contexts/GuestExperienceContext';
import { useGuestConversionTriggers, ConversionSignals } from '@/hooks/useGuestConversionTriggers';
import {
  DailyMaxim,
  ALL_DAILY_MAXIMS,
} from '@/utils/diarioEstoico/getTodayMaxim';

// Todas as reflexões agora são importadas de getTodayMaxim.ts (SINGLE SOURCE OF TRUTH)
// Removido: interface DailyMaxim, BACKGROUNDS, getBackgroundForDay, JANUARY_REFLECTIONS,
// FEBRUARY_REFLECTIONS, DECEMBER_REFLECTIONS, ALL_DAILY_MAXIMS (~470 linhas)

// Chave para sessionStorage - modal aparece apenas uma vez por sessão
const EXIT_MODAL_SHOWN_KEY = 'eco.diario.exitModalShown';


/**
 * Função para obter reflexões disponíveis
 * - Premium: Arquivo completo (todas as 77 reflexões)
 * - Free: Últimos 7 dias
 */
const getAvailableMaxims = (isPremium: boolean): DailyMaxim[] => {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0 = Jan, 11 = Dez
  const currentDay = now.getDate();

  let monthName = '';
  let startDay = 1;
  let endDay = 31;

  // Define month parameters
  if (currentMonth === 0) { // Janeiro
    monthName = 'janeiro';
    startDay = 19;
    endDay = 31;
  } else if (currentMonth === 1) { // Fevereiro
    monthName = 'fevereiro';
    startDay = 1;
    endDay = 28;
  } else if (currentMonth === 11) { // Dezembro
    monthName = 'dezembro';
    startDay = 8;
    endDay = 27;
  } else {
    // Outside active months: return empty array (trigger fallback)
    return [];
  }

  if (isPremium) {
    // PREMIUM: Retornar arquivo completo (todas as reflexões do mês)
    const allMonthReflections = ALL_DAILY_MAXIMS.filter(
      maxim =>
        maxim.month === monthName &&
        maxim.dayNumber >= startDay &&
        maxim.dayNumber <= endDay
    );
    return allMonthReflections.sort((a, b) => a.dayNumber - b.dayNumber);
  } else {
    // FREE: Apenas últimos 7 dias
    const sevenDaysAgo = currentDay - 6; // 7 dias incluindo hoje

    const freeReflections = ALL_DAILY_MAXIMS.filter(
      maxim =>
        maxim.month === monthName &&
        maxim.dayNumber >= Math.max(sevenDaysAgo, startDay) &&
        maxim.dayNumber <= currentDay &&
        maxim.dayNumber >= startDay &&
        maxim.dayNumber <= endDay
    );

    return freeReflections.sort((a, b) => a.dayNumber - b.dayNumber);
  }
};

export default function DiarioEstoicoPage() {
  const navigate = useNavigate();
  const { user, signOut, isGuestMode, isVipUser } = useAuth();
  const isPremium = useIsPremium();
  const { trackInteraction } = useGuestExperience();
  const { checkTrigger } = useGuestConversionTriggers();
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [showExitModal, setShowExitModal] = useState(false);

  // New states for navigation and features
  const [currentDayNumber, setCurrentDayNumber] = useState<number | null>(null);
  const [readDays, setReadDays] = useState<Set<number>>(new Set());
  const [readingModeMaxim, setReadingModeMaxim] = useState<DailyMaxim | null>(null);
  const [shareModalMaxim, setShareModalMaxim] = useState<DailyMaxim | null>(null);

  // Tracking state
  const [pageViewTime, setPageViewTime] = useState<Date | null>(null);
  const [viewedCards, setViewedCards] = useState<Set<string>>(new Set());
  const [cardExpandTimes, setCardExpandTimes] = useState<Map<number, Date>>(new Map());
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  // Refs for scroll management
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  /**
   * Helper para renderizar comentário (completo para todos os usuários)
   */
  const renderComment = (maxim: DailyMaxim, textSizeClass: string = 'text-[13px]') => {
    if (!maxim.comment) return null;

    // Mostrar comentário completo para todos (guests e authenticated)
    return (
      <>
        <hr className="border-eco-line" />
        <div>
          <h4 className="font-primary text-[12px] font-bold text-eco-text mb-2">
            Comentário
          </h4>
          <p className={`font-primary ${textSizeClass} leading-relaxed text-eco-text whitespace-pre-line`}>
            {maxim.comment}
          </p>
        </div>
      </>
    );
  };

  // Obter apenas os cards disponíveis até hoje
  const availableMaxims = getAvailableMaxims();
  const availableDayNumbers = availableMaxims.map(m => m.dayNumber);

  // Load read days from localStorage
  useEffect(() => {
    const key = `eco.diario.readDays.v1.${user?.id || 'guest'}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setReadDays(new Set(parsed));
      } catch (error) {
        console.error('Error loading read days:', error);
      }
    }
  }, [user]);

  // Save read days to localStorage whenever it changes
  useEffect(() => {
    if (readDays.size > 0) {
      const key = `eco.diario.readDays.v1.${user?.id || 'guest'}`;
      localStorage.setItem(key, JSON.stringify([...readDays]));
    }
  }, [readDays, user]);

  // Initialize current day to the last available (today)
  useEffect(() => {
    if (availableMaxims.length > 0 && currentDayNumber === null) {
      setCurrentDayNumber(availableMaxims[availableMaxims.length - 1].dayNumber);
    }
  }, [availableMaxims, currentDayNumber]);

  // Navigation handler with smooth scroll
  const handleNavigate = useCallback((dayNumber: number) => {
    setCurrentDayNumber(dayNumber);

    // Scroll to the card
    const cardElement = cardRefs.current.get(dayNumber);
    if (cardElement) {
      cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Track navigation
    mixpanel.track('Diario Estoico: Navigation Used', {
      to_day: dayNumber,
      is_guest: !user,
      user_id: user?.id,
    });
  }, [user]);

  // Swipe handlers for mobile
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (currentDayNumber === null) return;
      const currentIndex = availableDayNumbers.indexOf(currentDayNumber);
      if (currentIndex < availableDayNumbers.length - 1) {
        handleNavigate(availableDayNumbers[currentIndex + 1]);
      }
    },
    onSwipedRight: () => {
      if (currentDayNumber === null) return;
      const currentIndex = availableDayNumbers.indexOf(currentDayNumber);
      if (currentIndex > 0) {
        handleNavigate(availableDayNumbers[currentIndex - 1]);
      }
    },
    trackMouse: false, // Desabilitar mouse tracking (apenas touch)
    trackTouch: true,  // Apenas touch events em mobile
    delta: 80,         // Aumentar threshold para evitar falsos positivos
    preventScrollOnSwipe: false, // Permitir scroll vertical normal
  });

  // Mark day as read
  const markDayAsRead = useCallback((dayNumber: number) => {
    // Avoid duplicates
    if (readDays.has(dayNumber)) return;

    setReadDays((prev) => {
      const newSet = new Set(prev).add(dayNumber);

      // Show success toast
      toast.success('✅ Reflexão concluída!', {
        duration: 3000,
        position: 'bottom-center',
        style: {
          background: 'rgba(250, 249, 247, 0.95)',
          color: '#38322A',
          padding: '12px 20px',
          fontSize: '14px',
          fontWeight: '500',
          borderRadius: '12px',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(232, 227, 221, 0.8)',
        },
      });

      // Track milestone if needed
      const newSize = newSet.size;
      const total = availableMaxims.length;
      const percentage = (newSize / total) * 100;

      if ([25, 50, 75, 100].some(m => Math.abs(percentage - m) < 5)) {
        // Milestone achieved - show special toast
        toast.success(`🎉 ${Math.round(percentage)}% completo!`, {
          duration: 4000,
          position: 'bottom-center',
          style: {
            background: 'rgba(198, 169, 149, 0.95)',
            color: '#ffffff',
            padding: '16px 24px',
            fontSize: '16px',
            fontWeight: '600',
            borderRadius: '12px',
            backdropFilter: 'blur(12px)',
          },
        });

        mixpanel.track('Diario Estoico: Progress Milestone', {
          percentage: Math.round(percentage),
          days_read: newSize,
          total_days: total,
          is_guest: !user,
          user_id: user?.id,
        });
      }

      return newSet;
    });
  }, [readDays, availableMaxims.length, user]);

  // Se o usuário está logado, pode fazer logout
  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      navigate('/');
    }
  };

  // Interceptar clique no botão Voltar
  const handleBackClick = () => {
    // Só mostra modal para guests
    if (!user) {
      // Verificar se já foi mostrado nesta sessão
      const wasShown = sessionStorage.getItem(EXIT_MODAL_SHOWN_KEY);

      if (!wasShown) {
        sessionStorage.setItem(EXIT_MODAL_SHOWN_KEY, 'true');
        setShowExitModal(true);

        mixpanel.track('Diario Estoico: Exit Modal Shown', {
          timestamp: new Date().toISOString(),
        });
        return; // Não navega ainda
      }
    }

    // Navega normalmente
    navigate(user ? '/app' : '/');
  };

  // Handlers do modal
  const handleModalSignup = () => {
    mixpanel.track('Diario Estoico: Exit Modal - Signup Clicked');
    setShowExitModal(false);
    navigate('/register', { state: { from: 'diario-estoico' } });
  };

  const handleModalStay = () => {
    mixpanel.track('Diario Estoico: Exit Modal - Stayed');
    setShowExitModal(false);
  };

  const handleModalLeave = () => {
    mixpanel.track('Diario Estoico: Exit Modal - Left Anyway');
    setShowExitModal(false);
    navigate('/');
  };

  const toggleExpanded = useCallback((dayNumber: number) => {
    const maxim = availableMaxims.find((m) => m.dayNumber === dayNumber);
    if (!maxim) return;

    const isExpanding = !expandedCards.has(dayNumber);

    if (isExpanding) {
      // Expandindo - atualizar estado imediatamente
      setExpandedCards((prev) => new Set(prev).add(dayNumber));
      setCardExpandTimes((prev) => new Map(prev).set(dayNumber, new Date()));

      // Track expansion (não bloqueante)
      setTimeout(() => {
        const timeToExpand = pageViewTime
          ? Math.floor((new Date().getTime() - pageViewTime.getTime()) / 1000)
          : 0;

        trackDiarioCardExpanded({
          reflection_date: maxim.date,
          day_number: maxim.dayNumber,
          month: maxim.month,
          author: maxim.author,
          source: maxim.source,
          has_comment: !!maxim.comment,
          card_position: getCardPosition(maxim.dayNumber, availableMaxims[0].dayNumber),
          time_to_expand_seconds: timeToExpand,
          is_guest: !user,
          user_id: user?.id,
        });
      }, 0);
    } else {
      // Colapsando - atualizar estado imediatamente
      setExpandedCards((prev) => {
        const newSet = new Set(prev);
        newSet.delete(dayNumber);
        return newSet;
      });

      // Track collapse (não bloqueante)
      const expandTime = cardExpandTimes.get(dayNumber);
      setTimeout(() => {
        const timeExpanded = expandTime
          ? Math.floor((new Date().getTime() - expandTime.getTime()) / 1000)
          : 0;

        trackDiarioCardCollapsed({
          reflection_date: maxim.date,
          author: maxim.author,
          time_expanded_seconds: timeExpanded,
          read_full_comment: timeExpanded > 10, // estimativa: 10s+ = leu
          is_guest: !user,
          user_id: user?.id,
        });
      }, 0);

      // Remover tempo de expansão
      setCardExpandTimes((prev) => {
        const newMap = new Map(prev);
        newMap.delete(dayNumber);
        return newMap;
      });
    }
  }, [availableMaxims, expandedCards, cardExpandTimes, pageViewTime, user]);

  // Track card view quando entra no viewport
  const handleCardView = useCallback((dayNumber: number) => {
    const cardKey = `${dayNumber}`;

    // Evitar duplicatas
    if (viewedCards.has(cardKey)) return;

    const maxim = availableMaxims.find((m) => m.dayNumber === dayNumber);
    if (!maxim) return;

    setViewedCards((prev) => new Set(prev).add(cardKey));

    trackDiarioCardViewed({
      reflection_date: maxim.date,
      day_number: maxim.dayNumber,
      month: maxim.month,
      author: maxim.author,
      title: maxim.title,
      is_today: maxim.dayNumber === availableMaxims[0].dayNumber,
      card_position: getCardPosition(maxim.dayNumber, availableMaxims[0].dayNumber),
      is_guest: !user,
      user_id: user?.id,
    });

    // NOVO: Track reflection view para guests (VIP users bypass)
    if (isGuestMode && !user && !isVipUser) {
      trackInteraction('page_view', {
        page: `/diario-estoico/${dayNumber}`,
        reflection_id: `${maxim.month}-${dayNumber}`,
      });

      // Trigger conversão após 3+ reflexões
      const totalViewed = viewedCards.size + 1;
      if (totalViewed >= 3) {
        checkTrigger(ConversionSignals.reflectionViewed(`${maxim.month}-${dayNumber}`));
      }
    }
  }, [availableMaxims, viewedCards, user, isGuestMode, isVipUser, trackInteraction, checkTrigger]);

  // Track page view on mount
  useEffect(() => {
    const viewTime = new Date();
    setPageViewTime(viewTime);

    // Determine source from URL or sessionStorage
    const urlParams = new URLSearchParams(window.location.search);
    const source = urlParams.get('from') ||
                   sessionStorage.getItem('diario_entry_source') ||
                   'direct';

    trackDiarioPageViewed({
      source: source as any,
      is_guest: !user,
      user_id: user?.id,
      available_reflections: availableMaxims.length,
      today_date: availableMaxims[0]?.date || 'N/A',
      today_author: availableMaxims[0]?.author || 'N/A',
      device_type: getDeviceType(),
    });

    // Clear source after use
    sessionStorage.removeItem('diario_entry_source');
  }, []); // Empty deps - só roda no mount

  // Track page exit on unmount
  useEffect(() => {
    return () => {
      if (!pageViewTime) return;

      const timeSpent = Math.floor((new Date().getTime() - pageViewTime.getTime()) / 1000);

      trackDiarioPageExited({
        time_spent_seconds: timeSpent,
        cards_expanded: expandedCards.size,
        reflections_viewed: Array.from(viewedCards),
        scrolled_to_bottom: scrolledToBottom,
        exit_method: 'navigation',
        is_guest: !user,
        user_id: user?.id,
      });
    };
  }, [pageViewTime, expandedCards, viewedCards, scrolledToBottom, user]);

  // Track scroll to bottom
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // Considera "bottom" se está a 100px do final
      if (scrollTop + windowHeight >= documentHeight - 100) {
        setScrolledToBottom(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection observer for card views
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const dayNumber = parseInt(entry.target.getAttribute('data-day-number') || '0');
            if (dayNumber) {
              handleCardView(dayNumber);
            }
          }
        });
      },
      { threshold: 0.5 } // 50% do card visível
    );

    // Observar todos os cards
    const cards = document.querySelectorAll('[data-diario-card]');
    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [handleCardView]);

  // Apply ECO background to document
  useEffect(() => {
    // Salvar estilos originais
    const originalHtmlBg = document.documentElement.style.cssText;
    const originalBodyBg = document.body.style.cssText;

    // Apply eco-bg
    document.documentElement.setAttribute('style', 'background: #FAF9F7 !important; background-color: #FAF9F7 !important;');
    document.body.setAttribute('style', 'background: #FAF9F7 !important; background-color: #FAF9F7 !important;');

    return () => {
      // Restaurar estilos originais
      document.documentElement.setAttribute('style', originalHtmlBg);
      document.body.setAttribute('style', originalBodyBg);
    };
  }, []);

  return (
    <div className="min-h-screen bg-eco-bg" {...swipeHandlers}>
      <Toaster position="top-center" />

      <div className="w-full min-h-full">
        {/* Header - apenas se usuário logado */}
        {user && <HomeHeader onLogout={handleLogout} />}

        {/* Navegação */}
        <div className="w-full px-4 pt-6 md:px-8">
          <div className="mx-auto max-w-7xl flex items-center justify-between">
            {/* Botão Voltar */}
            <button
              onClick={handleBackClick}
              className="inline-flex items-center justify-center w-10 h-10 text-eco-text
                         glass-shell rounded-full hover:bg-eco-accent/10
                         transition-all duration-300 shadow-minimal hover:shadow-eco"
              aria-label="Voltar"
            >
              <ChevronLeft size={20} />
            </button>

            {/* CTA para guest */}
            {!user && (
              <button
                onClick={() => navigate('/register')}
                className="inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 text-xs sm:text-sm font-semibold
                           text-white bg-eco-baby rounded-full hover:bg-eco-baby/90
                           hover:scale-105 active:scale-95 transition-all duration-200"
              >
                Criar conta grátis
              </button>
            )}
          </div>
        </div>

        {/* Título e Subtítulo */}
        <div className="w-full px-4 pt-6 md:px-8">
          <div className="mx-auto max-w-7xl text-center">
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-eco-text mb-2">
              DIÁRIO ESTOICO
            </h1>
            <p className="font-primary text-xs sm:text-sm md:text-base lg:text-lg font-medium tracking-wider text-eco-muted">
              366 LIÇÕES SOBRE SABEDORIA, PERSEVERANÇA E A ARTE DE VIVER
            </p>

            {/* Progress Bar */}
            {availableMaxims.length > 0 && (
              <div className="mt-6 max-w-xs sm:max-w-md mx-auto px-4">
                <DiarioProgress
                  totalDays={availableMaxims.length}
                  readDays={readDays}
                />
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <main className="w-full px-4 py-4 md:px-8 md:py-8">
          {/* Grid de cards */}
          <div className="mx-auto max-w-7xl">
            {availableMaxims.length === 0 ? (
              // Fallback quando não há reflexões disponíveis
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center max-w-md px-6">
                  <p className="text-lg text-gray-600 leading-relaxed">
                    Hoje não há reflexão cadastrada. Em breve teremos mais.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Layout Desktop: Card do dia no centro grande, outros nas laterais */}
                <div className="hidden md:flex md:items-center md:justify-center md:gap-4 lg:gap-6">
                  {/* Cards anteriores (esquerda) */}
                  <div className="flex flex-col gap-4 max-w-[280px] lg:max-w-[320px]">
                    {availableMaxims.slice(0, -1).map((maxim) => {
                      const isExpanded = expandedCards.has(maxim.dayNumber);
                      return (
                        <AnimatedSection key={maxim.dayNumber} animation="slide-up-fade">
                          <div
                            ref={(el) => {
                              if (el) cardRefs.current.set(maxim.dayNumber, el);
                            }}
                            data-diario-card
                            data-day-number={maxim.dayNumber}
                            className="relative w-full rounded-2xl overflow-hidden shadow-eco
                                     transition-all duration-500 hover:shadow-eco-glow cursor-pointer"
                            style={{
                              backgroundImage: maxim.background,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }}
                            onClick={() => toggleExpanded(maxim.dayNumber)}
                          >
                            <div className="absolute inset-0 bg-black/40 pointer-events-none" />
                            <div className="relative flex flex-col min-h-[180px] justify-between p-4">
                              <div>
                                <span className="inline-flex rounded-full px-3 py-1 bg-eco-baby">
                                  <span className="text-[10px] font-medium text-white">
                                    {maxim.date}
                                  </span>
                                </span>
                              </div>
                              <div>
                                <p className="font-display font-normal leading-snug text-sm text-white drop-shadow-lg line-clamp-2">
                                  {maxim.title}
                                </p>
                              </div>
                            </div>
                            {isExpanded && (
                              <div className="relative glass-shell p-4 border-t border-eco-line/30">
                                <div className="space-y-3">
                                  <p className="font-display text-[13px] leading-relaxed text-eco-text italic">
                                    "{maxim.text}"
                                  </p>
                                  <p className="font-primary text-[11px] font-medium text-eco-muted">
                                    — {maxim.author}
                                    {maxim.source && `, ${maxim.source}`}
                                  </p>
                                  {renderComment(maxim, 'text-[13px]')}

                                  {/* Action buttons */}
                                  <div className="flex gap-2 pt-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setReadingModeMaxim(maxim);
                                        mixpanel.track('Diario Estoico: Reading Mode Opened', {
                                          day_number: maxim.dayNumber,
                                          is_guest: !user,
                                        });
                                      }}
                                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5
                                               text-[10px] font-medium text-eco-text
                                               glass-shell rounded-lg hover:bg-eco-accent/10
                                               transition-all duration-300"
                                    >
                                      <BookOpen size={12} />
                                      Modo Leitura
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShareModalMaxim(maxim);
                                        mixpanel.track('Diario Estoico: Share Opened', {
                                          day_number: maxim.dayNumber,
                                          is_guest: !user,
                                        });
                                      }}
                                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5
                                               text-[10px] font-medium text-eco-text
                                               glass-shell rounded-lg hover:bg-eco-accent/10
                                               transition-all duration-300"
                                    >
                                      <Share2 size={12} />
                                      Compartilhar
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </AnimatedSection>
                      );
                    })}
                  </div>

                  {/* Card do dia (centro - destaque) */}
                  {availableMaxims.length > 0 && (() => {
                    const todayMaxim = availableMaxims[availableMaxims.length - 1];
                    const isExpanded = expandedCards.has(todayMaxim.dayNumber);
                    // VIP users bypass all guest gates
                    const isGuest = isGuestMode && !user && !isVipUser;
                    return (
                      <AnimatedSection key={todayMaxim.dayNumber} animation="scale-up">
                        <div
                          ref={(el) => {
                            if (el) cardRefs.current.set(todayMaxim.dayNumber, el);
                          }}
                          data-diario-card
                          data-day-number={todayMaxim.dayNumber}
                          className="relative w-full max-w-[500px] lg:max-w-[600px] rounded-3xl
                                   overflow-hidden shadow-eco-glow transition-all duration-500"
                          style={{
                            backgroundImage: todayMaxim.background,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }}
                        >
                          <div className="absolute inset-0 bg-black/35 pointer-events-none" />
                          <div className="relative flex flex-col min-h-[500px] justify-between p-8 lg:p-10">
                            <div>
                              <span className="inline-flex rounded-full px-5 py-2.5 bg-eco-baby">
                                <span className="text-[13px] font-semibold text-white tracking-wide">
                                  HOJE • {todayMaxim.date}
                                </span>
                              </span>
                            </div>
                            <div className="space-y-6">
                              <p className="font-display font-normal leading-relaxed text-3xl lg:text-4xl
                                          text-white drop-shadow-2xl">
                                {todayMaxim.title}
                              </p>
                              <button
                                onClick={() => toggleExpanded(todayMaxim.dayNumber)}
                                className="inline-flex items-center gap-2 text-[14px] font-medium
                                         transition-all rounded-full px-6 py-3 text-white
                                         bg-gray-600/60 hover:bg-gray-600/80 backdrop-blur-sm"
                              >
                                <MoreHorizontal size={18} />
                                {isExpanded ? 'Fechar' : 'Leia mais'}
                              </button>
                            </div>
                            <div />
                          </div>
                          {isExpanded && (
                            <div className="relative glass-shell p-8 lg:p-10 border-t border-eco-line/30">
                              <div className="space-y-5">
                                <p className="font-display text-[16px] lg:text-[17px] leading-relaxed
                                            text-eco-text italic">
                                  "{todayMaxim.text}"
                                </p>
                                <p className="font-primary text-[14px] font-medium text-eco-muted">
                                  — {todayMaxim.author}
                                  {todayMaxim.source && `, ${todayMaxim.source}`}
                                </p>
                                {renderComment(todayMaxim, 'text-[14px] lg:text-[15px]')}

                                {/* Action buttons - apenas para authenticated */}
                                {!isGuest && (
                                <div className="space-y-3">
                                  {/* Mark as read button - only show if not read yet */}
                                  {!readDays.has(todayMaxim.dayNumber) && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markDayAsRead(todayMaxim.dayNumber);
                                        mixpanel.track('Diario Estoico: Marked As Read', {
                                          day_number: todayMaxim.dayNumber,
                                          is_guest: !user,
                                          method: 'button',
                                        });
                                      }}
                                      className="w-full flex items-center justify-center gap-2 px-4 py-3
                                               text-sm font-semibold text-white
                                               bg-eco-baby hover:bg-eco-baby/90
                                               rounded-xl hover:scale-105 active:scale-95
                                               transition-all duration-200"
                                    >
                                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M13.5 4L6 11.5L2.5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                      Marcar como lida
                                    </button>
                                  )}

                                  {/* Already read indicator */}
                                  {readDays.has(todayMaxim.dayNumber) && (
                                    <div className="w-full flex items-center justify-center gap-2 px-4 py-3
                                                  text-sm font-medium text-eco-accent
                                                  glass-shell rounded-xl">
                                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M13.5 4L6 11.5L2.5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                      Reflexão concluída
                                    </div>
                                  )}

                                  {/* Other actions */}
                                  <div className="flex gap-3">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setReadingModeMaxim(todayMaxim);
                                        mixpanel.track('Diario Estoico: Reading Mode Opened', {
                                          day_number: todayMaxim.dayNumber,
                                          is_guest: !user,
                                        });
                                      }}
                                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2
                                               text-sm font-medium text-eco-text
                                               glass-shell rounded-xl hover:bg-eco-accent/10
                                               transition-all duration-300"
                                    >
                                      <BookOpen size={16} />
                                      Modo Leitura
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShareModalMaxim(todayMaxim);
                                        mixpanel.track('Diario Estoico: Share Opened', {
                                          day_number: todayMaxim.dayNumber,
                                          is_guest: !user,
                                        });
                                      }}
                                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2
                                               text-sm font-medium text-eco-text
                                               glass-shell rounded-xl hover:bg-eco-accent/10
                                               transition-all duration-300"
                                    >
                                      <Share2 size={16} />
                                      Compartilhar
                                    </button>
                                  </div>
                                </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </AnimatedSection>
                    );
                  })()}
                </div>

                {/* Layout Mobile: Card do dia em cima grande, outros embaixo */}
                <div className="flex flex-col gap-6 md:hidden">
                  {/* Card do dia (mobile) */}
                  {availableMaxims.length > 0 && (() => {
                    const todayMaxim = availableMaxims[availableMaxims.length - 1];
                    const isExpanded = expandedCards.has(todayMaxim.dayNumber);
                    // VIP users bypass all guest gates
                    const isGuest = isGuestMode && !user && !isVipUser;
                    return (
                      <AnimatedSection key={todayMaxim.dayNumber} animation="scale-up">
                        <div
                          ref={(el) => {
                            if (el) cardRefs.current.set(todayMaxim.dayNumber, el);
                          }}
                          data-diario-card
                          data-day-number={todayMaxim.dayNumber}
                          className="relative w-full rounded-3xl overflow-hidden shadow-eco-glow
                                   transition-all duration-500"
                          style={{
                            backgroundImage: todayMaxim.background,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }}
                        >
                          <div className="absolute inset-0 bg-black/35 pointer-events-none" />
                          <div className="relative flex flex-col min-h-[350px] sm:min-h-[450px] justify-between p-6">
                            <div>
                              <span className="inline-flex rounded-full px-4 py-2 bg-eco-baby">
                                <span className="text-[12px] font-semibold text-white tracking-wide">
                                  HOJE • {todayMaxim.date}
                                </span>
                              </span>
                            </div>
                            <div className="space-y-4">
                              <p className="font-display font-normal leading-relaxed text-2xl text-white drop-shadow-2xl">
                                {todayMaxim.title}
                              </p>
                              <button
                                onClick={() => toggleExpanded(todayMaxim.dayNumber)}
                                className="inline-flex items-center gap-2 text-[13px] font-medium
                                         transition-all rounded-full px-5 py-2.5 text-white
                                         bg-gray-600/60 hover:bg-gray-600/80 backdrop-blur-sm"
                              >
                                <MoreHorizontal size={16} />
                                {isExpanded ? 'Fechar' : 'Leia mais'}
                              </button>
                            </div>
                            <div />
                          </div>
                          {isExpanded && (
                            <div className="relative glass-shell p-6 border-t border-eco-line/30">
                              <div className="space-y-4">
                                <p className="font-display text-[15px] leading-relaxed text-eco-text italic">
                                  "{todayMaxim.text}"
                                </p>
                                <p className="font-primary text-[13px] font-medium text-eco-muted">
                                  — {todayMaxim.author}
                                  {todayMaxim.source && `, ${todayMaxim.source}`}
                                </p>
                                {renderComment(todayMaxim, 'text-[14px]')}

                                {/* Action buttons - apenas para authenticated */}
                                {!isGuest && (
                                <div className="space-y-2">
                                  {/* Mark as read button - only show if not read yet */}
                                  {!readDays.has(todayMaxim.dayNumber) && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markDayAsRead(todayMaxim.dayNumber);
                                        mixpanel.track('Diario Estoico: Marked As Read', {
                                          day_number: todayMaxim.dayNumber,
                                          is_guest: !user,
                                          method: 'button',
                                        });
                                      }}
                                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5
                                               text-sm font-semibold text-white
                                               bg-eco-baby hover:bg-eco-baby/90
                                               rounded-lg active:scale-95
                                               transition-all duration-200"
                                    >
                                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M13.5 4L6 11.5L2.5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                      Marcar como lida
                                    </button>
                                  )}

                                  {/* Already read indicator */}
                                  {readDays.has(todayMaxim.dayNumber) && (
                                    <div className="w-full flex items-center justify-center gap-2 px-4 py-2.5
                                                  text-sm font-medium text-eco-accent
                                                  glass-shell rounded-lg">
                                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M13.5 4L6 11.5L2.5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                      Reflexão concluída
                                    </div>
                                  )}

                                  {/* Other actions */}
                                  <div className="flex gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setReadingModeMaxim(todayMaxim);
                                        mixpanel.track('Diario Estoico: Reading Mode Opened', {
                                          day_number: todayMaxim.dayNumber,
                                          is_guest: !user,
                                        });
                                      }}
                                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2
                                               text-xs font-medium text-eco-text
                                               glass-shell rounded-lg hover:bg-eco-accent/10
                                               transition-all duration-300"
                                    >
                                      <BookOpen size={14} />
                                      Modo Leitura
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShareModalMaxim(todayMaxim);
                                        mixpanel.track('Diario Estoico: Share Opened', {
                                          day_number: todayMaxim.dayNumber,
                                          is_guest: !user,
                                        });
                                      }}
                                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2
                                               text-xs font-medium text-eco-text
                                               glass-shell rounded-lg hover:bg-eco-accent/10
                                               transition-all duration-300"
                                    >
                                      <Share2 size={14} />
                                      Compartilhar
                                    </button>
                                  </div>
                                </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </AnimatedSection>
                    );
                  })()}

                  {/* Cards anteriores (mobile) */}
                  <div className="grid grid-cols-1 gap-4">
                    {availableMaxims.slice(0, -1).map((maxim) => {
                      const isExpanded = expandedCards.has(maxim.dayNumber);
                      return (
                        <AnimatedSection key={maxim.dayNumber} animation="slide-up-fade">
                          <div
                            ref={(el) => {
                              if (el) cardRefs.current.set(maxim.dayNumber, el);
                            }}
                            data-diario-card
                            data-day-number={maxim.dayNumber}
                            className="relative w-full rounded-2xl overflow-hidden shadow-eco
                                     transition-all duration-500 hover:shadow-eco-glow cursor-pointer"
                            style={{
                              backgroundImage: maxim.background,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }}
                            onClick={() => toggleExpanded(maxim.dayNumber)}
                          >
                            <div className="absolute inset-0 bg-black/40 pointer-events-none" />
                            <div className="relative flex flex-col min-h-[200px] justify-between p-5">
                              <div>
                                <span className="inline-flex rounded-full px-3 py-1.5 bg-eco-baby">
                                  <span className="text-[11px] font-medium text-white">
                                    {maxim.date}
                                  </span>
                                </span>
                              </div>
                              <div>
                                <p className="font-display font-normal leading-snug text-base text-white drop-shadow-lg">
                                  {maxim.title}
                                </p>
                              </div>
                            </div>
                            {isExpanded && (
                              <div className="relative glass-shell p-5 border-t border-eco-line/30">
                                <div className="space-y-3">
                                  <p className="font-display text-[14px] leading-relaxed text-eco-text italic">
                                    "{maxim.text}"
                                  </p>
                                  <p className="font-primary text-[12px] font-medium text-eco-muted">
                                    — {maxim.author}
                                    {maxim.source && `, ${maxim.source}`}
                                  </p>
                                  {renderComment(maxim, 'text-[13px]')}

                                  {/* Action buttons */}
                                  <div className="flex gap-2 pt-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setReadingModeMaxim(maxim);
                                        mixpanel.track('Diario Estoico: Reading Mode Opened', {
                                          day_number: maxim.dayNumber,
                                          is_guest: !user,
                                        });
                                      }}
                                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5
                                               text-xs font-medium text-eco-text
                                               glass-shell rounded-lg hover:bg-eco-accent/10
                                               transition-all duration-300"
                                    >
                                      <BookOpen size={12} />
                                      Modo Leitura
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShareModalMaxim(maxim);
                                        mixpanel.track('Diario Estoico: Share Opened', {
                                          day_number: maxim.dayNumber,
                                          is_guest: !user,
                                        });
                                      }}
                                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5
                                               text-xs font-medium text-eco-text
                                               glass-shell rounded-lg hover:bg-eco-accent/10
                                               transition-all duration-300"
                                    >
                                      <Share2 size={12} />
                                      Compartilhar
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </AnimatedSection>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </main>

        {/* Navigation Component */}
        {currentDayNumber !== null && availableMaxims.length > 1 && (
          <DiarioNavigation
            currentDayNumber={currentDayNumber}
            availableDays={availableDayNumbers}
            onNavigate={handleNavigate}
          />
        )}

        {/* Reading Mode Modal */}
        <ReadingModeModal
          maxim={readingModeMaxim}
          open={!!readingModeMaxim}
          onClose={() => setReadingModeMaxim(null)}
        />

        {/* Share Reflection Modal */}
        <ShareReflectionModal
          maxim={shareModalMaxim}
          open={!!shareModalMaxim}
          onClose={() => setShareModalMaxim(null)}
        />

        {/* Exit Modal */}
        <DiarioExitModal
          open={showExitModal}
          onClose={handleModalStay}
          onSignup={handleModalSignup}
          onLeaveAnyway={handleModalLeave}
        />
      </div>
    </div>
  );
}

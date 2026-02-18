import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, MoreHorizontal, BookOpen, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSwipeable } from 'react-swipeable';
import toast, { Toaster } from 'react-hot-toast';
import AnimatedSection from '@/components/AnimatedSection';
import HomeHeader from '@/components/home/HomeHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useIsPremium, useSubscriptionTier } from '@/hooks/usePremiumContent';
import DiarioExitModal from '@/components/DiarioExitModal';
import DiarioNavigation from '@/components/diario-estoico/DiarioNavigation';
import DiarioProgress from '@/components/diario-estoico/DiarioProgress';
import ReadingModeModal from '@/components/diario-estoico/ReadingModeModal';
import ShareReflectionModal from '@/components/diario-estoico/ShareReflectionModal';
import UpgradeModal from '@/components/subscription/UpgradeModal';
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
 * Metadados dos meses temáticos
 */
interface MonthMetadata {
  id: string;
  monthName: string; // 'janeiro', 'fevereiro', 'dezembro'
  displayName: string; // 'JANEIRO', 'FEVEREIRO', 'DEZEMBRO'
  theme: string;
  themeDescription: string;
  reflectionsCount: number;
  startDay: number;
  endDay: number;
  iconEmoji: string;
  isFreeAccess: boolean; // Se é o mês gratuito
}

const MONTH_THEMES: MonthMetadata[] = [
  {
    id: 'janeiro',
    monthName: 'janeiro',
    displayName: 'JANEIRO',
    theme: 'CLAREZA',
    themeDescription: 'Reflexões sobre clareza mental, foco e discernimento',
    reflectionsCount: 13,
    startDay: 19,
    endDay: 31,
    iconEmoji: '🔍',
    isFreeAccess: true, // Mês gratuito
  },
  {
    id: 'fevereiro',
    monthName: 'fevereiro',
    displayName: 'FEVEREIRO',
    theme: 'PAIXÕES E EMOÇÕES',
    themeDescription: 'Domine suas paixões, entenda suas emoções',
    reflectionsCount: 28,
    startDay: 1,
    endDay: 28,
    iconEmoji: '🔥',
    isFreeAccess: false,
  },
  {
    id: 'dezembro',
    monthName: 'dezembro',
    displayName: 'DEZEMBRO',
    theme: 'MEDITAÇÃO SOBRE MORTALIDADE',
    themeDescription: 'Memento Mori: reflexões sobre finitude e propósito',
    reflectionsCount: 20,
    startDay: 8,
    endDay: 27,
    iconEmoji: '💀',
    isFreeAccess: false,
  },
];

/**
 * Função para obter reflexões disponíveis por tier
 * - Premium/VIP: Arquivo completo (todos os meses)
 * - Essentials: Todos os meses
 * - Free: Apenas JANEIRO (CLAREZA)
 */
const getAvailableMaxims = (tier: 'free' | 'essentials' | 'premium' | 'vip'): DailyMaxim[] => {
  if (tier === 'premium' || tier === 'vip' || tier === 'essentials') {
    // PREMIUM/VIP/ESSENTIALS: Acesso a TODOS os meses
    const allReflections: DailyMaxim[] = [];

    MONTH_THEMES.forEach(month => {
      const monthReflections = ALL_DAILY_MAXIMS.filter(
        maxim =>
          maxim.month === month.monthName &&
          maxim.dayNumber >= month.startDay &&
          maxim.dayNumber <= month.endDay
      );
      allReflections.push(...monthReflections);
    });

    return allReflections.sort((a, b) => {
      // Ordenar por mês (janeiro, fevereiro, dezembro) e depois por dia
      const monthOrder = { janeiro: 0, fevereiro: 1, dezembro: 2 };
      const monthDiff = (monthOrder[a.month as keyof typeof monthOrder] || 999) -
                        (monthOrder[b.month as keyof typeof monthOrder] || 999);

      if (monthDiff !== 0) return monthDiff;
      return a.dayNumber - b.dayNumber;
    });
  } else {
    // FREE: Apenas JANEIRO (CLAREZA) completo
    const freeMonth = MONTH_THEMES.find(m => m.isFreeAccess);

    if (!freeMonth) return [];

    const freeReflections = ALL_DAILY_MAXIMS.filter(
      maxim =>
        maxim.month === freeMonth.monthName &&
        maxim.dayNumber >= freeMonth.startDay &&
        maxim.dayNumber <= freeMonth.endDay
    );

    return freeReflections.sort((a, b) => a.dayNumber - b.dayNumber);
  }
};

/**
 * Obter meses bloqueados para o usuário free
 */
const getLockedMonths = (tier: 'free' | 'essentials' | 'premium' | 'vip'): MonthMetadata[] => {
  if (tier === 'premium' || tier === 'vip' || tier === 'essentials') {
    return []; // Não tem meses bloqueados
  }

  return MONTH_THEMES.filter(m => !m.isFreeAccess);
};

/**
 * Obter mês acessível para free user
 */
const getFreeMonth = (): MonthMetadata | undefined => {
  return MONTH_THEMES.find(m => m.isFreeAccess);
};

export default function DiarioEstoicoPage() {
  const navigate = useNavigate();
  const { user, signOut, isGuestMode, isVipUser } = useAuth();
  const isPremium = useIsPremium();
  const tier = useSubscriptionTier();
  const { trackInteraction } = useGuestExperience();
  const { checkTrigger } = useGuestConversionTriggers();
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [showExitModal, setShowExitModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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
  const monthSectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

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

  // Obter apenas os cards disponíveis (premium/vip = todos, essentials = últimos 30 dias, free = últimos 7 dias)
  const availableMaxims = getAvailableMaxims(tier);
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

  // Scroll to month section
  const scrollToMonth = useCallback((monthId: string) => {
    const section = monthSectionRefs.current.get(monthId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Track month navigation
    mixpanel.track('Diario Month Tab Click', {
      month: monthId,
      user_tier: tier,
      is_guest: !user,
      user_id: user?.id,
    });
  }, [tier, user]);

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

        {/* FREE TIER: Banner informativo */}
        {user && !isPremium && !isGuestMode && tier === 'free' && (() => {
          const freeMonth = getFreeMonth();
          const lockedMonths = getLockedMonths(tier);
          const lockedReflectionsCount = lockedMonths.reduce((sum, m) => sum + m.reflectionsCount, 0);

          if (!freeMonth) return null;

          return (
            <div className="w-full px-4 pt-4 md:px-8">
              <div className="mx-auto max-w-7xl">
                <div className="bg-gradient-to-r from-eco-primary/10 to-eco-accent/10 border border-eco-primary/30 rounded-xl p-5">
                  <div className="text-center space-y-2">
                    <p className="text-sm font-medium text-eco-text">
                      {freeMonth.iconEmoji} Você tem acesso ao mês <span className="font-bold">{freeMonth.theme}</span> ({freeMonth.displayName} - {freeMonth.reflectionsCount} reflexões)
                    </p>
                    <p className="text-xs text-eco-muted">
                      Aprofunde sua jornada estoica com {lockedReflectionsCount} reflexões premium
                    </p>
                    <button
                      onClick={() => {
                        mixpanel.track('Diario Archive Upgrade Click', {
                          user_id: user.id,
                          free_month: freeMonth.id,
                          free_month_theme: freeMonth.theme,
                          reflections_available: freeMonth.reflectionsCount,
                          reflections_locked: lockedReflectionsCount,
                          total_reflections: 61,
                          tier: 'free',
                          source: 'banner',
                        });
                        setShowUpgradeModal(true);
                      }}
                      className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-eco-primary text-white text-sm font-semibold rounded-full hover:bg-eco-primary/90 transition-all shadow-sm hover:shadow-md"
                    >
                      Desbloquear {lockedMonths.map(m => m.theme).join(' + ')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

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

        {/* Month Navigation Tabs */}
        <div className="w-full px-4 pt-8 pb-4 md:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {MONTH_THEMES.map((month) => {
                const isUnlocked = tier === 'premium' || tier === 'vip' || tier === 'essentials' || month.isFreeAccess;
                const lockedMonths = getLockedMonths(tier);
                const isLocked = lockedMonths.some(m => m.id === month.id);

                return (
                  <button
                    key={month.id}
                    onClick={() => scrollToMonth(month.id)}
                    className={`
                      relative inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm
                      transition-all duration-300 shadow-sm hover:shadow-md
                      ${isUnlocked
                        ? 'bg-eco-primary text-white hover:bg-eco-primary/90'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }
                    `}
                  >
                    <span className="text-lg">{month.iconEmoji}</span>
                    <span className="uppercase tracking-wide">{month.displayName.substring(0, 3)}</span>
                    {isUnlocked ? (
                      <span className="text-lg">✓</span>
                    ) : (
                      <span className="text-lg">🔒</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-4 text-xs text-eco-muted">
              <span className="flex items-center gap-1">
                <span>✓</span>
                <span>Disponível</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span>🔒</span>
                <span>Premium</span>
              </span>
            </div>
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

                  {/* Janeiro Section Header */}
                  {(() => {
                    const janeiroMonth = MONTH_THEMES.find(m => m.id === 'janeiro');
                    if (!janeiroMonth) return null;

                    return (
                      <div
                        ref={(el) => {
                          if (el) monthSectionRefs.current.set('janeiro', el);
                        }}
                        className="mt-12 mb-6 text-center"
                      >
                        <h2 className="font-display text-3xl font-bold text-eco-text mb-2 flex items-center justify-center gap-3">
                          <span>{janeiroMonth.iconEmoji}</span>
                          <span>{janeiroMonth.displayName} - {janeiroMonth.theme}</span>
                        </h2>
                        <p className="text-sm text-eco-muted">
                          {janeiroMonth.themeDescription}
                        </p>
                      </div>
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

                  {/* Meses Bloqueados (Free User) */}
                  {user && !isPremium && !isGuestMode && tier === 'free' && (() => {
                    const lockedMonths = getLockedMonths(tier);

                    if (lockedMonths.length === 0) return null;

                    return (
                      <div className="mt-12 space-y-6">
                        <div className="text-center">
                          <h3 className="text-xl font-display font-bold text-eco-text mb-2">
                            Meses Premium
                          </h3>
                          <p className="text-sm text-eco-muted">
                            Desbloqueie {lockedMonths.reduce((sum, m) => sum + m.reflectionsCount, 0)} reflexões adicionais
                          </p>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                          {lockedMonths.map((month) => (
                            <AnimatedSection key={month.id} animation="slide-up-fade">
                              <div
                                ref={(el) => {
                                  if (el) monthSectionRefs.current.set(month.id, el);
                                }}
                                className="relative w-full rounded-2xl overflow-hidden shadow-eco cursor-pointer hover:shadow-eco-glow transition-all duration-300"
                                onClick={() => {
                                  mixpanel.track('Diario Month Locked Click', {
                                    month: month.id,
                                    theme: month.theme,
                                    reflections_count: month.reflectionsCount,
                                    user_tier: tier,
                                    source: 'locked_card',
                                    user_id: user?.id,
                                  });
                                  setShowUpgradeModal(true);
                                }}
                              >
                                {/* Background com blur */}
                                <div className="relative h-64 bg-gradient-to-br from-eco-primary/20 to-eco-accent/20">
                                  <div className="absolute inset-0 backdrop-blur-md bg-white/10" />

                                  {/* Content */}
                                  <div className="relative h-full flex flex-col items-center justify-center p-6 text-center">
                                    {/* Icon */}
                                    <div className="text-6xl mb-4 opacity-50">
                                      {month.iconEmoji}
                                    </div>

                                    {/* Theme */}
                                    <h4 className="font-display text-2xl font-bold text-eco-text mb-2">
                                      {month.displayName}
                                    </h4>
                                    <p className="text-lg font-semibold text-eco-primary mb-3">
                                      {month.theme}
                                    </p>

                                    {/* Description */}
                                    <p className="text-sm text-eco-muted mb-4 max-w-md">
                                      {month.themeDescription}
                                    </p>

                                    {/* Lock icon + count */}
                                    <div className="flex items-center gap-2 mb-6">
                                      <span className="text-2xl">🔒</span>
                                      <span className="text-sm font-medium text-eco-text">
                                        {month.reflectionsCount} reflexões premium
                                      </span>
                                    </div>

                                    {/* CTA Button */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        mixpanel.track('Diario Month CTA Click', {
                                          month: month.id,
                                          theme: month.theme,
                                          user_id: user?.id,
                                        });
                                        setShowUpgradeModal(true);
                                      }}
                                      className="inline-flex items-center gap-2 px-6 py-3 bg-eco-primary text-white font-semibold rounded-full hover:bg-eco-primary/90 transition-all shadow-md hover:shadow-lg"
                                    >
                                      Desbloquear {month.theme}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </AnimatedSection>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
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

        {/* Upgrade Modal */}
        <UpgradeModal
          open={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          source="diario_estoico"
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

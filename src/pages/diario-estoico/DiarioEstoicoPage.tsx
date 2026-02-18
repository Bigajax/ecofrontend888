import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronDown, MoreHorizontal, BookOpen, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import AnimatedSection from '@/components/AnimatedSection';
import HomeHeader from '@/components/home/HomeHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useIsPremium, useSubscriptionTier } from '@/hooks/usePremiumContent';
import DiarioExitModal from '@/components/DiarioExitModal';
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

  // Accordion: which month is open (default = current calendar month)
  const [openMonth, setOpenMonth] = useState<string | null>(() => {
    const monthMap: Record<number, string> = { 0: 'janeiro', 1: 'fevereiro', 11: 'dezembro' };
    const todayMonthId = monthMap[new Date().getMonth()];
    return MONTH_THEMES.some(m => m.id === todayMonthId) ? todayMonthId : MONTH_THEMES[0].id;
  });

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
  const didAutoExpand = useRef(false);

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

  // Obter apenas os cards disponíveis
  const availableMaxims = getAvailableMaxims(tier);

  // Reflexão de hoje baseada no calendário real
  const todayMaxim = (() => {
    const monthMap: Record<number, string> = { 0: 'janeiro', 1: 'fevereiro', 11: 'dezembro' };
    const monthName = monthMap[new Date().getMonth()];
    if (!monthName) return null;
    const dayNum = new Date().getDate();
    return availableMaxims.find(m => m.month === monthName && m.dayNumber === dayNum) ?? null;
  })();

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

  // Auto-expand hoje no mount
  useEffect(() => {
    if (didAutoExpand.current || !todayMaxim) return;
    didAutoExpand.current = true;
    setExpandedCards(prev => new Set(prev).add(todayMaxim.dayNumber));
  }, [todayMaxim]);


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
          card_position: getCardPosition(maxim.dayNumber, availableMaxims[0]?.dayNumber ?? 1),
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
      is_today: todayMaxim?.dayNumber === maxim.dayNumber,
      card_position: getCardPosition(maxim.dayNumber, availableMaxims[0]?.dayNumber ?? 1),
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      source: source as 'direct' | 'home' | 'menu' | 'notification',
      is_guest: !user,
      user_id: user?.id,
      available_reflections: availableMaxims.length,
      today_date: todayMaxim?.date || 'N/A',
      today_author: todayMaxim?.author || 'N/A',
      device_type: getDeviceType(),
    });

    // Clear source after use
    sessionStorage.removeItem('diario_entry_source');
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div className="min-h-screen bg-eco-bg">
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

        {/* Accordion de Meses */}
        <div className="w-full px-4 pt-6 pb-12 md:px-8">
          <div className="mx-auto max-w-3xl space-y-3">
            {MONTH_THEMES.map((month) => {
              const isOpen = openMonth === month.id;
              const isUnlocked = tier === 'premium' || tier === 'vip' || tier === 'essentials' || month.isFreeAccess;
              const monthMaxims = availableMaxims.filter(m => m.month === month.monthName);

              return (
                <div key={month.id} className="rounded-2xl overflow-hidden bg-white shadow-sm border border-eco-line/30">
                  {/* Header do accordion */}
                  <button
                    className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-eco-bg/60 active:bg-eco-bg"
                    onClick={() => {
                      if (!isUnlocked) {
                        mixpanel.track('Diario Month Locked Click', { month: month.id, theme: month.theme, user_tier: tier, user_id: user?.id });
                        setShowUpgradeModal(true);
                        return;
                      }
                      const next = isOpen ? null : month.id;
                      setOpenMonth(next);
                      mixpanel.track('Diario Month Tab Click', { month: month.id, action: next ? 'open' : 'close', user_tier: tier, is_guest: !user, user_id: user?.id });
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{month.iconEmoji}</span>
                      <div className="text-left">
                        <p className="font-bold text-eco-text text-sm sm:text-base leading-tight">
                          {month.displayName}
                        </p>
                        <p className="text-xs text-eco-muted mt-0.5">
                          {month.theme} • {month.reflectionsCount} reflexões
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!isUnlocked && (
                        <span className="text-xs bg-gray-100 text-gray-400 px-2 py-1 rounded-full font-medium">Premium</span>
                      )}
                      {isUnlocked && (
                        <span className="text-xs text-green-600 font-medium hidden sm:inline">✓ Disponível</span>
                      )}
                      <ChevronDown
                        size={18}
                        className={`text-eco-muted transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </button>

                  {/* Cards do mês */}
                  {isOpen && (
                    <div className="border-t border-eco-line/30 px-4 py-4 space-y-4">
                      {monthMaxims.length === 0 && (
                        <p className="text-center text-sm text-eco-muted py-6">
                          Nenhuma reflexão disponível ainda.
                        </p>
                      )}
                      {monthMaxims.map((maxim) => {
                        const isToday = todayMaxim?.dayNumber === maxim.dayNumber && todayMaxim?.month === maxim.month;
                        const isExpanded = expandedCards.has(maxim.dayNumber);
                        const isGuest = isGuestMode && !user && !isVipUser;

                        return (
                          <AnimatedSection key={maxim.dayNumber} animation="slide-up-fade">
                            <div
                              ref={(el) => { if (el) cardRefs.current.set(maxim.dayNumber, el); }}
                              data-diario-card
                              data-day-number={maxim.dayNumber}
                              className={`relative w-full rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 ${
                                isToday
                                  ? 'ring-2 ring-eco-baby shadow-[0_6px_28px_rgba(110,200,255,0.30)]'
                                  : 'shadow-eco hover:shadow-eco-glow'
                              }`}
                              style={{
                                backgroundImage: maxim.background,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                              }}
                              onClick={() => toggleExpanded(maxim.dayNumber)}
                            >
                              <div className="absolute inset-0 bg-black/40 pointer-events-none" />
                              <div className={`relative flex flex-col justify-between p-5 ${isToday ? 'min-h-[220px]' : 'min-h-[160px]'}`}>
                                {/* Top: data + badge hoje */}
                                <div className="flex items-start justify-between gap-2">
                                  <span className={`inline-flex rounded-full px-3 py-1.5 ${isToday ? 'bg-eco-baby' : 'bg-black/40 backdrop-blur-sm'}`}>
                                    <span className="text-[11px] font-semibold text-white tracking-wide">
                                      {isToday ? `HOJE • ${maxim.date}` : maxim.date}
                                    </span>
                                  </span>
                                  {isToday && (
                                    <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/30">
                                      ✦ Reflexão do dia
                                    </span>
                                  )}
                                </div>

                                {/* Bottom: título + botão leia mais */}
                                <div>
                                  <p className={`font-display font-normal leading-snug text-white drop-shadow-lg ${isToday ? 'text-lg sm:text-xl' : 'text-base'}`}>
                                    {maxim.title}
                                  </p>
                                  {isToday && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); toggleExpanded(maxim.dayNumber); }}
                                      className="mt-3 inline-flex items-center gap-2 text-[12px] font-medium rounded-full px-4 py-2 text-white bg-gray-600/60 hover:bg-gray-600/80 backdrop-blur-sm transition-all"
                                    >
                                      <MoreHorizontal size={14} />
                                      {isExpanded ? 'Fechar' : 'Leia mais'}
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Conteúdo expandido */}
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

                                    {!isGuest && (
                                      <div className="space-y-2 pt-1">
                                        {!readDays.has(maxim.dayNumber) && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              markDayAsRead(maxim.dayNumber);
                                              mixpanel.track('Diario Estoico: Marked As Read', { day_number: maxim.dayNumber, is_guest: !user, method: 'button' });
                                            }}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-eco-baby hover:bg-eco-baby/90 rounded-lg active:scale-95 transition-all duration-200"
                                          >
                                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M13.5 4L6 11.5L2.5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                            Marcar como lida
                                          </button>
                                        )}
                                        {readDays.has(maxim.dayNumber) && (
                                          <div className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-eco-accent glass-shell rounded-lg">
                                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M13.5 4L6 11.5L2.5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                            Reflexão concluída
                                          </div>
                                        )}
                                        <div className="flex gap-2">
                                          <button
                                            onClick={(e) => { e.stopPropagation(); setReadingModeMaxim(maxim); mixpanel.track('Diario Estoico: Reading Mode Opened', { day_number: maxim.dayNumber, is_guest: !user }); }}
                                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-eco-text glass-shell rounded-lg hover:bg-eco-accent/10 transition-all duration-300"
                                          >
                                            <BookOpen size={12} />
                                            Modo Leitura
                                          </button>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); setShareModalMaxim(maxim); mixpanel.track('Diario Estoico: Share Opened', { day_number: maxim.dayNumber, is_guest: !user }); }}
                                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-eco-text glass-shell rounded-lg hover:bg-eco-accent/10 transition-all duration-300"
                                          >
                                            <Share2 size={12} />
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
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

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

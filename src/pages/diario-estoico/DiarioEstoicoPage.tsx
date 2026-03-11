import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ChevronLeft, MoreHorizontal, BookOpen, Share2 } from 'lucide-react';
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
  monthName: string;
  displayName: string;
  shortName: string; // 'JAN', 'FEV', etc.
  theme: string;
  themeDescription: string;
  reflectionsCount: number;
  startDay: number;
  endDay: number;
  isFreeAccess: boolean;
  part: 1 | 2 | 3;
  image?: string; // Imagem do card (a ser fornecida)
}

interface Part {
  number: string; // 'I', 'II', 'III'
  title: string;
  monthIds: string[];
}

const PARTS: Part[] = [
  { number: 'I',   title: 'A Disciplina da Percepção', monthIds: ['janeiro', 'fevereiro', 'marco', 'abril'] },
  { number: 'II',  title: 'A Disciplina da Ação',      monthIds: ['maio', 'junho', 'julho', 'agosto'] },
  { number: 'III', title: 'A Disciplina da Vontade',   monthIds: ['setembro', 'outubro', 'novembro', 'dezembro'] },
];

const MONTH_THEMES: MonthMetadata[] = [
  // ── Parte I ──────────────────────────────────────────────────────────────
  {
    id: 'janeiro', monthName: 'janeiro', displayName: 'JANEIRO', shortName: 'JAN',
    theme: 'CLAREZA',
    themeDescription: 'Reflexões sobre clareza mental, foco e discernimento',
    reflectionsCount: 13, startDay: 19, endDay: 31,
    isFreeAccess: true, part: 1,
    image: '/images/diario-janeiro.webp',
  },
  {
    id: 'fevereiro', monthName: 'fevereiro', displayName: 'FEVEREIRO', shortName: 'FEV',
    theme: 'PAIXÕES E EMOÇÕES',
    themeDescription: 'Domine suas paixões, entenda suas emoções',
    reflectionsCount: 28, startDay: 1, endDay: 28,
    isFreeAccess: true, part: 1,
    image: '/images/diario-fevereiro.webp',
  },
  {
    id: 'marco', monthName: 'marco', displayName: 'MARÇO', shortName: 'MAR',
    theme: 'CONSCIÊNCIA',
    themeDescription: 'Desperte para a plena consciência de si e do mundo',
    reflectionsCount: 31, startDay: 1, endDay: 31,
    isFreeAccess: false, part: 1,
    image: '/images/diario-marco.webp',
  },
  {
    id: 'abril', monthName: 'abril', displayName: 'ABRIL', shortName: 'ABR',
    theme: 'PENSAMENTO IMPARCIAL',
    themeDescription: 'Veja as coisas como elas realmente são',
    reflectionsCount: 30, startDay: 1, endDay: 30,
    isFreeAccess: false, part: 1,
    image: '/images/diario-abril.webp',
  },
  // ── Parte II ─────────────────────────────────────────────────────────────
  {
    id: 'maio', monthName: 'maio', displayName: 'MAIO', shortName: 'MAI',
    theme: 'AÇÃO CORRETA',
    themeDescription: 'Aja com propósito, virtude e determinação',
    reflectionsCount: 31, startDay: 1, endDay: 31,
    isFreeAccess: false, part: 2,
    image: '/images/diario-maio.webp',
  },
  {
    id: 'junho', monthName: 'junho', displayName: 'JUNHO', shortName: 'JUN',
    theme: 'SOLUÇÕES DE PROBLEMAS',
    themeDescription: 'Enfrente obstáculos com criatividade e calma',
    reflectionsCount: 30, startDay: 1, endDay: 30,
    isFreeAccess: false, part: 2,
    image: '/images/diario-junho.webp',
  },
  {
    id: 'julho', monthName: 'julho', displayName: 'JULHO', shortName: 'JUL',
    theme: 'DEVER',
    themeDescription: 'Cumpra seu papel com excelência e integridade',
    reflectionsCount: 31, startDay: 1, endDay: 31,
    isFreeAccess: false, part: 2,
    image: '/images/diario-julho.webp',
  },
  {
    id: 'agosto', monthName: 'agosto', displayName: 'AGOSTO', shortName: 'AGO',
    theme: 'PRAGMATISMO',
    themeDescription: 'Foco no que funciona, no que importa agora',
    reflectionsCount: 31, startDay: 1, endDay: 31,
    isFreeAccess: false, part: 2,
    image: '/images/diario-agosto.webp',
  },
  // ── Parte III ────────────────────────────────────────────────────────────
  {
    id: 'setembro', monthName: 'setembro', displayName: 'SETEMBRO', shortName: 'SET',
    theme: 'FORÇA E RESILIÊNCIA',
    themeDescription: 'Construa uma fortaleza interior inabalável',
    reflectionsCount: 30, startDay: 1, endDay: 30,
    isFreeAccess: false, part: 3,
    image: '/images/diario-setembro.webp',
  },
  {
    id: 'outubro', monthName: 'outubro', displayName: 'OUTUBRO', shortName: 'OUT',
    theme: 'VIRTUDE E BONDADE',
    themeDescription: 'Viva bem fazendo o bem ao mundo',
    reflectionsCount: 31, startDay: 1, endDay: 31,
    isFreeAccess: false, part: 3,
    image: '/images/diario-outubro.webp',
  },
  {
    id: 'novembro', monthName: 'novembro', displayName: 'NOVEMBRO', shortName: 'NOV',
    theme: 'ACEITAÇÃO, AMOR FATI',
    themeDescription: 'Ame seu destino, abrace o que não pode ser mudado',
    reflectionsCount: 30, startDay: 1, endDay: 30,
    isFreeAccess: false, part: 3,
    image: '/images/diario-novembro.webp',
  },
  {
    id: 'dezembro', monthName: 'dezembro', displayName: 'DEZEMBRO', shortName: 'DEZ',
    theme: 'MEDITAÇÃO SOBRE MORTALIDADE',
    themeDescription: 'Memento Mori: reflexões sobre finitude e propósito',
    reflectionsCount: 20, startDay: 8, endDay: 27,
    isFreeAccess: false, part: 3,
    image: '/images/diario-dezembro.webp',
  },
];

/**
 * Função para obter reflexões disponíveis por tier
 * - Premium/VIP: Arquivo completo (todos os meses)
 * - Essentials: Todos os meses
 * - Free: Meses marcados com isFreeAccess (JANEIRO + FEVEREIRO)
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

    const monthOrder: Record<string, number> = {};
    MONTH_THEMES.forEach((m, i) => { monthOrder[m.monthName] = i; });

    return allReflections.sort((a, b) => {
      const monthDiff = (monthOrder[a.month] ?? 999) - (monthOrder[b.month] ?? 999);
      if (monthDiff !== 0) return monthDiff;
      return a.dayNumber - b.dayNumber;
    });
  } else {
    // FREE: Todos os meses marcados com isFreeAccess
    const freeMonths = MONTH_THEMES.filter(m => m.isFreeAccess);

    if (freeMonths.length === 0) return [];

    const monthOrder: Record<string, number> = {};
    MONTH_THEMES.forEach((m, i) => { monthOrder[m.monthName] = i; });

    const freeReflections = ALL_DAILY_MAXIMS.filter(maxim =>
      freeMonths.some(
        fm =>
          fm.monthName === maxim.month &&
          maxim.dayNumber >= fm.startDay &&
          maxim.dayNumber <= fm.endDay
      )
    );

    return freeReflections.sort((a, b) => {
      const monthDiff = (monthOrder[a.month] ?? 999) - (monthOrder[b.month] ?? 999);
      if (monthDiff !== 0) return monthDiff;
      return a.dayNumber - b.dayNumber;
    });
  }
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
    const monthMap: Record<number, string> = {
      0: 'janeiro', 1: 'fevereiro', 2: 'marco', 3: 'abril',
      4: 'maio', 5: 'junho', 6: 'julho', 7: 'agosto',
      8: 'setembro', 9: 'outubro', 10: 'novembro', 11: 'dezembro',
    };
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
   * Helper para renderizar comentário.
   * Guests veem teaser (fade + CTA), usuários autenticados veem completo.
   */
  const renderComment = (maxim: DailyMaxim, textSizeClass: string = 'text-[13px]') => {
    if (!maxim.comment) return null;

    // Não logado → teaser parcial com CTA para criar conta
    if (!user) {
      const reflectionId = `${maxim.month}-${maxim.dayNumber}`;
      return (
        <>
          <hr className="border-eco-line" />
          <div>
            <h4 className="font-primary text-xs font-semibold text-eco-muted tracking-[0.12em] uppercase mb-3">
              Comentário
            </h4>
            <div className="relative overflow-hidden" style={{ maxHeight: '180px' }}>
              <p className={`font-primary ${textSizeClass} leading-[1.7] text-eco-text whitespace-pre-line`}>
                {maxim.comment}
              </p>
              <div
                className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
                style={{ background: 'linear-gradient(to top, rgba(248,247,245,0.98) 0%, rgba(248,247,245,0) 100%)' }}
              />
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                mixpanel.track('Guest Reflection Teaser CTA Clicked', { reflection_id: reflectionId });
                navigate('/register?returnTo=/app/diario-estoico');
              }}
              className="mt-3 w-full bg-eco-baby text-white px-4 py-2.5 rounded-lg font-primary font-semibold text-sm hover:bg-eco-baby/90 active:scale-95 transition-all duration-200"
            >
              Leia a reflexão completa →
            </button>
            <p className="text-center text-xs text-eco-muted mt-2 font-primary">
              Crie sua conta em 30 segundos — sempre gratuito
            </p>
          </div>
        </>
      );
    }

    // Logado (qualquer tier) → comentário completo
    return (
      <>
        <hr className="border-eco-line" />
        <div>
          <h4 className="font-primary text-xs font-semibold text-eco-muted tracking-[0.12em] uppercase mb-3">
            Comentário
          </h4>
          <p className={`font-primary ${textSizeClass} leading-[1.7] text-eco-text whitespace-pre-line`}>
            {maxim.comment}
          </p>
        </div>
      </>
    );
  };

  // Obter apenas os cards disponíveis — memoizado por tier
  // Visitantes não logados veem todos os meses (sem gate de conteúdo)
  const availableMaxims = useMemo(
    () => getAvailableMaxims((tier === 'premium' || tier === 'vip') ? tier : 'essentials'),
    [tier]
  );

  // Reflexão de hoje baseada no calendário real
  const todayMaxim = (() => {
    const monthMap: Record<number, string> = {
      0: 'janeiro', 1: 'fevereiro', 2: 'marco', 3: 'abril',
      4: 'maio', 5: 'junho', 6: 'julho', 7: 'agosto',
      8: 'setembro', 9: 'outubro', 10: 'novembro', 11: 'dezembro',
    };
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
    navigate('/register?returnTo=' + encodeURIComponent('/app/diario-estoico'));
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
    let rafId: number;
    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const scrollTop = window.scrollY;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;

        // Considera "bottom" se está a 100px do final
        if (scrollTop + windowHeight >= documentHeight - 100) {
          setScrolledToBottom(true);
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  // Ref para evitar que o observer reconecte a cada mudança de handleCardView
  const handleCardViewRef = useRef(handleCardView);
  useEffect(() => {
    handleCardViewRef.current = handleCardView;
  }, [handleCardView]);

  // Intersection observer for card views
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const dayNumber = parseInt(entry.target.getAttribute('data-day-number') || '0');
            if (dayNumber) {
              handleCardViewRef.current(dayNumber);
            }
          }
        });
      },
      { threshold: 0.5 } // 50% do card visível
    );

    // Observar todos os cards — roda apenas uma vez após o mount
    const cards = document.querySelectorAll('[data-diario-card]');
    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll até a reflexão de hoje após render
  useEffect(() => {
    if (!todayMaxim) return;
    const timer = setTimeout(() => {
      const el = cardRefs.current.get(todayMaxim.dayNumber);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 600); // Aguarda animações de entrada
    return () => clearTimeout(timer);
  }, [todayMaxim]);

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

        {/* FREE TIER: Banner removido — todos os meses agora acessíveis, conteúdo gateado via teaser */}

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

        {/* Partes — seleção de mês */}
        <div className="w-full px-4 pt-6 md:px-8 space-y-8">
          <div className="mx-auto max-w-3xl space-y-8">
            {PARTS.map((part) => {
              const partMonths = MONTH_THEMES.filter(m => part.monthIds.includes(m.id));

              return (
                <div key={part.number}>
                  {/* Header da parte */}
                  <div className="mb-4">
                    <p className="text-xs font-bold tracking-[0.2em] text-eco-muted uppercase mb-0.5">
                      Parte {part.number}
                    </p>
                    <p className="font-display text-base font-bold text-eco-text tracking-wide uppercase">
                      {part.title}
                    </p>
                  </div>

                  {/* Grid 2x2 dos meses */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {partMonths.map((month) => {
                      const isActive = openMonth === month.id;
                      const isUnlocked = true; // Todos os meses acessíveis; conteúdo gateado via teaser no comentário
                      const hasToday = todayMaxim?.month === month.monthName;
                      const monthMaxims = availableMaxims.filter(m => m.month === month.monthName);

                      return (
                        <button
                          key={month.id}
                          onClick={() => {
                            if (!isUnlocked) {
                              mixpanel.track('Diario Month Locked Click', { month: month.id, theme: month.theme, user_tier: tier, user_id: user?.id });
                              setShowUpgradeModal(true);
                              return;
                            }
                            setOpenMonth(isActive ? null : month.id);
                            mixpanel.track('Diario Month Tab Click', { month: month.id, action: isActive ? 'close' : 'open', user_tier: tier, is_guest: !user, user_id: user?.id });
                          }}
                          className={`relative flex flex-col rounded-2xl overflow-hidden text-left transition-all duration-300 active:scale-[0.97]
                            ${isActive
                              ? 'ring-2 ring-[#3B2D8F] shadow-[0_4px_20px_rgba(59,45,143,0.25)]'
                              : 'shadow-sm border border-eco-line/40 hover:shadow-md'
                            }`}
                        >
                          {/* Espaço para imagem */}
                          <div className={`w-full h-[110px] relative overflow-hidden ${
                            isActive ? 'bg-[#3B2D8F]/10' : 'bg-gray-100'
                          }`}>
                            {month.image ? (
                              <img
                                src={month.image}
                                alt={month.displayName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${
                                isActive
                                  ? 'from-[#3B2D8F]/15 to-[#3B2D8F]/5'
                                  : 'from-gray-200 to-gray-100'
                              }`}>
                                <span className={`text-[10px] font-medium tracking-wide uppercase ${isActive ? 'text-[#3B2D8F]/50' : 'text-gray-400'}`}>
                                  Em breve
                                </span>
                              </div>
                            )}
                            {/* Badge hoje */}
                            {hasToday && (
                              <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-eco-baby shadow" />
                            )}
                            {/* Lock overlay */}
                            {!isUnlocked && (
                              <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                                <span className="text-[11px] font-bold text-gray-500 bg-white/90 px-2.5 py-1 rounded-full tracking-wide shadow-sm">
                                  Premium
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Info do mês */}
                          <div className={`px-3 py-3 ${isActive ? 'bg-[#3B2D8F]' : 'bg-white'}`}>
                            <p className={`font-bold text-sm leading-tight tracking-wider uppercase ${isActive ? 'text-white' : 'text-eco-text'}`}>
                              {month.shortName}
                            </p>
                            <p className={`text-xs mt-1 leading-snug ${isActive ? 'text-white/80' : 'text-eco-muted'}`}>
                              {month.theme}
                            </p>
                            <p className={`text-[11px] mt-1.5 font-medium ${isActive ? 'text-white/55' : 'text-eco-muted/70'}`}>
                              {monthMaxims.length > 0 ? `${monthMaxims.length} dias` : 'Em breve'}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reflexões do mês selecionado */}
        {openMonth && (() => {
          const month = MONTH_THEMES.find(m => m.id === openMonth);
          if (!month) return null;
          const monthMaxims = availableMaxims.filter(m => m.month === month.monthName);

          return (
            <div className="w-full px-4 pt-5 pb-12 md:px-8">
              <div className="mx-auto max-w-3xl">
                {/* Header do mês */}
                <div className="mb-5">
                  <h2 className="font-display font-bold text-eco-text text-lg leading-tight">
                    {month.displayName} — {month.theme}
                  </h2>
                  <p className="text-xs text-eco-muted mt-1">{month.themeDescription}</p>
                </div>

                {/* Lista de reflexões — vertical no mobile, carrossel no desktop */}
                <div
                  className="flex flex-col gap-5 md:flex-row md:overflow-x-auto md:snap-x md:snap-mandatory md:gap-4 md:pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                    {monthMaxims.length === 0 && (
                      <p className="text-center text-sm text-eco-muted py-8 w-full">
                        Nenhuma reflexão disponível ainda.
                      </p>
                    )}
                    {monthMaxims.map((maxim) => {
                      const isToday = todayMaxim?.dayNumber === maxim.dayNumber && todayMaxim?.month === maxim.month;
                      const isExpanded = expandedCards.has(maxim.dayNumber);
                      const isGuest = isGuestMode && !user && !isVipUser;

                      return (
                        <div
                          key={maxim.dayNumber}
                          ref={(el) => { if (el) cardRefs.current.set(maxim.dayNumber, el); }}
                          className="w-full md:snap-center md:flex-shrink-0 md:w-[calc(100%-180px)]"
                        >
                          {/* Imagem + citação */}
                          <div
                            data-diario-card
                            data-day-number={maxim.dayNumber}
                            className={`relative rounded-2xl overflow-hidden cursor-pointer transition-shadow duration-300 ${
                              isToday
                                ? 'ring-2 ring-eco-baby shadow-[0_6px_28px_rgba(110,200,255,0.30)]'
                                : 'shadow-eco hover:shadow-eco-glow'
                            } ${isExpanded ? 'rounded-b-none' : ''}`}
                            style={{
                              backgroundImage: maxim.background,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              minHeight: '280px',
                            }}
                            onClick={() => toggleExpanded(maxim.dayNumber)}
                          >
                            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/55 to-black/75 pointer-events-none" />

                            <div className="relative h-full flex flex-col justify-between p-5" style={{ minHeight: '280px' }}>
                              {/* Topo: badge data */}
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

                              {/* Centro: título */}
                              <div className="flex-1 flex items-center justify-center px-4 py-4">
                                <p
                                  className="font-display text-white text-center text-base sm:text-xl leading-snug drop-shadow-lg tracking-wide break-words"
                                  style={{ textShadow: '0 2px 12px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.5)' }}
                                >
                                  {maxim.title}
                                </p>
                              </div>

                              {/* Rodapé: botão */}
                              <div className="flex items-end justify-end">
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleExpanded(maxim.dayNumber); }}
                                  className="flex-shrink-0 inline-flex items-center gap-1.5 text-[11px] font-medium rounded-full px-3.5 py-1.5 text-white bg-black/50 hover:bg-black/70 backdrop-blur-sm transition-all"
                                >
                                  <MoreHorizontal size={12} />
                                  {isExpanded ? 'Fechar' : 'Leia mais'}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Seção expandida */}
                          {isExpanded && (
                            <div className="glass-shell rounded-b-2xl p-5 border-t border-eco-line/30">
                              <div className="space-y-3">
                                <p className="font-display text-[13px] leading-[1.75] text-eco-text italic">
                                  "{maxim.text}"
                                </p>
                                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                                  <p className="font-primary text-[11px] font-semibold uppercase tracking-wide text-eco-accent min-w-0">
                                    — {maxim.author}{maxim.source && `, ${maxim.source}`}
                                  </p>
                                  {!isGuest && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setReadingModeMaxim(maxim); mixpanel.track('Diario Estoico: Reading Mode Opened', { day_number: maxim.dayNumber, is_guest: !user }); }}
                                      className="self-start sm:self-auto flex-shrink-0 flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-eco-text glass-shell rounded-full hover:bg-eco-accent/10 transition-all duration-300"
                                    >
                                      <BookOpen size={11} />
                                      Modo Leitura
                                    </button>
                                  )}
                                </div>
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
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setShareModalMaxim(maxim); mixpanel.track('Diario Estoico: Share Opened', { day_number: maxim.dayNumber, is_guest: !user }); }}
                                      className="w-full flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-eco-text glass-shell rounded-lg hover:bg-eco-accent/10 transition-all duration-300"
                                    >
                                      <Share2 size={12} />
                                      Compartilhar
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
              </div>
            </div>
          );
        })()}

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

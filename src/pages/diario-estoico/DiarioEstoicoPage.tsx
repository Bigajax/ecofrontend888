import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ChevronLeft, BookOpen, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import AnimatedSection from '@/components/AnimatedSection';
import HomeHeader from '@/components/home/HomeHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useIsPremium, useSubscriptionTier } from '@/hooks/usePremiumContent';
import DiarioExitModal from '@/components/DiarioExitModal';
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

  // Desktop carousel: card deck layout
  const carouselRef = useRef<HTMLDivElement>(null);
  const [activeCarouselDay, setActiveCarouselDay] = useState<number | null>(null);

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
            <div className="mt-3 flex flex-col gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  mixpanel.track('Guest Reflection Teaser CTA Clicked', { reflection_id: reflectionId, action: 'login' });
                  navigate('/login?returnTo=/app/diario-estoico');
                }}
                className="w-full bg-eco-baby text-white px-4 py-2.5 rounded-lg font-primary font-semibold text-sm hover:bg-eco-baby/90 active:scale-95 transition-all duration-200"
              >
                Entrar para ler →
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  mixpanel.track('Guest Reflection Teaser CTA Clicked', { reflection_id: reflectionId, action: 'register' });
                  navigate('/register?returnTo=/app/diario-estoico');
                }}
                className="w-full border border-eco-baby text-eco-baby px-4 py-2 rounded-lg font-primary font-medium text-sm hover:bg-eco-baby/5 active:scale-95 transition-all duration-200"
              >
                Criar conta grátis
              </button>
            </div>
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

  // Detecta qual card está mais próximo do centro do carrossel (desktop)
  const handleCarouselScroll = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;
    const containerCenter = el.scrollLeft + el.offsetWidth / 2;
    let closestDay: number | null = null;
    let closestDist = Infinity;
    cardRefs.current.forEach((cardEl, dayNumber) => {
      const cardCenter = cardEl.offsetLeft + cardEl.offsetWidth / 2;
      const dist = Math.abs(containerCenter - cardCenter);
      if (dist < closestDist) { closestDist = dist; closestDay = dayNumber; }
    });
    if (closestDay !== null) setActiveCarouselDay(closestDay);
  }, []);

  // Inicializa card ativo ao abrir um mês
  useEffect(() => {
    setActiveCarouselDay(null);
    const t = setTimeout(handleCarouselScroll, 60);
    return () => clearTimeout(t);
  }, [openMonth, handleCarouselScroll]);

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
    <div className="min-h-screen" style={{ background: '#FAF9F7' }}>
      <Toaster position="top-center" />

      <div className="w-full min-h-full">
        {/* Header - apenas se usuário logado */}
        {user && <HomeHeader onLogout={handleLogout} />}

        {/* FREE TIER: Banner removido — todos os meses agora acessíveis, conteúdo gateado via teaser */}

        {/* Navegação */}
        <div className="w-full px-4 pt-6 md:px-8">
          <div className="mx-auto max-w-3xl flex items-center justify-between">
            <button
              onClick={handleBackClick}
              className="inline-flex items-center justify-center w-10 h-10 text-eco-text
                         bg-white border border-eco-line/60 rounded-full hover:border-eco-accent/40
                         transition-all duration-300 shadow-minimal hover:shadow-eco"
              aria-label="Voltar"
            >
              <ChevronLeft size={20} />
            </button>

            {!user && (
              <button
                onClick={() => navigate('/register')}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold
                           text-white bg-eco-baby rounded-full hover:bg-eco-baby/90
                           hover:scale-105 active:scale-95 transition-all duration-200 shadow-sm"
              >
                Criar conta grátis
              </button>
            )}
          </div>
        </div>

        {/* Hero Editorial — Título e Subtítulo */}
        <div className="w-full px-4 pt-8 pb-2 md:px-8">
          <div className="mx-auto max-w-3xl">
            {/* Ornamento topo */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="h-px flex-1 max-w-[60px]" style={{ background: 'linear-gradient(90deg, transparent, #C6A995)' }} />
              <span className="text-[10px] font-semibold tracking-[0.3em] text-eco-accent uppercase">Ano I</span>
              <div className="h-px flex-1 max-w-[60px]" style={{ background: 'linear-gradient(90deg, #C6A995, transparent)' }} />
            </div>

            {/* Título principal */}
            <div className="text-center">
              <h1 className="font-display font-bold text-eco-text leading-none tracking-tight"
                style={{ fontSize: 'clamp(2.2rem, 8vw, 4.5rem)' }}>
                Diário Estoico
              </h1>
              <p className="mt-3 font-primary text-[11px] sm:text-xs font-medium tracking-[0.25em] text-eco-muted uppercase">
                366 lições · sabedoria · perseverança · a arte de viver
              </p>

              {/* Linha decorativa */}
              <div className="flex items-center justify-center gap-2 mt-5">
                <div className="h-px w-12" style={{ background: 'linear-gradient(90deg, transparent, #C6A995 50%, transparent)' }} />
                <span style={{ color: '#C6A995', fontSize: '6px' }}>◆◆◆</span>
                <div className="h-px w-12" style={{ background: 'linear-gradient(90deg, transparent, #C6A995 50%, transparent)' }} />
              </div>
            </div>

            {/* Progress integrado ao hero */}
            {availableMaxims.length > 0 && readDays.size > 0 && (
              <div className="mt-6 mx-auto max-w-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-medium text-eco-muted tracking-wide">Seu progresso</span>
                  <span className="text-[11px] font-semibold text-eco-accent">
                    {readDays.size}/{availableMaxims.length} reflexões
                  </span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(198,169,149,0.18)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${(readDays.size / availableMaxims.length) * 100}%`,
                      background: 'linear-gradient(90deg, #C6A995, #A7846C)',
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Partes — seleção de mês */}
        <div className="w-full px-4 pt-8 md:px-8 pb-4 space-y-10">
          <div className="mx-auto max-w-3xl space-y-10">
            {PARTS.map((part, partIndex) => {
              const partMonths = MONTH_THEMES.filter(m => part.monthIds.includes(m.id));

              return (
                <div key={part.number}>
                  {/* Header da parte — editorial */}
                  <div className="mb-5 flex items-center gap-4">
                    <div className="flex-shrink-0 flex flex-col items-center">
                      <span className="font-display text-[28px] font-bold leading-none"
                        style={{ color: 'rgba(198,169,149,0.45)' }}>
                        {part.number}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold tracking-[0.25em] uppercase mb-0.5"
                        style={{ color: '#C6A995' }}>
                        Parte {['um', 'dois', 'três'][partIndex]}
                      </p>
                      <p className="font-display text-sm sm:text-base font-bold text-eco-text tracking-wide">
                        {part.title}
                      </p>
                    </div>
                    <div className="flex-shrink-0 h-px w-8 sm:w-16" style={{ background: 'rgba(198,169,149,0.3)' }} />
                  </div>

                  {/* Grid 2x2 dos meses */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {partMonths.map((month) => {
                      const isActive = openMonth === month.id;
                      const isUnlocked = true;
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
                              ? 'shadow-[0_8px_32px_rgba(198,169,149,0.35)]'
                              : 'hover:shadow-[0_4px_20px_rgba(0,0,0,0.10)] hover:-translate-y-0.5'
                            }`}
                          style={isActive
                            ? { outline: '2px solid #C6A995', outlineOffset: '0px' }
                            : { border: '1px solid rgba(232,227,221,0.7)' }
                          }
                        >
                          {/* Imagem */}
                          <div className={`w-full relative overflow-hidden`} style={{ height: '110px' }}>
                            {month.image ? (
                              <>
                                <img
                                  src={month.image}
                                  alt={month.displayName}
                                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                                />
                                {/* Overlay gradiente elegante */}
                                <div className="absolute inset-0" style={{
                                  background: isActive
                                    ? 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.38) 100%)'
                                    : 'linear-gradient(to bottom, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.28) 100%)',
                                }} />
                              </>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center"
                                style={{ background: 'linear-gradient(135deg, #F3EEE7 0%, #EAE4DC 100%)' }}>
                                <span className="text-[10px] font-medium tracking-wide uppercase text-eco-muted/50">
                                  Em breve
                                </span>
                              </div>
                            )}

                            {/* Badge "hoje" */}
                            {hasToday && (
                              <span className="absolute top-2 left-2 h-2 w-2 rounded-full bg-eco-baby shadow-sm"
                                style={{ boxShadow: '0 0 6px rgba(110,200,255,0.7)' }} />
                            )}

                            {/* Nome do mês sobre a imagem */}
                            <div className="absolute bottom-0 left-0 right-0 px-3 pb-2">
                              <p className="font-display text-white text-sm font-bold leading-tight tracking-wider drop-shadow-sm">
                                {month.shortName}
                              </p>
                            </div>

                            {!isUnlocked && (
                              <div className="absolute inset-0 backdrop-blur-[2px] bg-white/50 flex items-center justify-center">
                                <span className="text-[11px] font-bold text-eco-muted bg-white/90 px-2.5 py-1 rounded-full tracking-wide shadow-sm">
                                  Premium
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Info do mês */}
                          <div className={`px-3 py-2.5 transition-colors duration-300 ${
                            isActive
                              ? 'bg-[#38322A]'
                              : 'bg-white'
                          }`}>
                            <p className={`text-[10px] font-bold tracking-[0.18em] uppercase leading-tight ${
                              isActive ? 'text-eco-accent' : 'text-eco-muted'
                            }`}>
                              {month.theme}
                            </p>
                            <p className={`text-[11px] mt-1 font-medium ${
                              isActive ? 'text-white/50' : 'text-eco-muted/60'
                            }`}>
                              {monthMaxims.length > 0 ? `${monthMaxims.length} reflexões` : 'Em breve'}
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
            <div className="w-full px-4 pt-2 pb-16 md:px-8" style={{ animation: 'slideUpFade 0.35s ease-out' }}>
              <div className="mx-auto max-w-3xl">
                {/* Header do mês — elegante, compacto */}
                <div className="mb-6 flex items-center gap-3 py-4 border-y"
                  style={{ borderColor: 'rgba(198,169,149,0.2)' }}>
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.25em] uppercase mb-0.5"
                      style={{ color: '#C6A995' }}>
                      {month.displayName}
                    </p>
                    <h2 className="font-display font-bold text-eco-text text-base leading-tight">
                      {month.theme}
                    </h2>
                    <p className="text-[11px] text-eco-muted mt-0.5">{month.themeDescription}</p>
                  </div>
                </div>

                {/* Lista de reflexões */}
                <div
                  ref={carouselRef}
                  onScroll={handleCarouselScroll}
                  className="flex flex-col gap-4 md:flex-row md:overflow-x-auto md:snap-x md:snap-mandatory md:gap-4 md:pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                      const isActiveDeck = activeCarouselDay === maxim.dayNumber ||
                        (activeCarouselDay === null && maxim.dayNumber === monthMaxims[0]?.dayNumber);

                      return (
                        <div
                          key={maxim.dayNumber}
                          ref={(el) => { if (el) cardRefs.current.set(maxim.dayNumber, el); }}
                          className={`w-full md:snap-center md:flex-shrink-0 md:min-w-[420px] md:w-[calc(100%-80px)] md:max-w-[620px] md:transition-all md:duration-300 md:ease-out
                            ${isActiveDeck
                              ? 'md:scale-100 md:opacity-100'
                              : 'md:scale-[0.88] md:opacity-45'
                            }`}
                        >
                          {/* Card visual da reflexão */}
                          <div
                            data-diario-card
                            data-day-number={maxim.dayNumber}
                            className={`relative overflow-hidden cursor-pointer transition-all duration-250 active:scale-[0.98] ${
                              isExpanded ? 'rounded-t-2xl' : 'rounded-2xl'
                            } ${
                              isToday
                                ? 'shadow-[0_8px_32px_rgba(110,200,255,0.28)]'
                                : isActiveDeck
                                  ? 'shadow-[0_12px_40px_rgba(0,0,0,0.16)]'
                                  : 'shadow-[0_4px_20px_rgba(0,0,0,0.10)]'
                            }`}
                            style={{
                              backgroundImage: maxim.background,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              minHeight: '280px',
                              outline: isToday ? '2px solid rgba(110,200,255,0.6)' : 'none',
                              outlineOffset: '0px',
                            }}
                            onClick={() => toggleExpanded(maxim.dayNumber)}
                          >
                            {/* Gradiente dramático de baixo para cima */}
                            <div className="absolute inset-0 pointer-events-none"
                              style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.30) 45%, rgba(0,0,0,0.82) 100%)' }} />

                            <div className="relative h-full flex flex-col justify-between p-5 md:p-7" style={{ minHeight: '280px' }}>
                              {/* Topo */}
                              <div className="flex items-start justify-between gap-2">
                                <span className={`inline-flex rounded-full px-3 py-1 ${isToday ? 'bg-eco-baby' : 'bg-black/35 backdrop-blur-sm'}`}>
                                  <span className="text-[10px] font-semibold text-white tracking-widest uppercase">
                                    {isToday ? `Hoje · ${maxim.date}` : maxim.date}
                                  </span>
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {readDays.has(maxim.dayNumber) && (
                                    <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-full border border-white/25 tracking-wide">
                                      ✓ LIDA
                                    </span>
                                  )}
                                  {isToday && !readDays.has(maxim.dayNumber) && (
                                    <span className="inline-flex items-center gap-1 bg-white/15 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-full border border-white/20 tracking-wide">
                                      ✦ HOJE
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Centro: título */}
                              <div className="flex-1 flex items-center justify-center px-2 py-5 md:px-6">
                                <p
                                  className="font-display text-white text-center leading-snug tracking-wide break-words"
                                  style={{
                                    fontSize: 'clamp(1.15rem, 4vw, 1.75rem)',
                                    textShadow: '0 2px 20px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.5)',
                                  }}
                                >
                                  {maxim.title}
                                </p>
                              </div>

                              {/* Rodapé */}
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] text-white/45 font-primary tracking-wide">
                                  — {maxim.author}
                                </span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleExpanded(maxim.dayNumber); }}
                                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-4 py-1.5 text-white transition-all duration-200 active:scale-95"
                                  style={{
                                    background: isExpanded ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.18)',
                                    backdropFilter: 'blur(8px)',
                                    border: '1px solid rgba(255,255,255,0.22)',
                                  }}
                                >
                                  {isExpanded ? 'Fechar' : <><BookOpen size={11} /> Ler</>}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Seção expandida — MOBILE ONLY */}
                          {isExpanded && (
                            <div className="md:hidden rounded-b-2xl overflow-hidden"
                              style={{
                                background: 'linear-gradient(to bottom, #FFFFFF, #FAF9F7)',
                                border: '1px solid rgba(232,227,221,0.7)',
                                borderTop: 'none',
                                animation: 'slideDown 0.25s ease-out',
                              }}>
                              {/* Citação */}
                              <div className="px-5 pt-6 pb-5">
                                <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-4"
                                  style={{ color: '#C6A995' }}>
                                  {maxim.author}{maxim.source && ` · ${maxim.source}`}
                                </p>
                                {/* Aspas decorativas */}
                                <div className="font-display text-[2.5rem] leading-none mb-2"
                                  style={{ color: 'rgba(198,169,149,0.3)', lineHeight: '1' }}>"</div>
                                <p className="font-display text-[15px] leading-[1.8] text-eco-text italic -mt-3">
                                  {maxim.text}
                                </p>
                                {!isGuest && user && (
                                  <div className="mt-5 flex justify-center">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setReadingModeMaxim(maxim); mixpanel.track('Diario Estoico: Reading Mode Opened', { day_number: maxim.dayNumber, is_guest: !user }); }}
                                      className="inline-flex items-center gap-2 px-6 py-2.5 text-[12px] font-semibold text-white rounded-full active:scale-95 transition-all duration-200"
                                      style={{ background: 'linear-gradient(135deg, #6EC8FF, #36B3FF)', boxShadow: '0 4px 16px rgba(110,200,255,0.35)' }}
                                    >
                                      <BookOpen size={12} />
                                      Ler reflexão completa
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Divider */}
                              <div className="mx-5 h-px" style={{ background: 'rgba(198,169,149,0.2)' }} />

                              {/* Comentário */}
                              <div className="px-5 py-5">
                                {renderComment(maxim, 'text-[14px]')}
                              </div>

                              {/* Ações */}
                              {!isGuest && (
                                <div className="px-5 pb-5 flex items-center gap-2.5">
                                  {!readDays.has(maxim.dayNumber) ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markDayAsRead(maxim.dayNumber);
                                        mixpanel.track('Diario Estoico: Marked As Read', { day_number: maxim.dayNumber, is_guest: !user, method: 'button' });
                                      }}
                                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-[12px] font-semibold text-white rounded-full active:scale-95 transition-all duration-200"
                                      style={{ background: 'linear-gradient(135deg, #6EC8FF, #36B3FF)' }}
                                    >
                                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M13.5 4L6 11.5L2.5 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                      Marcar como lida
                                    </button>
                                  ) : (
                                    <div className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-[12px] font-medium rounded-full"
                                      style={{ background: 'rgba(198,169,149,0.1)', color: '#A7846C', border: '1px solid rgba(198,169,149,0.3)' }}>
                                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M13.5 4L6 11.5L2.5 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                      Lida ✓
                                    </div>
                                  )}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setShareModalMaxim(maxim); mixpanel.track('Diario Estoico: Share Opened', { day_number: maxim.dayNumber, is_guest: !user }); }}
                                    className="flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-medium text-eco-muted rounded-full transition-all duration-200 hover:text-eco-text"
                                    style={{ background: 'rgba(232,227,221,0.5)', border: '1px solid rgba(232,227,221,0.7)' }}
                                  >
                                    <Share2 size={12} />
                                    Partilhar
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Seção expandida — DESKTOP ONLY */}
                  {monthMaxims.map((maxim) => {
                    const isExpanded = expandedCards.has(maxim.dayNumber);
                    const isGuest = isGuestMode && !user && !isVipUser;
                    if (!isExpanded) return null;

                    const commentParagraphs = maxim.comment
                      ? maxim.comment.split('\n\n').filter(Boolean)
                      : [];

                    return (
                      <div
                        key={`desktop-expanded-${maxim.dayNumber}`}
                        className="hidden md:block mt-5 rounded-2xl overflow-hidden"
                        style={{
                          animation: 'slideUpFade 0.3s ease-out',
                          background: 'linear-gradient(to bottom, #FFFFFF, #FAF9F7)',
                          border: '1px solid rgba(198,169,149,0.25)',
                          boxShadow: '0 8px 40px rgba(0,0,0,0.06)',
                        }}
                      >
                        {/* Linha acento decorativo no topo */}
                        <div className="h-[3px] w-full"
                          style={{ background: 'linear-gradient(90deg, rgba(198,169,149,0.4), rgba(198,169,149,0.1), transparent)' }} />

                        {/* Citação — foco principal */}
                        <div className="px-12 pt-10 pb-8 text-center"
                          style={{ borderBottom: '1px solid rgba(198,169,149,0.15)' }}>
                          <p className="text-[9px] font-bold tracking-[0.3em] uppercase mb-8"
                            style={{ color: '#C6A995' }}>
                            {maxim.author}{maxim.source && ` · ${maxim.source}`}
                          </p>
                          {/* Aspas decorativas grandes */}
                          <div className="font-display text-[5rem] leading-none mb-0 -mb-4"
                            style={{ color: 'rgba(198,169,149,0.18)', lineHeight: '0.8' }}>"</div>
                          <blockquote
                            className="font-display leading-[1.7] text-eco-text italic max-w-lg mx-auto relative z-10"
                            style={{ fontSize: 'clamp(1.15rem, 2.2vw, 1.55rem)' }}
                          >
                            {maxim.text}
                          </blockquote>
                        </div>

                        {/* Comentário */}
                        <div className="px-12 py-9">
                          <div className="max-w-lg mx-auto">
                            <p className="text-[9px] font-bold tracking-[0.28em] uppercase mb-6"
                              style={{ color: '#C6A995' }}>
                              Comentário
                            </p>

                            {!user ? (
                              <>
                                <div className="relative overflow-hidden" style={{ maxHeight: '110px' }}>
                                  <p className="font-primary text-[15px] leading-[1.9] text-eco-text">
                                    {commentParagraphs[0] ?? maxim.comment}
                                  </p>
                                  <div
                                    className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
                                    style={{ background: 'linear-gradient(to top, #FAF9F7 0%, transparent 100%)' }}
                                  />
                                </div>
                                <div className="mt-7 flex flex-col items-center gap-3">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      mixpanel.track('Guest Reflection Teaser CTA Clicked', { reflection_id: `${maxim.month}-${maxim.dayNumber}`, action: 'login' });
                                      navigate('/login?returnTo=/app/diario-estoico');
                                    }}
                                    className="inline-flex items-center gap-2 px-8 py-3 font-primary font-semibold text-sm text-white rounded-full active:scale-95 transition-all duration-200"
                                    style={{ background: 'linear-gradient(135deg, #6EC8FF, #36B3FF)', boxShadow: '0 4px 18px rgba(110,200,255,0.38)' }}
                                  >
                                    Entrar para ler →
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      mixpanel.track('Guest Reflection Teaser CTA Clicked', { reflection_id: `${maxim.month}-${maxim.dayNumber}`, action: 'register' });
                                      navigate('/register?returnTo=/app/diario-estoico');
                                    }}
                                    className="inline-flex items-center gap-2 px-6 py-2 font-primary font-medium text-sm rounded-full active:scale-95 transition-all duration-200"
                                    style={{ border: '1px solid rgba(110,200,255,0.5)', color: '#36B3FF' }}
                                  >
                                    Criar conta grátis
                                  </button>
                                </div>
                              </>
                            ) : (
                              <div className="space-y-5">
                                {commentParagraphs.length > 0
                                  ? commentParagraphs.map((para, i) => (
                                      <p key={i} className="font-primary text-[15px] leading-[1.95] text-eco-text">
                                        {para}
                                      </p>
                                    ))
                                  : (
                                      <p className="font-primary text-[15px] leading-[1.95] text-eco-text">
                                        {maxim.comment}
                                      </p>
                                    )
                                }
                              </div>
                            )}

                            {!isGuest && user && (
                              <div className="mt-9 flex justify-center">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setReadingModeMaxim(maxim); mixpanel.track('Diario Estoico: Reading Mode Opened', { day_number: maxim.dayNumber, is_guest: !user }); }}
                                  className="inline-flex items-center gap-2 px-8 py-3 text-sm font-semibold text-white rounded-full active:scale-95 transition-all duration-200"
                                  style={{ background: 'linear-gradient(135deg, #6EC8FF, #36B3FF)', boxShadow: '0 4px 18px rgba(110,200,255,0.35)' }}
                                >
                                  <BookOpen size={14} />
                                  Ler reflexão completa
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Rodapé: ações */}
                        {!isGuest && (
                          <div className="px-12 pb-8 flex items-center gap-3"
                            style={{ borderTop: '1px solid rgba(198,169,149,0.12)', paddingTop: '20px' }}>
                            {!readDays.has(maxim.dayNumber) ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markDayAsRead(maxim.dayNumber);
                                  mixpanel.track('Diario Estoico: Marked As Read', { day_number: maxim.dayNumber, is_guest: !user, method: 'button' });
                                }}
                                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white rounded-full active:scale-95 transition-all duration-200"
                                style={{ background: 'linear-gradient(135deg, #6EC8FF, #36B3FF)' }}
                              >
                                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M13.5 4L6 11.5L2.5 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                Marcar como lida
                              </button>
                            ) : (
                              <div className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-full"
                                style={{ background: 'rgba(198,169,149,0.1)', color: '#A7846C', border: '1px solid rgba(198,169,149,0.3)' }}>
                                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M13.5 4L6 11.5L2.5 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                Reflexão concluída
                              </div>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); setShareModalMaxim(maxim); mixpanel.track('Diario Estoico: Share Opened', { day_number: maxim.dayNumber, is_guest: !user }); }}
                              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-eco-muted rounded-full transition-all duration-200 hover:text-eco-text"
                              style={{ background: 'rgba(232,227,221,0.5)', border: '1px solid rgba(232,227,221,0.8)' }}
                            >
                              <Share2 size={13} />
                              Compartilhar
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
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

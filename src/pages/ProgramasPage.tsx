import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Lock } from 'lucide-react';
import HomeHeader from '@/components/home/HomeHeader';
import { useProgram } from '@/contexts/ProgramContext';
import { usePremiumContent, useSubscriptionTier } from '@/hooks/usePremiumContent';
import { useAuth } from '@/contexts/AuthContext';
import UpgradeModal from '@/components/subscription/UpgradeModal';
import { trackPremiumFeatureAttempted } from '@/lib/mixpanelConversionEvents';
import mixpanel from '@/lib/mixpanel';
import {
  canAccessMeditation,
  getRequiredTier,
  getUpgradeMessage,
  MEDITATION_TIER_MAP,
} from '@/constants/meditationTiers';

interface Meditation {
  id: string;
  title: string;
  description: string;
  duration: string;
  durationMinutes?: number; // Para tier logic
  audioUrl?: string;
  image: string;
  imagePosition?: string;
  gradient: string;
  isPremium: boolean;
  category: string;
}

export default function ProgramasPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { startProgram } = useProgram();
  const { checkAccess, requestUpgrade, showUpgradeModal, setShowUpgradeModal } = usePremiumContent();
  const tier = useSubscriptionTier();
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');

  // Meditações (mesmas do HomePage)
  const meditations: Meditation[] = useMemo(() => [
    {
      id: 'blessing_9',
      title: 'Quem Pensa Enriquece',
      description: 'Transforme seu mindset financeiro',
      duration: '25 min',
      durationMinutes: 25,
      image: 'url("/images/quem-pensa-enriquece.webp")',
      gradient: 'linear-gradient(to bottom, #1E3A5F 0%, #2C5282 20%, #3B6BA5 40%, #4A84C8 60%, #5A9DEB 80%, #6BB6FF 100%)',
      isPremium: true, // PREMIUM: 25 min
      category: 'Programas',
    },
    {
      id: 'blessing_1',
      title: 'Meditação Bênção dos centros de energia',
      description: 'Equilibre e ative seus centros energéticos',
      duration: '7 min',
      audioUrl: '/audio/energy-blessings-meditation.mp3',
      image: 'url("/images/meditacao-bencao-energia.webp")',
      imagePosition: 'center 32%',
      gradient: 'linear-gradient(to bottom, #F5C563 0%, #F5A84D 15%, #F39439 30%, #E67E3C 45%, #D95B39 60%, #C74632 80%, #A63428 100%)',
      isPremium: false,
      category: 'Dr. Joe Dispenza',
    },
    {
      id: 'blessing_2',
      title: 'Meditação para sintonizar novos potenciais',
      description: 'Alinhe-se com novas possibilidades',
      duration: '7 min',
      audioUrl: '/audio/sintonizar-novos-potenciais.mp3',
      image: 'url("/images/meditacao-novos-potenciais.webp")',
      imagePosition: 'center 32%',
      gradient: 'linear-gradient(to bottom, #4A7FCC 0%, #3D6BB8 20%, #3358A3 40%, #2A478E 60%, #213779 80%, #182864 100%)',
      isPremium: false,
      category: 'Dr. Joe Dispenza',
    },
    {
      id: 'blessing_3',
      title: 'Meditação para recondicionar o corpo a uma nova mente',
      description: 'Transforme padrões mentais e físicos',
      duration: '7 min',
      audioUrl: '/audio/recondicionar-corpo-nova-mente.mp3',
      image: 'url("/images/meditacao-recondicionar.webp")',
      imagePosition: 'center 32%',
      gradient: 'linear-gradient(to bottom, #9B79C9 0%, #8766B5 20%, #7454A0 40%, #61438C 60%, #4E3377 80%, #3B2463 100%)',
      isPremium: false,
      category: 'Dr. Joe Dispenza',
    },
    {
      id: 'blessing_4',
      title: 'Programa de Meditação do Caleidoscópio e Mind Movie',
      description: 'Visualize e crie novas realidades internas',
      duration: '22 min',
      durationMinutes: 22,
      image: 'url("/images/caleidoscopio-mind-movie.webp")',
      imagePosition: 'center center',
      gradient: 'linear-gradient(to bottom, #B494D4 0%, #A07DC4 20%, #8D67B5 40%, #7A52A6 60%, #673E97 80%, #542B88 100%)',
      isPremium: true,
      category: 'Dr. Joe Dispenza',
    },
    {
      id: 'blessing_5',
      title: 'Meditação caminhando',
      description: 'Pratique presença em movimento',
      duration: '5 min',
      audioUrl: '/audio/meditacao-caminhando.mp3',
      image: 'url("/images/meditacao-caminhando.webp")',
      imagePosition: 'center 15%',
      gradient: 'linear-gradient(to bottom right, #FF8C42 0%, #F7931E 20%, #D8617A 40%, #8B3A62 60%, #6B2C5C 80%, #2D1B3D 100%)',
      isPremium: false,
      category: 'Dr. Joe Dispenza',
    },
    {
      id: 'blessing_6',
      title: 'Meditação espaço-tempo, tempo-espaço',
      description: 'Transcenda as limitações dimensionais',
      duration: '5 min',
      audioUrl: '/audio/meditacao-espaco-tempo.mp3',
      image: 'url("/images/meditacao-espaco-tempo.webp")',
      imagePosition: 'center 32%',
      gradient: 'linear-gradient(to bottom, #FCD670 0%, #FBCA5D 15%, #F7B84A 30%, #F39A3C 45%, #EC7D2E 60%, #E26224 75%, #D7491F 90%, #C43520 100%)',
      isPremium: false,
      category: 'Dr. Joe Dispenza',
    },
    {
      id: 'blessing_7',
      title: 'Introdução à Meditação',
      description: 'Seus primeiros passos na prática meditativa',
      duration: '8 min',
      audioUrl: '/audio/introducao-meditacao.mp3',
      image: 'url("/images/meditacao-introducao.webp")',
      imagePosition: 'center 32%',
      gradient: 'linear-gradient(to bottom, #6EC1E4 0%, #5AB3D9 20%, #4AA5CE 40%, #3B96C3 60%, #2D88B8 80%, #1F7BAD 100%)',
      isPremium: false,
      category: 'Introdução',
    },
    {
      id: 'blessing_8',
      title: 'Meditação do Sono',
      description: 'Relaxe profundamente e tenha uma noite tranquila',
      duration: '15 min',
      durationMinutes: 15,
      audioUrl: '/audio/meditacao-sono.mp3',
      image: 'url("/images/meditacao-sono-new.webp")',
      imagePosition: 'center 32%',
      gradient: 'linear-gradient(to bottom, #4A4E8A 0%, #3E4277 20%, #333665 40%, #282B52 60%, #1E2140 80%, #14172E 100%)',
      isPremium: true, // PREMIUM: 15 min
      category: 'Sono',
    },
    {
      id: 'blessing_10',
      title: 'Acolhendo sua respiração',
      description: 'Encontre presença e calma através da sua respiração',
      duration: '7 min',
      audioUrl: '/audio/acolhendo-respiracao.mp3',
      image: 'url("/images/acolhendo-respiracao.png")',
      imagePosition: 'center center',
      gradient: 'linear-gradient(to bottom, #7BBFB5 0%, #5FA89E 20%, #459188 40%, #2E7A70 60%, #1A6358 80%, #084D42 100%)',
      isPremium: false,
      category: 'Respiração',
    },
  ], []);

  const categories = [
    'Todas',
    'Primeiros Passos',
    'Transformação Pessoal',
    'Energia e Vitalidade',
    'Manifestação',
    'Sono e Relaxamento',
  ];

  // Organizar meditações por objetivos
  const meditationsByCategory = useMemo(() => {
    const primeiroPassos = meditations.filter(m =>
      m.id === 'blessing_7' // Introdução à Meditação
    );

    const transformacao = meditations.filter(m =>
      m.id === 'blessing_3' || // Recondicionar o corpo
      m.id === 'blessing_9'    // Quem Pensa Enriquece
    );

    const energia = meditations.filter(m =>
      m.id === 'blessing_1' || // Bênção dos centros
      m.id === 'blessing_6' || // Espaço-tempo
      m.id === 'blessing_10'   // Acolhendo sua respiração
    );

    const manifestacao = meditations.filter(m =>
      m.id === 'blessing_2' || // Sintonizar novos potenciais
      m.id === 'blessing_4'    // Caleidoscópio
    );

    const sono = meditations.filter(m =>
      m.id === 'blessing_8' || // Meditação do Sono
      m.id === 'blessing_5'    // Meditação caminhando
    );

    if (selectedCategory === 'Todas') {
      return {
        'Primeiros Passos': primeiroPassos,
        'Transformação Pessoal': transformacao,
        'Energia e Vitalidade': energia,
        'Manifestação': manifestacao,
        'Sono e Relaxamento': sono,
      };
    }

    // Filtrar por categoria selecionada
    switch (selectedCategory) {
      case 'Primeiros Passos':
        return { [selectedCategory]: primeiroPassos };
      case 'Transformação Pessoal':
        return { [selectedCategory]: transformacao };
      case 'Energia e Vitalidade':
        return { [selectedCategory]: energia };
      case 'Manifestação':
        return { [selectedCategory]: manifestacao };
      case 'Sono e Relaxamento':
        return { [selectedCategory]: sono };
      default:
        return {};
    }
  }, [meditations, selectedCategory]);

  // Helper para verificar se meditação está locked
  const isMeditationLocked = (meditation: Meditation): boolean => {
    // Usar helper centralizado de tiers
    const hasAccess = canAccessMeditation(meditation.id, tier);
    return !hasAccess;
  };

  const handleMeditationClick = (meditationId: string) => {
    const meditation = meditations.find(m => m.id === meditationId);

    // ESSENTIALS TIER: Bloquear meditações 15min+ (apenas até 15min)
    if (tier === 'essentials' && meditation?.durationMinutes && meditation.durationMinutes >= 15) {
      // Track tentativa de acesso a feature premium
      trackPremiumFeatureAttempted({
        feature_id: meditationId,
        feature_name: meditation.title,
        context: 'meditation_library',
        is_premium_user: false,
        user_id: user?.id,
      });

      mixpanel.track('Meditation Premium Clicked', {
        meditation_id: meditationId,
        meditation_title: meditation.title,
        duration_minutes: meditation.durationMinutes,
        user_tier: tier,
        is_locked: true,
        user_id: user?.id,
      });

      requestUpgrade('meditation_premium_locked');
      return;
    }

    // Verificar se é premium e mostrar modal para free tier
    if (meditation?.isPremium) {
      const { hasAccess } = checkAccess(true);

      if (!hasAccess) {
        // Track tentativa de acesso a feature premium
        trackPremiumFeatureAttempted({
          feature_id: meditationId,
          feature_name: meditation.title,
          context: 'meditation_library',
          is_premium_user: false,
          user_id: user?.id,
        });

        mixpanel.track('Meditation Premium Clicked', {
          meditation_id: meditationId,
          meditation_title: meditation.title,
          duration_minutes: meditation.durationMinutes,
          user_tier: tier,
          is_locked: true,
          user_id: user?.id,
        });

        requestUpgrade('programas_' + meditationId);
        return;
      }
    }

    // Track acesso bem-sucedido a meditação
    mixpanel.track('Meditation Started', {
      meditation_id: meditationId,
      meditation_title: meditation?.title,
      duration_minutes: meditation?.durationMinutes,
      user_tier: tier,
      is_premium: meditation?.isPremium || false,
      user_id: user?.id,
    });

    // Quem Pensa Enriquece - navega para sua própria página
    if (meditationId === 'blessing_9') {
      startProgram({
        id: 'rec_2', // ✅ ID CORRETO para sync com backend
        title: 'Quem Pensa Enriquece',
        description: 'Transforme seu mindset financeiro',
        currentLesson: 'Passo 1: Onde você está',
        progress: 0,
        duration: '25 min',
        startedAt: new Date().toISOString(),
        lastAccessedAt: new Date().toISOString(),
      });
      navigate('/app/riqueza-mental');
      return;
    }

    // Programa do Caleidoscópio navega para sua própria página
    if (meditationId === 'blessing_4') {
      navigate('/app/programas/caleidoscopio-mind-movie');
      return;
    }

    // Introdução à Meditação - navega para sua própria página
    if (meditationId === 'blessing_7') {
      navigate('/app/introducao-meditacao');
      return;
    }

    if (meditation) {
      navigate('/app/meditation-player', {
        state: {
          meditation: {
            title: meditation.title,
            duration: meditation.duration,
            audioUrl: meditation.audioUrl || '/audio/energy-blessings-meditation.mp3',
            imageUrl: meditation.image.replace('url("', '').replace('")', ''),
            backgroundMusic: 'Cristais',
            gradient: meditation.gradient
          }
        }
      });
    }
  };

  // Calcular estatísticas de acesso
  const totalMeditations = meditations.length;
  const accessibleMeditations = meditations.filter(m => canAccessMeditation(m.id, tier)).length;
  const lockedMeditations = totalMeditations - accessibleMeditations;

  return (
    <div className="min-h-screen bg-white">
      <HomeHeader />

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Título Explorar */}
        <h1 className="text-4xl sm:text-5xl font-display font-bold text-[#38322A] mb-6">
          Explorar
        </h1>

        {/* Banner informativo de tier - apenas para free/essentials */}
        {(tier === 'free' || tier === 'essentials') && lockedMeditations > 0 && (
          <div className="mb-6 rounded-2xl bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-900 mb-1">
                  {tier === 'free'
                    ? '📚 Você tem acesso a 6 meditações gratuitas'
                    : '✨ Plano Essentials: Meditações até 15 minutos'}
                </p>
                <p className="text-xs text-blue-800">
                  {accessibleMeditations} de {totalMeditations} meditações disponíveis •{' '}
                  {lockedMeditations} meditações premium bloqueadas
                </p>
              </div>
              <button
                onClick={() => {
                  mixpanel.track('Meditation Library Upgrade Banner Click', {
                    user_tier: tier,
                    accessible_count: accessibleMeditations,
                    locked_count: lockedMeditations,
                    user_id: user?.id,
                  });
                  requestUpgrade('meditation_library_banner');
                }}
                className="shrink-0 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-semibold rounded-full hover:from-blue-700 hover:to-purple-700 transition-all"
              >
                {tier === 'free' ? 'Ver Planos' : 'Upgrade Premium'}
              </button>
            </div>
          </div>
        )}

        {/* Tabs de Categorias */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-8">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`flex-shrink-0 rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                selectedCategory === category
                  ? 'bg-[#A7846C] text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Seções de Meditações */}
        {Object.entries(meditationsByCategory).map(([categoryName, categoryMeditations]) => (
          <div key={categoryName} className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-display font-semibold text-[#38322A]">
                {categoryName}
              </h2>
              <button className="text-sm text-[#A7846C] hover:underline">
                Ver todos
              </button>
            </div>

            {/* Grid de Cards de Meditação */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {categoryMeditations.map((meditation) => {
                const isLocked = isMeditationLocked(meditation);

                return (
                  <button
                    key={meditation.id}
                    onClick={() => handleMeditationClick(meditation.id)}
                    className={`group relative overflow-hidden rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.08)] transition-all duration-300 md:hover:scale-[0.98] md:hover:shadow-[0_2px_15px_rgba(0,0,0,0.06)] md:hover:translate-y-1 active:scale-95 cursor-pointer touch-manipulation ${
                      isLocked ? 'opacity-90' : ''
                    }`}
                    style={{
                      backgroundImage: meditation.image,
                      backgroundSize: 'cover',
                      backgroundPosition: meditation.imagePosition || 'center',
                      minHeight: '220px',
                      filter: isLocked ? 'grayscale(0.2)' : 'none',
                    }}
                  >
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

                    {/* Hover overlay - darken on hover */}
                    <div className="absolute inset-0 bg-black/0 md:group-hover:bg-black/20 transition-all duration-300" />

                    {/* Lock overlay para meditações locked */}
                    {isLocked && (
                      <div className="absolute inset-0 bg-black/10 backdrop-blur-[0.5px]" />
                    )}

                  {/* Content */}
                  <div className="relative flex h-full flex-col justify-between p-4 md:p-5">
                    {/* Top: Duration Badge and Category Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur-md">
                          <span className="text-[11px] font-medium text-white">
                            {meditation.duration}
                          </span>
                        </span>
                        {meditation.category && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur-md">
                            <span className="text-[11px] font-medium text-white">
                              {meditation.category}
                            </span>
                          </span>
                        )}
                      </div>
                      {meditation.isPremium && (
                        <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-2.5 py-1.5 backdrop-blur-md shadow-md">
                          {isLocked && <Lock size={12} className="text-white" />}
                          <span className="text-[10px] font-bold text-white tracking-wide">
                            {getRequiredTier(meditation.id).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Bottom: Title, Description, Play Button */}
                    <div className="flex items-end justify-between gap-4">
                      <div className="flex-1 text-left">
                        <h3 className="font-display text-base font-normal text-white drop-shadow-lg md:text-lg">
                          {meditation.title}
                        </h3>
                        <p className="mt-0.5 text-[12px] text-white/85 drop-shadow-md md:text-[13px]">
                          {meditation.description}
                        </p>
                      </div>

                      {/* Play Button - Circular Icon */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMeditationClick(meditation.id);
                        }}
                        className="shrink-0 flex items-center justify-center rounded-full bg-white/85 p-3 shadow-lg transition-all duration-300 md:hover:bg-white active:scale-95 touch-manipulation backdrop-blur-md"
                      >
                        <Play size={18} className="fill-black text-black ml-0.5" />
                      </button>
                    </div>
                  </div>
                </button>
              );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer com estatísticas - apenas para free/essentials */}
      {(tier === 'free' || tier === 'essentials') && (
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">
              Você desbloqueou <span className="font-bold text-gray-900">{accessibleMeditations}</span> de{' '}
              <span className="font-bold text-gray-900">{totalMeditations}</span> meditações
            </p>
            <div className="w-full max-w-md mx-auto bg-gray-200 rounded-full h-2 mb-4">
              <div
                className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(accessibleMeditations / totalMeditations) * 100}%` }}
              />
            </div>
            <button
              onClick={() => {
                mixpanel.track('Meditation Footer Upgrade Click', {
                  user_tier: tier,
                  accessible_count: accessibleMeditations,
                  locked_count: lockedMeditations,
                  user_id: user?.id,
                });
                requestUpgrade('meditation_library_footer');
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-full hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
            >
              <Lock size={16} />
              Desbloquear todas as {lockedMeditations} meditações premium
            </button>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        source="programas"
      />
    </div>
  );
}

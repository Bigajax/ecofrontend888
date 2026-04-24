import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
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
  MEDITATION_TIER_MAP,
} from '@/constants/meditationTiers';

interface Meditation {
  id: string;
  title: string;
  description: string;
  duration: string;
  durationMinutes?: number;
  audioUrl?: string;
  image: string;
  imagePosition?: string;
  gradient: string;
  isPremium: boolean;
  category: string;
}

const cardVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 80, damping: 20 } },
};

export default function ProgramasPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { startProgram } = useProgram();
  const { requestUpgrade, showUpgradeModal, setShowUpgradeModal } = usePremiumContent();
  const tier = useSubscriptionTier();

  const meditations: Meditation[] = useMemo(() => [
    {
      id: 'blessing_9',
      title: 'Quem Pensa Enriquece',
      description: 'Transforme seu mindset financeiro',
      duration: '25 min',
      durationMinutes: 25,
      image: 'url("/images/quem-pensa-enriquece.webp")',
      gradient: 'linear-gradient(to bottom, #1E3A5F 0%, #2C5282 20%, #3B6BA5 40%, #4A84C8 60%, #5A9DEB 80%, #6BB6FF 100%)',
      isPremium: true,
      category: 'Programas',
    },
    {
      id: 'blessing_1',
      title: 'Meditação Bênção dos centros de energia',
      description: 'Equilibre e ative seus centros energéticos',
      duration: '7 min',
      audioUrl: '/audio/bencao-centros-energia.mp3',
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
      duration: '5 min',
      audioUrl: '/audio/sintonizar-novos-potenciais-v3.mp3',
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
      audioUrl: '/audio/recondicione-corpo-mente.mp3',
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
      audioUrl: '/audio/meditacao-caminhando-nova.mp3',
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
      audioUrl: '/audio/espaco-tempo-completa.mp3',
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
      isPremium: true,
      category: 'Sono',
    },
    {
      id: 'blessing_10',
      title: 'Acolhendo sua respiração',
      description: 'Encontre presença e calma através da sua respiração',
      duration: '7 min',
      audioUrl: '/audio/acolhendo-respiracao.mp3',
      image: 'url("/images/acolhendo-respiracao.webp")',
      imagePosition: 'center center',
      gradient: 'linear-gradient(to bottom, #7BBFB5 0%, #5FA89E 20%, #459188 40%, #2E7A70 60%, #1A6358 80%, #084D42 100%)',
      isPremium: false,
      category: 'Respiração',
    },
    {
      id: 'blessing_11',
      title: 'Liberando o Estresse',
      description: 'Solte as tensões do dia e restaure sua paz interior',
      duration: '5 min',
      audioUrl: '/audio/liberando-estresse.mp3',
      image: 'url("/images/liberando-estresse.png")',
      imagePosition: 'center center',
      gradient: 'linear-gradient(to bottom, #C4A0E8 0%, #A877D6 20%, #8855C4 40%, #6B40A8 60%, #4F2B8C 80%, #341870 100%)',
      isPremium: false,
      category: 'Relaxamento',
    },
  ], []);

  const sections = useMemo(() => [
    {
      title: 'Comece Aqui',
      subtitle: 'O primeiro passo é o mais importante.',
      meditations: meditations.filter(m => m.id === 'blessing_7'),
    },
    {
      title: 'Transforme sua Mente',
      subtitle: 'Reprograme crenças e padrões limitantes.',
      meditations: meditations.filter(m => m.id === 'blessing_3' || m.id === 'blessing_9'),
    },
    {
      title: 'Energize e Manifeste',
      subtitle: 'Ative sua energia e alinhe seu propósito.',
      meditations: meditations.filter(m =>
        m.id === 'blessing_1' || m.id === 'blessing_2' ||
        m.id === 'blessing_6' || m.id === 'blessing_4'
      ),
    },
    {
      title: 'Alivie e Acalme',
      subtitle: 'Solte o que o dia deixou acumulado.',
      meditations: meditations.filter(m =>
        m.id === 'blessing_5' || m.id === 'blessing_10' || m.id === 'blessing_11'
      ),
    },
    {
      title: 'Para Dormir',
      subtitle: 'Prepare o corpo e a mente para um descanso profundo.',
      meditations: meditations.filter(m => m.id === 'blessing_8'),
    },
  ], [meditations]);

  const isMeditationLocked = (meditation: Meditation): boolean =>
    !canAccessMeditation(meditation.id, tier);

  const handleMeditationClick = (meditationId: string) => {
    const meditation = meditations.find(m => m.id === meditationId);

    if (!canAccessMeditation(meditationId, tier)) {
      trackPremiumFeatureAttempted({
        feature_id: meditationId,
        feature_name: meditation?.title ?? meditationId,
        context: 'meditation_library',
        is_premium_user: false,
        user_id: user?.id,
      });
      mixpanel.track('Meditation Premium Clicked', {
        meditation_id: meditationId,
        meditation_title: meditation?.title,
        duration_minutes: meditation?.durationMinutes,
        required_tier: getRequiredTier(meditationId),
        user_tier: tier,
        is_locked: true,
        user_id: user?.id,
      });
      requestUpgrade('programas_' + meditationId);
      return;
    }

    mixpanel.track('Meditation Started', {
      meditation_id: meditationId,
      meditation_title: meditation?.title,
      duration_minutes: meditation?.durationMinutes,
      user_tier: tier,
      required_tier: getRequiredTier(meditationId),
      user_id: user?.id,
    });

    if (meditationId === 'blessing_9') {
      startProgram({
        id: 'rec_2',
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
    if (meditationId === 'blessing_4') {
      navigate('/app/programas/caleidoscopio-mind-movie');
      return;
    }
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
            audioUrl: meditation.audioUrl || '/audio/bencao-centros-energia.mp3',
            imageUrl: meditation.image.replace('url("', '').replace('")', ''),
            backgroundMusic: 'Cristais',
            gradient: meditation.gradient,
          },
        },
      });
    }
  };

  const totalMeditations = meditations.length;
  const accessibleMeditations = meditations.filter(m => canAccessMeditation(m.id, tier)).length;
  const lockedMeditations = totalMeditations - accessibleMeditations;

  return (
    <div
      className="min-h-screen pb-20 md:pb-0"
      style={{ background: '#FFFFFF' }}
    >
      <HomeHeader />

      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">

        {/* ── Page Header ── */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 70, damping: 20 }}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: '#0A6BBF' }}>
            Biblioteca
          </p>
          <h1 className="font-display text-[38px] sm:text-[48px] font-bold leading-tight" style={{ color: '#0D3461' }}>
            Explorar
          </h1>
          <p className="mt-2 text-[16px]" style={{ color: '#5A8AAD' }}>
            Escolha sua jornada de hoje.
          </p>
        </motion.div>

        {/* ── Upgrade Banner ── */}
        {(tier === 'free' || tier === 'essentials') && lockedMeditations > 0 && (
          <motion.div
            className="mb-10 relative overflow-hidden rounded-3xl"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 70, damping: 20 }}
            style={{
              background: 'linear-gradient(135deg, #07192E 0%, #0D2E4F 40%, #103A62 70%, #0F4476 100%)',
              boxShadow: '0 16px 48px rgba(7,25,46,0.35), 0 4px 16px rgba(110,200,255,0.10)',
            }}
          >
            {/* Glow orb */}
            <div className="pointer-events-none absolute" style={{ top: '-50px', right: '-30px', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(110,200,255,0.16) 0%, transparent 65%)' }} />
            <div className="relative z-10 flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:gap-6 md:px-8">
              <div className="flex-1">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#A8DEFF]/80 mb-1.5">
                  {tier === 'free' ? 'Plano Gratuito' : 'Plano Essentials'}
                </p>
                <p className="font-display text-[18px] font-semibold text-white leading-snug">
                  {tier === 'free'
                    ? `Você tem acesso a ${accessibleMeditations} meditações gratuitas`
                    : `${accessibleMeditations} de ${totalMeditations} meditações disponíveis`}
                </p>
                <p className="mt-1 text-[13px] text-white/55">
                  {lockedMeditations} meditações premium esperando por você
                </p>
              </div>
              <button
                onClick={() => {
                  mixpanel.track('Meditation Library Upgrade Banner Click', { user_tier: tier, user_id: user?.id });
                  requestUpgrade('meditation_library_banner');
                }}
                className="flex-shrink-0 inline-flex items-center gap-2 rounded-full px-5 py-3 text-[14px] font-bold transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ background: 'rgba(110,200,255,0.20)', border: '1px solid rgba(110,200,255,0.38)', color: '#E8F7FF', backdropFilter: 'blur(8px)' }}
              >
                {tier === 'free' ? 'Ver Planos' : 'Upgrade Premium'}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </button>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(110,200,255,0.28), transparent)' }} />
          </motion.div>
        )}

        {/* ── Sections ── */}
        {sections.map((section, sectionIdx) => (
          <div key={section.title} className="mb-12">
            {/* Section header */}
            <motion.div
              className="mb-5 flex items-end justify-between"
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ type: 'spring', stiffness: 80, damping: 20, delay: sectionIdx * 0.04 }}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1.5 w-1 h-6 rounded-full flex-shrink-0" style={{ background: 'linear-gradient(180deg, #1A4FB5, #0D3461)' }} />
                <div>
                  <h2 className="font-display text-[22px] font-bold leading-tight" style={{ color: '#0D3461' }}>
                    {section.title}
                  </h2>
                  <p className="mt-0.5 text-[13px]" style={{ color: '#5A8AAD' }}>
                    {section.subtitle}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Cards scroll */}
            <motion.div
              className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory pl-0"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              variants={{ visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } }}
            >
              {section.meditations.map((meditation, idx) => {
                const isLocked = isMeditationLocked(meditation);
                const isLast = idx === section.meditations.length - 1;
                const isPremiumBadge = MEDITATION_TIER_MAP[meditation.id] !== 'free';

                return (
                  <motion.button
                    key={meditation.id}
                    variants={cardVariant}
                    onClick={() => handleMeditationClick(meditation.id)}
                    className={`group relative flex-shrink-0 snap-start overflow-hidden rounded-3xl text-left active:scale-[0.97] transition-all duration-200 touch-manipulation ${isLast ? 'mr-1' : ''}`}
                    style={{
                      width: '280px',
                      height: '230px',
                      backgroundImage: meditation.image,
                      backgroundSize: 'cover',
                      backgroundPosition: meditation.imagePosition || 'center',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)',
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {/* Image zoom on hover */}
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                      style={{
                        backgroundImage: meditation.image,
                        backgroundPosition: meditation.imagePosition || 'center',
                      }}
                    />

                    {/* Strong gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/38 to-black/08" />

                    {/* Lock blur */}
                    {isLocked && <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]" />}

                    {/* Content */}
                    <div className="relative flex h-full flex-col justify-between p-4">

                      {/* Top badges */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="inline-flex items-center rounded-full px-2.5 py-1 backdrop-blur-md"
                            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.22)' }}
                          >
                            <span className="text-[11px] font-semibold text-white">{meditation.duration}</span>
                          </span>
                          {meditation.category && (
                            <span
                              className="inline-flex items-center rounded-full px-2.5 py-1 backdrop-blur-md"
                              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}
                            >
                              <span className="text-[10px] font-bold uppercase tracking-wide text-white/90">{meditation.category}</span>
                            </span>
                          )}
                        </div>
                        {isPremiumBadge && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 flex-shrink-0 backdrop-blur-md"
                            style={{ background: isLocked ? 'rgba(167,139,250,0.30)' : 'rgba(167,139,250,0.22)', border: '1px solid rgba(167,139,250,0.40)' }}
                          >
                            {isLocked && <Lock size={10} className="text-white" />}
                            <span className="text-[10px] font-bold uppercase tracking-wide text-white">
                              {getRequiredTier(meditation.id).toUpperCase()}
                            </span>
                          </span>
                        )}
                      </div>

                      {/* Bottom: title + play */}
                      <div className="flex items-end justify-between gap-3">
                        <div className="flex-1 text-left">
                          <h3 className="font-display text-[17px] font-bold leading-snug text-white drop-shadow-lg line-clamp-2">
                            {meditation.title}
                          </h3>
                          <p className="mt-1 text-[12px] text-white/70 line-clamp-1">
                            {meditation.description}
                          </p>
                        </div>

                        {/* Premium play button */}
                        <div
                          className="flex-shrink-0 flex items-center justify-center rounded-full transition-all duration-300 group-hover:scale-110 active:scale-95"
                          style={{
                            width: '44px',
                            height: '44px',
                            background: isLocked
                              ? 'rgba(255,255,255,0.18)'
                              : 'rgba(255,255,255,0.92)',
                            backdropFilter: 'blur(8px)',
                            boxShadow: isLocked ? 'none' : '0 4px 16px rgba(0,0,0,0.20)',
                          }}
                        >
                          {isLocked
                            ? <Lock size={16} className="text-white" />
                            : <Play size={18} className="fill-[#0D3461] text-[#0D3461] ml-0.5" />
                          }
                        </div>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          </div>
        ))}

        {/* ── Upgrade Footer Card ── */}
        {(tier === 'free' || tier === 'essentials') && (
          <motion.div
            className="mt-4 relative overflow-hidden rounded-3xl"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ type: 'spring', stiffness: 70, damping: 20 }}
            style={{
              background: 'linear-gradient(135deg, #07192E 0%, #0D2E4F 40%, #103A62 70%, #0F4476 100%)',
              boxShadow: '0 20px 60px rgba(7,25,46,0.40), 0 4px 16px rgba(110,200,255,0.10)',
            }}
          >
            <div className="pointer-events-none absolute" style={{ top: '-60px', right: '-40px', width: '260px', height: '260px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(110,200,255,0.16) 0%, transparent 65%)' }} />
            <div className="pointer-events-none absolute" style={{ bottom: '-60px', left: '-20px', width: '180px', height: '180px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(75,174,232,0.10) 0%, transparent 65%)' }} />

            <div className="relative z-10 px-6 py-8 md:px-8 md:py-10 flex flex-col items-center text-center gap-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6EC8FF]/70">
                Acesso Completo
              </p>
              <h3 className="font-display text-[24px] sm:text-[28px] font-bold text-white leading-snug max-w-sm">
                Desbloqueie as {lockedMeditations} meditações premium
              </h3>
              <p className="text-[14px] text-white/55 max-w-xs">
                Todas as jornadas, sem limites de tempo, a qualquer momento.
              </p>

              {/* Progress bar */}
              <div className="w-full max-w-xs">
                <div className="flex justify-between mb-2">
                  <span className="text-[12px] text-white/50">{accessibleMeditations} desbloqueadas</span>
                  <span className="text-[12px] text-white/50">{totalMeditations} total</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.12)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${(accessibleMeditations / totalMeditations) * 100}%`,
                      background: 'linear-gradient(90deg, #6EC8FF, #4BAEE8)',
                    }}
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  mixpanel.track('Meditation Footer Upgrade Click', { user_tier: tier, user_id: user?.id });
                  requestUpgrade('meditation_library_footer');
                }}
                className="inline-flex items-center gap-2.5 rounded-full px-7 py-3.5 text-[15px] font-bold text-[#07192E] transition-all duration-200 hover:scale-105 active:scale-95 mt-1"
                style={{ background: 'linear-gradient(135deg, #C4B5FD 0%, #1A4FB5 100%)', boxShadow: '0 6px 24px rgba(26,79,181,0.30)' }}
              >
                <Lock size={16} />
                Desbloquear tudo
              </button>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(110,200,255,0.28), transparent)' }} />
          </motion.div>
        )}
      </div>

      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        source="programas"
      />
    </div>
  );
}

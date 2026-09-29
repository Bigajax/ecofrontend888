import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import HomeHeader from '@/components/home/HomeHeader';
import ReinoChegada from '@/components/reino/ReinoChegada';
import { PincelProgresso } from '@/components/reino/ReinoScene';
import { getReinoMood } from '@/components/reino/reinoMood';
import { useProgram } from '@/contexts/ProgramContext';
import { usePremiumContent, useSubscriptionTier } from '@/hooks/usePremiumContent';
import { useAuth } from '@/contexts/AuthContext';
import UpgradeModal from '@/components/subscription/UpgradeModal';
import { trackPremiumFeatureAttempted } from '@/lib/mixpanelConversionEvents';
import mixpanel from '@/lib/mixpanel';
import {
  canAccessMeditation,
  getRequiredTier,
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

export default function ProgramasPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { startProgram, ongoingProgram, resumeProgram } = useProgram();
  const { requestUpgrade, showUpgradeModal, setShowUpgradeModal } = usePremiumContent();
  const tier = useSubscriptionTier();

  const meditations: Meditation[] = useMemo(() => [
    {
      id: 'blessing_9',
      title: 'Quem Pensa Enriquece',
      description: 'Transforme seu mindset financeiro',
      duration: '25 min',
      durationMinutes: 25,
      image: 'url("/images/reino/capa-quem-pensa.webp")',
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
      image: 'url("/images/reino/portico-800.webp")',
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
      image: 'url("/images/reino/vale-800.webp")',
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
      image: 'url("/images/reino/capa-desperte.webp")',
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
      image: 'url("/images/reino/capa-visualize.webp")',
      imagePosition: 'center 62%',
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
      image: 'url("/images/reino/trilhas-800.webp")',
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
      image: 'url("/images/reino/capa-mente-quieta.webp")',
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
      image: 'url("/images/reino/capa-primeiros-passos.webp")',
      imagePosition: 'center 32%',
      gradient: 'linear-gradient(to bottom, #6EC1E4 0%, #1C2350 20%, #4AA5CE 40%, #3B96C3 60%, #2D88B8 80%, #1F7BAD 100%)',
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
      image: 'url("/images/reino/capa-adormeca.webp")',
      imagePosition: 'center 60%',
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
      image: 'url("/images/reino/capa-respire.webp")',
      imagePosition: '35% 55%',
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
      image: 'url("/images/reino/capa-solte.webp")',
      imagePosition: 'center 62%',
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
      mixpanel.track('Meditação · Premium clicada', {
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

    mixpanel.track('Meditação · Iniciada', {
      meditation_id: meditationId,
      meditation_title: meditation?.title,
      duration_minutes: meditation?.durationMinutes,
      user_tier: tier,
      required_tier: getRequiredTier(meditationId),
      user_id: user?.id,
    });

    if (meditationId === 'blessing_9') {
      // Em andamento, só retoma: startProgram zerava o progresso e abria outra inscrição.
      if (ongoingProgram?.id === 'rec_2') {
        resumeProgram();
      } else {
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
      }
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

  const podeAssinar = tier === 'free' || tier === 'essentials';

  return (
    <div className="reino-corpo page-with-nav" style={{ minHeight: '100dvh' }}>
      <HomeHeader />

      <ReinoChegada
        mood={getReinoMood()}
        imagem="/images/reino/trilhas-800.webp"
        foco="60% 60%"
        lugar="TRI.04 · As Trilhas · a biblioteca"
        titulo="Todas as trilhas"
        sobre="Escolha a jornada de hoje. Cada caminho tem começo e chegada."
        voltar={{ rotulo: 'Voltar para o Mapa', onClick: () => navigate('/app/mapa') }}
      >
        {podeAssinar && lockedMeditations > 0 && (
          <div className="reino-nota" style={{ marginTop: 18, marginBottom: 0 }}>
            <p>
              {tier === 'free'
                ? `Você tem acesso a ${accessibleMeditations} meditações gratuitas. ${lockedMeditations} estão com os assinantes.`
                : `${accessibleMeditations} de ${totalMeditations} meditações disponíveis no seu plano.`}
            </p>
          </div>
        )}
      </ReinoChegada>

      <div className="reino-corpo__coluna">
        {sections.map((section) => (
          <section key={section.title} className="reino-corpo__secao" aria-label={section.title}>
            <h2 className="reino-corpo__titulo" style={{ fontSize: 28 }}>
              {section.title}
            </h2>
            <p className="reino-corpo__sobre">{section.subtitle}</p>
            <ul className="reino-estante">
              {section.meditations.map((meditation, idx) => {
                const isLocked = isMeditationLocked(meditation);
                return (
                  <li key={meditation.id}>
                    <button type="button" className="reino-capa" onClick={() => handleMeditationClick(meditation.id)}>
                      <img
                        src={meditation.image.replace('url("', '').replace('")', '')}
                        alt=""
                        loading="lazy"
                        className={idx % 2 ? 'reino-rasgo-b' : 'reino-rasgo-a'}
                        style={{ objectPosition: meditation.imagePosition || 'center' }}
                      />
                      <span className="reino-capa__meta">
                        {meditation.category ? `${meditation.category} · ` : ''}
                        {meditation.duration}
                        {isLocked ? ' · assinantes' : ''}
                      </span>
                      <span className="reino-capa__titulo">{meditation.title}</span>
                      <span className="reino-livro__sobre" style={{ fontSize: 14 }}>
                        {meditation.description}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        {podeAssinar && (
          <section className="reino-corpo__secao reino-convite" aria-labelledby="programas-convite">
            <p className="reino-rotulo">Acesso completo</p>
            <h2 id="programas-convite" className="reino-corpo__titulo">
              Desbloqueie as {lockedMeditations} meditações dos assinantes
            </h2>
            <p className="reino-corpo__sobre">Todas as jornadas, sem limite de tempo, a qualquer momento.</p>
            <div style={{ maxWidth: 360, marginTop: 14 }}>
              <PincelProgresso value={accessibleMeditations / totalMeditations} className="reino-sono__pincel" />
              <p className="reino-sono__contagem">
                {accessibleMeditations} de {totalMeditations} liberadas
              </p>
            </div>
            <button
              type="button"
              className="reino-placa"
              onClick={() => {
                mixpanel.track('Meditação · Footer upgrade clicado', { user_tier: tier, user_id: user?.id });
                requestUpgrade('meditation_library_footer');
              }}
            >
              Desbloquear tudo <span aria-hidden="true">→</span>
            </button>
          </section>
        )}
      </div>

      <UpgradeModal open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} source="programas" />
    </div>
  );
}

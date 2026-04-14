import { useState, useEffect, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Play, Check, ArrowLeft, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import HomeHeader from '@/components/home/HomeHeader';
import { useAuth } from '@/contexts/AuthContext';
import DrJoeDispenzaSkeleton from '@/components/DrJoeDispenzaSkeleton';
import { usePremiumContent } from '@/hooks/usePremiumContent';
import { useDrJoeEntitlement } from '@/hooks/useDrJoeEntitlement';
import DrJoeOfferModal from '@/components/drjoe/DrJoeOfferModal';
import {
  trackMeditationEvent,
  parseDurationToSeconds,
  type MeditationListViewedPayload,
  type MeditationSelectedPayload,
  type PremiumContentBlockedPayload,
} from '@/analytics/meditation';

// ── Paleta Dr. Joe Dispenza ────────────────────────────────────────────────
const BLUE       = '#9488C4';
const BLUE_SOFT  = 'rgba(148,136,196,0.12)';
const BLUE_BORDER = 'rgba(148,136,196,0.25)';

// ── Conteúdo "Saiba mais" por meditação ────────────────────────────────────
interface LearnMore {
  about: string;
  effect: string;
  note?: string;
  quote?: { text: string; author: string };
}
const LEARN_MORE: Record<string, LearnMore> = {
  blessing_2: {
    about: 'O cérebro opera em padrões fixos formados por anos de repetição. Esta meditação treina a mente para buscar possibilidades além da memória do passado.',
    effect: 'Reduz a atividade da rede de modo padrão — responsável pelos pensamentos automáticos — e ativa regiões associadas a criatividade, perspectiva e estados elevados.',
    quote: { text: 'Se você mantiver a mesma mente, criará o mesmo futuro.', author: 'Dr. Joe Dispenza' },
  },
  blessing_1: {
    about: 'Os centros de energia do corpo têm correlatos fisiológicos reais: plexos nervosos, glândulas endócrinas e campos eletromagnéticos mensuráveis.',
    effect: 'Direcionar atenção consciente para cada região ativa o sistema nervoso autônomo e começa a reorganizar a coerência eletromagnética do coração.',
    note: 'Calor, formigamento ou pulsação durante a prática são respostas normais — é o corpo respondendo à intenção.',
  },
  blessing_3: {
    about: 'Comportamentos repetidos criam conexões neurais automáticas que o corpo executa sem escolha consciente. Esta prática interrompe esses circuitos.',
    effect: 'Neuroplasticidade em ação: ao imaginar novos estados com emoção real, o cérebro começa a criar novas sinapses como se a experiência já tivesse acontecido.',
    note: 'Dr. Joe Dispenza conduziu estudos em mais de 15 países com mudanças mensuráveis no DNA, sistema imune e ondas cerebrais após práticas intensivas.',
  },
  blessing_5: {
    about: 'O movimento consciente integra o novo estado mental ao sistema nervoso motor — criando o que neurocientistas chamam de memória corporal.',
    effect: 'Caminhar com intenção específica ativa o córtex pré-frontal — região associada a autodireção e clareza — enquanto ancora o novo estado no corpo.',
  },
  blessing_6: {
    about: 'A mente analítica opera em tempo linear, o que limita o acesso a possibilidades além do que já foi vivido. Esta meditação treina o estado gama — a frequência mais alta registrada em meditadores avançados.',
    effect: 'Em estado de presença total, a percepção do tempo se dissolve. Pesquisas de Dr. Joe mostram correlação com mudanças epigenéticas — alterações reais na expressão do DNA.',
  },
};
// ────────────────────────────────────────────────────────────────────────────

interface Meditation {
  id: string;
  title: string;
  description: string;
  duration: string;
  audioUrl: string;
  image: string;
  imagePosition: string;
  gradient: string;
  completed: boolean;
  isPremium?: boolean;
  totalCompletions?: number;
}

const INITIAL_MEDITATIONS: Meditation[] = [
  {
    id: 'blessing_1',
    title: 'Bênção dos Centros de Energia',
    description: 'Ative seu corpo para um novo estado interno',
    duration: '7 min',
    audioUrl: '/audio/bencao-centros-energia.mp3',
    image: 'url("/images/meditacao-bencao-energia.webp")',
    imagePosition: 'center 32%',
    gradient: 'linear-gradient(to bottom, #F5C563 0%, #F5A84D 15%, #F39439 30%, #E67E3C 45%, #D95B39 60%, #C74632 80%, #A63428 100%)',
    completed: false,
  },
  {
    id: 'blessing_2',
    title: 'Sintonize Novos Potenciais',
    description: 'Acesse o campo de possibilidades além do seu passado',
    duration: '5 min',
    audioUrl: '/audio/sintonizar-novos-potenciais-v3.mp3',
    image: 'url("/images/meditacao-novos-potenciais.webp")',
    imagePosition: 'center 32%',
    gradient: 'linear-gradient(to bottom, #4A7FCC 0%, #3D6BB8 20%, #3358A3 40%, #2A478E 60%, #213779 80%, #182864 100%)',
    completed: false,
    isPremium: true,
  },
  {
    id: 'blessing_3',
    title: 'Recondicione Seu Corpo e Mente',
    description: 'O que você repete, vira padrão. Esta sessão interrompe o ciclo antigo.',
    duration: '7 min',
    audioUrl: '/audio/recondicione-corpo-mente.mp3',
    image: 'url("/images/meditacao-recondicionar.webp")',
    imagePosition: 'center 32%',
    gradient: 'linear-gradient(to bottom, #9B79C9 0%, #8766B5 20%, #7454A0 40%, #61438C 60%, #4E3377 80%, #3B2463 100%)',
    completed: false,
    isPremium: true,
  },
  {
    id: 'blessing_5',
    title: 'Meditação Caminhando',
    description: 'Para quando sentar não for suficiente. Leve a prática para o movimento.',
    duration: '5 min',
    audioUrl: '/audio/meditacao-caminhando-nova.mp3',
    image: 'url("/images/meditacao-caminhando.webp")',
    imagePosition: 'center 15%',
    gradient: 'linear-gradient(to bottom right, #FF8C42 0%, #F7931E 20%, #D8617A 40%, #8B3A62 60%, #6B2C5C 80%, #2D1B3D 100%)',
    completed: false,
    isPremium: true,
  },
  {
    id: 'blessing_6',
    title: 'Espaço-Tempo, Tempo-Espaço',
    description: 'A sessão mais profunda da jornada. Reserve um momento só seu.',
    duration: '5 min',
    audioUrl: '/audio/espaco-tempo-completa.mp3',
    image: 'url("/images/meditacao-espaco-tempo.webp")',
    imagePosition: 'center 32%',
    gradient: 'linear-gradient(to bottom, #FCD670 0%, #FBCA5D 15%, #F7B84A 30%, #F39A3C 45%, #EC7D2E 60%, #E26224 75%, #D7491F 90%, #C43520 100%)',
    completed: false,
    isPremium: true,
  },
];

// ── LearnMorePanel — definido fora do componente para evitar remount ─────────
function LearnMorePanel({
  id,
  open,
  onToggle,
}: {
  id: string;
  open: string | null;
  onToggle: (v: string | null) => void;
}) {
  const content = LEARN_MORE[id];
  if (!content) return null;
  const isOpen = open === id;

  return (
    <div className="mt-3 border-t border-white/[0.06] pt-3">
      {/* Trigger pill */}
      <button
        onClick={() => onToggle(isOpen ? null : id)}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 hover:-translate-y-px active:scale-95"
        style={{
          background: isOpen ? 'rgba(148,136,196,0.18)' : 'rgba(255,255,255,0.08)',
          border: isOpen ? '1px solid rgba(148,136,196,0.40)' : '1px solid rgba(255,255,255,0.14)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          color: 'rgba(255,255,255,0.90)',
        }}
      >
        Saiba mais
        <span
          className="text-[10px] leading-none transition-transform duration-300"
          style={{ display: 'inline-block', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          ↓
        </span>
      </button>

      {/* Painel — sempre no DOM, abre/fecha via CSS transition */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: isOpen ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.35s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div
            className="mt-3 space-y-4 rounded-2xl p-4 sm:p-5"
            style={{
              background: 'rgba(148,136,196,0.06)',
              border: '1px solid rgba(148,136,196,0.15)',
              opacity: isOpen ? 1 : 0,
              transform: isOpen ? 'translateY(0)' : 'translateY(-6px)',
              transition: 'opacity 0.28s ease, transform 0.32s cubic-bezier(0.22,1,0.36,1)',
            }}
          >
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: BLUE }}>O que é</p>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>{content.about}</p>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: BLUE }}>O que acontece</p>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>{content.effect}</p>
            </div>
            {content.note && (
              <div
                className="rounded-xl px-4 py-3"
                style={{ background: 'rgba(148,136,196,0.10)', border: '1px solid rgba(148,136,196,0.20)' }}
              >
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.80)' }}>{content.note}</p>
              </div>
            )}
            {content.quote && (
              <div className="border-l-2 pl-4" style={{ borderColor: 'rgba(148,136,196,0.40)' }}>
                <p className="font-display text-sm italic leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  "{content.quote.text}"
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-widest" style={{ color: 'rgba(148,136,196,0.55)' }}>
                  — {content.quote.author}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

// ── EtapaHeader — definido fora do componente para evitar remount ────────────
function EtapaHeader({
  label,
  title,
  description,
  backgroundImage,
  backgroundPosition,
}: {
  label: string;
  title: string;
  description: ReactNode;
  backgroundImage: string;
  backgroundPosition?: string;
}) {
  return (
    <div className="relative overflow-hidden" style={{ minHeight: 'clamp(180px, 45vw, 220px)' }}>
      <div
        className="absolute inset-0 bg-cover"
        style={{
          backgroundImage,
          backgroundPosition: backgroundPosition ?? 'center 40%',
          transform: 'scale(1.06)',
          filter: 'saturate(1.05) brightness(0.62) contrast(1.10)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.68) 55%, rgba(0,0,0,0.88) 100%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 55% 55% at 50% 35%, rgba(148,136,196,0.18) 0%, transparent 68%)',
        }}
      />
      <div className="relative z-10 px-6 py-8 text-white sm:px-8">
        <span
          className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest"
          style={{
            color: 'rgba(255,255,255,0.92)',
            background: 'rgba(0,0,0,0.52)',
            border: '1px solid rgba(255,255,255,0.18)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          {label}
        </span>
        <h2
          className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl"
          style={{ color: '#FFFFFF', textShadow: '0px 4px 20px rgba(0,0,0,0.6)' }}
        >
          {title}
        </h2>
        <div
          className="mt-3 space-y-2 text-sm leading-relaxed sm:text-base [&_p]:text-white/[0.88] [&_p]:m-0"
          style={{ color: 'rgba(255,255,255,0.88)', textShadow: '0px 4px 20px rgba(0,0,0,0.6)' }}
        >
          {description}
        </div>
      </div>
    </div>
  );
}

// ── EtapaSection — definido fora do componente para evitar remount ───────────
function EtapaSection({
  label,
  title,
  description,
  backgroundImage,
  backgroundPosition,
  completed,
  children,
}: {
  label: string;
  title: string;
  description: ReactNode;
  backgroundImage: string;
  backgroundPosition?: string;
  completed?: boolean;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10% 0px -10% 0px' }}
      transition={{ duration: 0.55 }}
      className="overflow-hidden rounded-3xl shadow-[0_18px_55px_rgba(0,0,0,0.45)]"
      style={{
        border: completed ? '1px solid rgba(148,136,196,0.35)' : '1px solid rgba(255,255,255,0.10)',
        background: completed ? 'linear-gradient(135deg, #0D0B1A 0%, #100d22 100%)' : '#080E1E',
        boxShadow: completed ? '0 18px 55px rgba(0,0,0,0.45), 0 0 0 1px rgba(148,136,196,0.12) inset' : undefined,
      }}
    >
      <EtapaHeader
        label={label}
        title={title}
        description={description}
        backgroundImage={backgroundImage}
        backgroundPosition={backgroundPosition}
      />
      <div className="relative z-10 px-5 py-5 sm:px-8 sm:py-6 text-white">
        {children}
      </div>
    </motion.div>
  );
}
// ── MeditationCard — definido fora do componente para evitar remount ─────────
function MeditationCard({
  meditation,
  stepNumber,
  isPremiumLocked,
  onClick,
  openLearnMore,
  onToggleLearnMore,
}: {
  meditation: Meditation;
  stepNumber: number;
  isPremiumLocked: boolean;
  onClick: () => void;
  openLearnMore: string | null;
  onToggleLearnMore: (v: string | null) => void;
}) {
  const isLocked = meditation.isPremium && isPremiumLocked;

  return (
    <>
      <motion.div
        className="overflow-hidden rounded-2xl"
        style={{ border: '1px solid rgba(148,136,196,0.22)', background: 'rgba(255,255,255,0.05)' }}
        whileHover={{ borderColor: 'rgba(148,136,196,0.45)', background: 'rgba(255,255,255,0.08)' }}
        transition={{ duration: 0.18 }}
      >
        <button
          onClick={onClick}
          className="flex w-full items-stretch text-left cursor-pointer"
        >
          {/* Thumbnail */}
          <div
            className="relative flex-shrink-0 w-[90px] sm:w-[108px]"
            style={{
              backgroundImage: meditation.image,
              backgroundSize: 'cover',
              backgroundPosition: meditation.imagePosition || 'center',
            }}
          >
            {/* Right-side fade so thumbnail blends into card */}
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to right, transparent 55%, rgba(8,14,30,0.90) 100%)' }}
            />
            {/* Bottom dark vignette */}
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.45) 100%)' }}
            />

            {/* Status badge — centred over image */}
            <div className="absolute inset-0 flex items-center justify-center">
              {meditation.completed ? (
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full shadow-lg"
                  style={{ background: BLUE, boxShadow: '0 0 18px rgba(148,136,196,0.55)' }}
                >
                  <Check className="h-4 w-4 text-white" strokeWidth={3} />
                </div>
              ) : isLocked ? (
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                  style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.14)' }}
                >
                  <Lock className="h-4 w-4 text-white/50" />
                </div>
              ) : (
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
                  style={{
                    background: 'rgba(0,0,0,0.60)',
                    border: '1px solid rgba(148,136,196,0.40)',
                    color: 'rgba(192,180,224,0.90)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                  }}
                >
                  {stepNumber}
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-1 items-center gap-3 px-4 py-4 min-w-0">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold sm:text-base leading-snug" style={{ color: 'rgba(255,255,255,0.92)' }}>
                  {meditation.title}
                </h3>
              </div>
              <p className="mt-1 text-xs leading-relaxed sm:text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
                {meditation.description}
              </p>
            </div>

            {/* Duration + play */}
            <div className="flex flex-shrink-0 flex-col items-end gap-2.5">
              <span className="text-[11px] tabular-nums" style={{ color: 'rgba(255,255,255,0.40)' }}>
                {meditation.duration}
              </span>
              <motion.div
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{
                  background: isLocked ? 'rgba(255,255,255,0.06)' : 'rgba(148,136,196,0.18)',
                  border: `1px solid ${isLocked ? 'rgba(255,255,255,0.10)' : 'rgba(148,136,196,0.38)'}`,
                }}
                whileHover={isLocked ? {} : { scale: 1.14, background: 'rgba(148,136,196,0.32)' }}
                whileTap={{ scale: 0.90 }}
                transition={{ type: 'spring', stiffness: 380, damping: 22 }}
              >
                <Play
                  className="h-4 w-4"
                  style={{ color: isLocked ? 'rgba(255,255,255,0.22)' : BLUE, marginLeft: '2px' }}
                  fill="currentColor"
                />
              </motion.div>
            </div>
          </div>
        </button>
      </motion.div>

      <LearnMorePanel id={meditation.id} open={openLearnMore} onToggle={onToggleLearnMore} />
    </>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function DrJoeDispenzaPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { checkAccess } = usePremiumContent();
  const { hasAccess: hasDrJoeEntitlement } = useDrJoeEntitlement();
  const [offerOpen, setOfferOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionJustCompleted, setSessionJustCompleted] = useState<number | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [openLearnMore, setOpenLearnMore] = useState<string | null>(null);
  const [cycleJustFinished, setCycleJustFinished] = useState<boolean>(() => {
    const key = `eco.drJoe.cycleFinished.v1.${user?.id || 'guest'}`;
    return localStorage.getItem(key) === 'true';
  });
  const [cyclesCompleted, setCyclesCompleted] = useState<number>(() => {
    const key = `eco.drJoe.cycle.v1.${user?.id || 'guest'}`;
    try {
      return JSON.parse(localStorage.getItem(key) || '{"cyclesCompleted":0}').cyclesCompleted ?? 0;
    } catch { return 0; }
  });

  // Load meditations from localStorage
  const [meditations, setMeditations] = useState<Meditation[]>(() => {
    const storageKey = `eco.drJoe.meditations.v1.${user?.id || 'guest'}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with INITIAL_MEDITATIONS to ensure isPremium, audioUrl and duration are updated
        return parsed.map((item: Meditation) => {
          const initial = INITIAL_MEDITATIONS.find(m => m.id === item.id);
          return {
            ...item,
            isPremium: initial?.isPremium || false,
            audioUrl: initial?.audioUrl || item.audioUrl,
            duration: initial?.duration || item.duration,
          };
        });
      } catch {
        return INITIAL_MEDITATIONS;
      }
    }
    return INITIAL_MEDITATIONS;
  });

  // Save to localStorage whenever meditations change
  useEffect(() => {
    const storageKey = `eco.drJoe.meditations.v1.${user?.id || 'guest'}`;
    localStorage.setItem(storageKey, JSON.stringify(meditations));
  }, [meditations, user?.id]);

  const premiumValidation = checkAccess(true);
  const hasPremiumAccess = premiumValidation.hasAccess || hasDrJoeEntitlement;

  const handleMeditationClick = (meditation: Meditation) => {
    // Check premium access
    if (meditation.isPremium && !hasPremiumAccess) {
      // Track premium content blocked
      const payload: Omit<PremiumContentBlockedPayload, 'user_id' | 'session_id' | 'timestamp'> = {
        meditation_id: meditation.id,
        meditation_title: meditation.title,
        category: 'dr_joe_dispenza',
        duration_seconds: parseDurationToSeconds(meditation.duration),
        is_premium: true,
        source_page: location.pathname,
        has_subscription: false,
      };
      trackMeditationEvent('Front-end: Premium Content Blocked', payload);

      setOfferOpen(true);
      return;
    }

    // Track meditation selected
    const payload: Omit<MeditationSelectedPayload, 'user_id' | 'session_id' | 'timestamp'> = {
      meditation_id: meditation.id,
      meditation_title: meditation.title,
      category: 'dr_joe_dispenza',
      duration_seconds: parseDurationToSeconds(meditation.duration),
      is_premium: meditation.isPremium || false,
      is_completed: meditation.completed,
      source_page: location.pathname,
    };
    trackMeditationEvent('Front-end: Meditation Selected', payload);

    sessionStorage.setItem('drJoePageScrollPosition', window.scrollY.toString());
    sessionStorage.setItem('eco.drJoe.lastPlayedId', meditation.id);

    navigate('/app/meditation-player', {
      state: {
        meditation: {
          id: meditation.id,
          title: meditation.title,
          duration: meditation.duration,
          audioUrl: meditation.audioUrl,
          imageUrl: meditation.image.replace('url("', '').replace('")', ''),
          backgroundMusic: 'Cristais',
          gradient: meditation.gradient,
          category: 'dr_joe_dispenza',
          isPremium: meditation.isPremium || false,
        },
        returnTo: '/app/dr-joe-dispenza',
      },
    });
  };

  const sintonizeMeditation = meditations.find(m => m.id === 'blessing_2')!;
  const etapa1Meditation = meditations.find(m => m.id === 'blessing_1') ?? INITIAL_MEDITATIONS[0];
  const getMeditationById = (id: string) =>
    meditations.find(m => m.id === id) ?? INITIAL_MEDITATIONS.find(m => m.id === id)!;
  const recondicioneMeditation = getMeditationById('blessing_3');
  const caminhandoMeditation = getMeditationById('blessing_5');
  const espacoTempoMeditation = getMeditationById('blessing_6');
  const completedCount = meditations.filter(m => m.completed).length;
  const totalCount = meditations.length;
  const pct = Math.round((completedCount / totalCount) * 100);
  const nextMeditation = meditations.find(m => !m.completed);
  const currentCycle = cyclesCompleted + 1;
  const heroCTALabel =
    completedCount === 0
      ? `Começar: ${meditations[0].title}`
      : cycleJustFinished
      ? `Ciclo ${currentCycle} completo 🎉`
      : `Continuar: ${nextMeditation?.title ?? meditations[0].title}`;
  const urgencyLabel =
    pct === 0
      ? 'Comece sua primeira prática'
      : pct === 100
      ? `Ciclo ${currentCycle} completo!`
      : currentCycle > 1
      ? `Ciclo ${currentCycle} · Dia ${completedCount} de ${totalCount}`
      : pct >= 80
      ? 'Você está quase lá'
      : `Continue sua jornada · Faltam ${totalCount - completedCount} práticas`;

  // Marcar sessão como concluída automaticamente ao voltar do player
  useEffect(() => {
    if (!location.state?.returnFromMeditation) return;
    const lastId = sessionStorage.getItem('eco.drJoe.lastPlayedId');
    if (!lastId) return;
    sessionStorage.removeItem('eco.drJoe.lastPlayedId');

    if (localStorage.getItem(`eco.meditation.completed80pct.${lastId}`) !== 'true') return;

    setMeditations(prev => {
      if (prev.find(m => m.id === lastId)?.completed) return prev;
      const next = prev.map(m =>
        m.id === lastId
          ? { ...m, completed: true, totalCompletions: (m.totalCompletions ?? 0) + 1 }
          : m
      );
      const newPct = Math.round(next.filter(m => m.completed).length / next.length * 100);
      const allDone = next.every(m => m.completed);

      if (allDone) {
        const cycleKey = `eco.drJoe.cycleFinished.v1.${user?.id || 'guest'}`;
        localStorage.setItem(cycleKey, 'true');
        setCycleJustFinished(true);
      } else {
        setSessionJustCompleted(newPct);
        setTimeout(() => setSessionJustCompleted(null), 3000);
      }

      localStorage.setItem(
        `eco.program.lastActive.drJoe.${user?.id || 'guest'}`,
        new Date().toISOString()
      );
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const handleLogout = () => {
    navigate('/');
  };

  const handleStartNextCycle = () => {
    const userId = user?.id || 'guest';
    const cycleKey = `eco.drJoe.cycle.v1.${userId}`;
    const cycleFinishedKey = `eco.drJoe.cycleFinished.v1.${userId}`;

    const current = (() => {
      try { return JSON.parse(localStorage.getItem(cycleKey) || '{}'); }
      catch { return {}; }
    })();
    const newCyclesCompleted = (current.cyclesCompleted ?? 0) + 1;
    localStorage.setItem(cycleKey, JSON.stringify({
      cyclesCompleted: newCyclesCompleted,
      totalDaysPracticed: (current.totalDaysPracticed ?? 0) + totalCount,
      startedAt: current.startedAt ?? new Date().toISOString(),
    }));
    localStorage.removeItem(cycleFinishedKey);

    setCyclesCompleted(newCyclesCompleted);
    setCycleJustFinished(false);
    setMeditations(prev => prev.map(m => ({ ...m, completed: false })));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    window.scrollTo(0, 0);

    // Simulate loading time to show skeleton
    const timer = setTimeout(() => {
      setIsLoading(false);

      // Track list viewed after loading
      const payload: Omit<MeditationListViewedPayload, 'user_id' | 'session_id' | 'timestamp'> = {
        category: 'dr_joe_dispenza',
        total_meditations: meditations.length,
        completed_count: meditations.filter(m => m.completed).length,
        premium_count: meditations.filter(m => m.isPremium).length,
        page_path: location.pathname,
      };
      trackMeditationEvent('Front-end: Meditation List Viewed', payload);
    }, 800);

    return () => clearTimeout(timer);
  }, [meditations, location.pathname]);

  const scrollToJourney = () => {
    document.getElementById('jornada')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-[#07090F] font-primary">
      <HomeHeader onLogout={handleLogout} />

      {isLoading ? (
        <DrJoeDispenzaSkeleton />
      ) : (
        <main className="pb-20">
          <section className="relative flex min-h-[560px] flex-col items-center justify-end overflow-hidden sm:min-h-[680px] md:min-h-[760px]">
            <button
              onClick={() => navigate('/app')}
              className="absolute left-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-black/20 sm:left-6 sm:top-6 md:left-8 md:top-8"
              style={{
                background: 'rgba(148,136,196,0.18)',
                border: '1px solid rgba(148,136,196,0.38)',
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
              }}
            >
              <ArrowLeft className="h-5 w-5" style={{ color: 'rgba(255,255,255,0.9)' }} />
            </button>
            <div
              className="absolute inset-0 bg-cover"
              style={{
                backgroundImage: 'url("/images/capa-dr-joe-dispenza.png")',
                backgroundPosition: 'center 40%',
                transform: 'scale(1.03)',
                filter: 'saturate(1.05) brightness(0.82) contrast(1.05)',
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0.50) 55%, rgba(0,0,0,0.70) 100%)',
              }}
            />
            {/* Focus area: reduz interferência exatamente atrás do texto */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse 70% 55% at 50% 38%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0.00) 78%)',
                filter: 'blur(2px)',
              }}
            />
            {/* Ambient lavender glow: ecoa o halo do caduceu */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse 65% 55% at 50% 35%, rgba(148,136,196,0.20) 0%, transparent 68%)' }}
            />

            <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center px-4 pb-14 pt-12 text-center sm:px-8 sm:pb-20 sm:pt-24">
              <div
                className="w-full max-w-2xl rounded-2xl px-4 py-5 sm:rounded-3xl sm:px-8 sm:py-8"
                style={{
                  background: 'rgba(0,0,0,0.25)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 18px 55px rgba(0,0,0,0.25)',
                }}
              >
                <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
                  <span
                    className="inline-flex items-center rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em]"
                    style={{
                      background: 'rgba(148,136,196,0.16)',
                      border: '1px solid rgba(148,136,196,0.34)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10)',
                      color: 'rgba(255,255,255,0.92)',
                    }}
                  >
                    DR. JOE DISPENZA
                  </span>
                  {currentCycle > 1 && (
                    <span
                      className="inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold"
                      style={{
                        background: 'rgba(148,136,196,0.22)',
                        border: '1px solid rgba(148,136,196,0.50)',
                        color: 'rgba(192,180,224,0.95)',
                      }}
                    >
                      Ciclo {currentCycle}
                    </span>
                  )}
                </div>

                <h1
                  className="font-display text-[1.85rem] font-bold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl"
                  style={{ textShadow: '0px 4px 20px rgba(0,0,0,0.6)' }}
                >
                  Você não precisa repetir o passado.{' '}
                  <span
                    style={{
                      color: '#FFFFFF',
                      textShadow: '0px 4px 20px rgba(0,0,0,0.6), 0 0 52px rgba(192,180,224,0.55)',
                    }}
                  >
                    Pode criar uma nova realidade.
                  </span>
                </h1>

                <p
                  className="mt-4 max-w-xl text-sm leading-relaxed sm:mt-6 sm:text-lg"
                  style={{ color: 'rgba(255,255,255,0.82)', textShadow: '0px 4px 20px rgba(0,0,0,0.6)' }}
                >
                  Um processo guiado para alinhar intenção clara e frequência elevada, e transformar sua mente, seu corpo e sua vida.
                </p>
              </div>

              <div
                className="mt-8 w-full max-w-xl rounded-2xl px-5 py-5 text-left"
                style={{
                  background: 'rgba(0,0,0,0.28)',
                  backdropFilter: 'blur(26px)',
                  WebkitBackdropFilter: 'blur(26px)',
                  border: '1px solid rgba(255,255,255,0.16)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 10px 30px rgba(0,0,0,0.28)',
                }}
              >
                <ul className="space-y-3 text-sm sm:text-base" style={{ color: 'rgba(255,255,255,0.92)' }}>
                  {[
                    'Neurociência aplicada à transformação mental',
                    'Intenção clara + frequência elevada = nova energia',
                    'Prática guiada passo a passo',
                  ].map((label) => (
                    <li key={label} className="flex items-start gap-3">
                      <span
                        className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
                        style={{
                          background: 'rgba(148,136,196,0.28)',
                          border: '1px solid rgba(148,136,196,0.55)',
                          boxShadow: '0 10px 26px rgba(148,136,196,0.22)',
                        }}
                      >
                        <Check className="h-3.5 w-3.5" style={{ color: '#FFFFFF' }} strokeWidth={3} />
                      </span>
                      <span className="leading-snug" style={{ color: 'rgba(255,255,255,0.92)' }}>{label}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-10 flex w-full max-w-xl flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
                <button
                  onClick={() => {
                    if (!cycleJustFinished && completedCount < totalCount) {
                      handleMeditationClick(nextMeditation ?? meditations[0]);
                    }
                  }}
                  disabled={cycleJustFinished}
                  className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-[0.99] disabled:cursor-default disabled:opacity-60 sm:text-base"
                  style={{
                    background: BLUE,
                    color: '#FFFFFF',
                    boxShadow: '0 10px 40px rgba(148,136,196,0.35), 0 0 0 1px rgba(255,255,255,0.08) inset',
                  }}
                >
                  {!cycleJustFinished && completedCount < totalCount && <Play className="h-4 w-4" fill="currentColor" />}
                  Criar minha nova realidade
                </button>

                <button
                  onClick={scrollToJourney}
                  className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10 active:translate-y-0 active:scale-[0.99] sm:text-base"
                  style={{
                    color: 'rgba(255,255,255,0.88)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    background: 'rgba(255,255,255,0.04)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                  }}
                >
                  Ver a jornada <span className="text-white/70">↓</span>
                </button>
              </div>

              <p className="mt-4 text-center text-xs sm:text-sm" style={{ color: 'rgba(255,255,255,0.62)' }}>
                {heroCTALabel} · {completedCount}/{totalCount} concluídas
              </p>
            </div>
          </section>

          {/* ── Progresso da jornada ── */}
          <div className="mx-auto max-w-4xl px-4 pt-6 pb-2 sm:px-8 md:px-8">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 backdrop-blur-sm"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-white/80">{urgencyLabel}</span>
                <span className="text-sm font-bold" style={{ color: '#9488C4' }}>{pct}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: 'rgba(148,136,196,0.12)' }}>
                <div
                  className="h-2 rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #7c6fc0, #9488C4, #b0a6d8)' }}
                />
              </div>
              <p className="mt-1.5 text-xs text-white/40">
                {completedCount} de {totalCount} práticas concluídas
                {pct >= 50 && pct < 100 ? ' · A maioria desiste antes da metade. Você passou.' : ''}
              </p>

              {/* ── Dots de ciclo ── mostrar só a partir do ciclo 1 completado */}
              {cyclesCompleted > 0 && (
                <div className="mt-4 flex items-center gap-2">
                  {Array.from({ length: Math.min(cyclesCompleted + 4, 8) }).map((_, i) => {
                    const isPast = i < cyclesCompleted;
                    const isCurrent = i === cyclesCompleted;
                    return (
                      <span
                        key={i}
                        title={isPast ? `Ciclo ${i + 1} completo` : isCurrent ? `Ciclo ${i + 1} em andamento` : ''}
                        style={{
                          display: 'inline-block',
                          width: isCurrent ? 10 : isPast ? 8 : 6,
                          height: isCurrent ? 10 : isPast ? 8 : 6,
                          borderRadius: '50%',
                          flexShrink: 0,
                          background: isPast
                            ? 'rgba(148,136,196,0.70)'
                            : isCurrent
                            ? '#9488C4'
                            : 'rgba(148,136,196,0.18)',
                          border: isCurrent
                            ? '1px solid rgba(192,180,224,0.60)'
                            : isPast
                            ? '1px solid rgba(148,136,196,0.40)'
                            : '1px solid rgba(148,136,196,0.20)',
                          boxShadow: isCurrent ? '0 0 8px rgba(148,136,196,0.55)' : undefined,
                          animation: isCurrent ? 'eco-pulse 2.5s ease-in-out infinite' : undefined,
                        }}
                      />
                    );
                  })}
                  <span className="ml-1 text-[10px] text-white/35">
                    {cyclesCompleted} ciclo{cyclesCompleted > 1 ? 's' : ''} completo{cyclesCompleted > 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </motion.div>
          </div>

          {/* ══════════════════════════════════════════
               JORNADA: VISÃO GERAL
          ══════════════════════════════════════════ */}
          <div className="mx-auto max-w-4xl px-4 pt-8 pb-2 md:px-8">
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-white/10" />
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/55">Jornada</span>
                <span className="h-3 w-px bg-white/20" />
                <span className="text-xs text-white/45">Visão geral</span>
              </div>
              <div className="h-px flex-1 bg-white/10" />
            </div>
          </div>

          {/* ── Intro compacta + "Como funciona" colapsável ── */}
          <section className="mx-auto max-w-2xl px-6 pb-2 pt-8 text-center md:px-4">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-lg font-semibold leading-snug text-white sm:text-xl">
                Quando você muda sua energia,<br />
                <span style={{ color: '#9488C4' }}>você começa a mudar o que cria.</span>
              </p>
              <p className="mt-3 text-sm leading-relaxed text-white/60 sm:text-base">
                Cada sessão treina seu sistema nervoso para viver no futuro antes de ele acontecer.
              </p>
              <button
                onClick={() => setShowMore(v => !v)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-medium transition-all duration-200 hover:bg-white/5"
                style={{ color: 'rgba(148,136,196,0.70)', borderColor: 'rgba(148,136,196,0.20)' }}
              >
                {showMore ? 'Fechar ↑' : 'Como funciona ↓'}
              </button>
            </motion.div>

            <AnimatePresence>
              {showMore && (
                <motion.div
                  key="how-it-works"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.35, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="mt-8 space-y-5 text-left">
                    {[
                      { n: '01', label: 'Intenção', text: 'Você define exatamente o que quer criar — específico o suficiente para ser real.' },
                      { n: '02', label: 'Frequência', text: 'Você entra no estado interno de quem já vive isso — não como visualização, mas como experiência real no corpo.' },
                      { n: '03', label: 'Assinatura', text: 'Intenção + frequência criam uma assinatura eletromagnética que se conecta ao campo de possibilidades.' },
                      { n: '04', label: 'Materialização', text: 'Quando você sustenta esse estado, o externo começa a responder ao interno.' },
                    ].map(s => (
                      <div key={s.n} className="flex gap-4">
                        <span className="w-7 flex-shrink-0 pt-0.5 text-right text-xs font-bold tabular-nums text-white/20">{s.n}</span>
                        <div className="flex-1 border-l border-white/10 pl-4">
                          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9488C4' }}>{s.label}</p>
                          <p className="text-sm leading-relaxed text-white/65">{s.text}</p>
                        </div>
                      </div>
                    ))}
                    <div className="mt-6 border-t border-b border-white/10 py-6 text-center">
                      <p className="font-display text-base italic leading-snug text-white/80 sm:text-lg">
                        "Se você pensa no futuro, mas vibra nas frequências do passado, nada muda."
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-widest" style={{ color: 'rgba(148,136,196,0.50)' }}>— Dr. Joe Dispenza</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Toast de celebração */}
          {sessionJustCompleted !== null && (
            <div className="mx-auto max-w-4xl px-4 sm:px-8 mb-4 animate-fade-in">
              <div className="rounded-2xl border border-[#9488C4]/25 bg-[#9488C4]/[0.12] px-4 py-3 flex items-center gap-3">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#9488C4] text-xs text-white font-bold">
                  ✓
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#b0a6d8]">
                    Prática concluída!
                  </p>
                  <p className="text-xs text-[#9488C4]">
                    Você avançou para {sessionJustCompleted}% da jornada
                  </p>
                </div>
              </div>
            </div>
          )}

          <div id="jornada" className="scroll-mt-24" />

          <section className="mx-auto max-w-4xl px-4 py-6 sm:py-8 md:px-8">
            <div className="space-y-10">
              <div>
                <EtapaSection
                  label="ETAPA 1"
                  title="Criando seu potencial"
                  description={<p>Defina a experiência que você quer criar e conecte-se com a frequência desse futuro antes de meditar.</p>}
                  backgroundImage={'url("/images/capa-dr-joe-dispenza.png")'}
                  backgroundPosition="center 40%"
                  completed={false}
                >
                  <motion.div
                    className="overflow-hidden rounded-2xl"
                    style={{ border: '1px solid rgba(148,136,196,0.22)', background: 'rgba(255,255,255,0.05)' }}
                    whileHover={{ borderColor: 'rgba(148,136,196,0.45)', background: 'rgba(255,255,255,0.08)' }}
                    transition={{ duration: 0.18 }}
                  >
                    <button
                      onClick={() => navigate('/app/minigame-potencial')}
                      className="flex w-full items-stretch text-left cursor-pointer"
                    >
                      {/* Thumbnail — usa a capa do programa */}
                      <div
                        className="relative flex-shrink-0 w-[90px] sm:w-[108px]"
                        style={{
                          backgroundImage: 'url("/images/capa-dr-joe-dispenza.png")',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center 40%',
                        }}
                      >
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, transparent 55%, rgba(8,14,30,0.90) 100%)' }} />
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.45) 100%)' }} />
                        {/* ✦ Ícone de experiência */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div
                            className="flex h-8 w-8 items-center justify-center rounded-full text-sm"
                            style={{
                              background: 'rgba(0,0,0,0.60)',
                              border: `1px solid ${BLUE_BORDER}`,
                              color: BLUE,
                              backdropFilter: 'blur(8px)',
                              WebkitBackdropFilter: 'blur(8px)',
                            }}
                          >
                            ✦
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex flex-1 items-center gap-3 px-4 py-4 min-w-0">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold sm:text-base leading-snug" style={{ color: 'rgba(255,255,255,0.92)' }}>
                              Criando seu novo potencial
                            </h3>
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                              style={{
                                background: BLUE_SOFT,
                                border: `1px solid ${BLUE_BORDER}`,
                                color: 'rgba(192,180,224,0.95)',
                              }}
                            >
                              EXPERIÊNCIA
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed sm:text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
                            3 minutos para definir sua intenção e sentir a emoção.
                          </p>
                        </div>
                        <div className="flex flex-shrink-0 flex-col items-end gap-2.5">
                          <span className="text-[11px] tabular-nums" style={{ color: 'rgba(255,255,255,0.40)' }}>3 min</span>
                          <motion.div
                            className="flex h-9 w-9 items-center justify-center rounded-full"
                            style={{ background: 'rgba(148,136,196,0.18)', border: '1px solid rgba(148,136,196,0.38)' }}
                            whileHover={{ scale: 1.14, background: 'rgba(148,136,196,0.32)' }}
                            whileTap={{ scale: 0.90 }}
                            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                          >
                            <Play className="h-4 w-4" style={{ color: BLUE, marginLeft: '2px' }} fill="currentColor" />
                          </motion.div>
                        </div>
                      </div>
                    </button>
                  </motion.div>
                </EtapaSection>
              </div>

              <div>
                <EtapaSection
                  label="DIA 1"
                  title={sintonizeMeditation.title}
                  description={<p>Acesse o campo de possibilidades além do seu passado</p>}
                  backgroundImage={sintonizeMeditation.image}
                  backgroundPosition={sintonizeMeditation.imagePosition}
                  completed={sintonizeMeditation.completed}
                >
                  <MeditationCard
                    meditation={sintonizeMeditation}
                    stepNumber={2}
                    isPremiumLocked={!hasPremiumAccess}
                    onClick={() => handleMeditationClick(sintonizeMeditation)}
                    openLearnMore={openLearnMore}
                    onToggleLearnMore={setOpenLearnMore}
                  />
                </EtapaSection>
              </div>

              <div>
                <EtapaSection
                  label="DIA 2"
                  title={etapa1Meditation.title}
                  description={<p>Ative seu corpo para um novo estado interno</p>}
                  backgroundImage={etapa1Meditation.image}
                  backgroundPosition={etapa1Meditation.imagePosition}
                  completed={etapa1Meditation.completed}
                >
                  <MeditationCard
                    meditation={etapa1Meditation}
                    stepNumber={3}
                    isPremiumLocked={!hasPremiumAccess}
                    onClick={() => handleMeditationClick(etapa1Meditation)}
                    openLearnMore={openLearnMore}
                    onToggleLearnMore={setOpenLearnMore}
                  />
                </EtapaSection>
              </div>

              <div>
                <EtapaSection
                  label="DIA 3"
                  title={recondicioneMeditation.title}
                  description={<p>{recondicioneMeditation.description}</p>}
                  backgroundImage={recondicioneMeditation.image}
                  backgroundPosition={recondicioneMeditation.imagePosition}
                  completed={recondicioneMeditation.completed}
                >
                  <MeditationCard
                    meditation={recondicioneMeditation}
                    stepNumber={4}
                    isPremiumLocked={!hasPremiumAccess}
                    onClick={() => navigate('/app/recondicione-antes-de-comecar')}
                    openLearnMore={openLearnMore}
                    onToggleLearnMore={setOpenLearnMore}
                  />
                </EtapaSection>
              </div>

              <div>
                <EtapaSection
                  label="DIA 4"
                  title={caminhandoMeditation.title}
                  description={<p>{caminhandoMeditation.description}</p>}
                  backgroundImage={caminhandoMeditation.image}
                  backgroundPosition={caminhandoMeditation.imagePosition}
                  completed={caminhandoMeditation.completed}
                >
                  <MeditationCard
                    meditation={caminhandoMeditation}
                    stepNumber={5}
                    isPremiumLocked={!hasPremiumAccess}
                    onClick={() => handleMeditationClick(caminhandoMeditation)}
                    openLearnMore={openLearnMore}
                    onToggleLearnMore={setOpenLearnMore}
                  />
                </EtapaSection>
              </div>

              <div>
                <EtapaSection
                  label="DIA 5"
                  title={espacoTempoMeditation.title}
                  description={<p>{espacoTempoMeditation.description}</p>}
                  backgroundImage={espacoTempoMeditation.image}
                  backgroundPosition={espacoTempoMeditation.imagePosition}
                  completed={espacoTempoMeditation.completed}
                >
                  <MeditationCard
                    meditation={espacoTempoMeditation}
                    stepNumber={6}
                    isPremiumLocked={!hasPremiumAccess}
                    onClick={() => handleMeditationClick(espacoTempoMeditation)}
                    openLearnMore={openLearnMore}
                    onToggleLearnMore={setOpenLearnMore}
                  />
                </EtapaSection>
              </div>

            </div>
          </section>

          {/* (Etapas adicionais removidas para manter a sequência e o padrão visual) */}

          {/* ── Frase Final ── */}
          <section className="mx-auto max-w-4xl px-4 pb-24 md:px-8 sm:pb-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative overflow-hidden rounded-3xl px-8 py-12 text-center sm:px-12 sm:py-14"
              style={{
                background: 'linear-gradient(135deg, #09090F 0%, #0D0B1A 100%)',
                border: '1px solid rgba(148,136,196,0.15)',
                boxShadow: '0 0 60px rgba(148,136,196,0.06) inset',
              }}
            >
              {/* Glow difuso */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{ background: 'radial-gradient(ellipse 60% 55% at 50% 50%, rgba(148,136,196,0.07) 0%, transparent 70%)' }}
              />
              <p
                className="relative font-display text-xl italic font-semibold leading-snug sm:text-2xl md:text-3xl"
                style={{ color: 'rgba(235,229,218,0.88)', textShadow: '0 2px 24px rgba(148,136,196,0.25)' }}
              >
                "A frequência que você sustenta<br />é a realidade que você cria."
              </p>
              <div className="mx-auto mt-5 h-px w-12" style={{ background: 'rgba(148,136,196,0.30)' }} />
              <p className="mt-4 text-xs uppercase tracking-[0.22em]" style={{ color: 'rgba(148,136,196,0.50)' }}>
                Dr. Joe Dispenza
              </p>
            </motion.div>
          </section>

          {/* ── Sticky CTA mobile ── */}
          {!cycleJustFinished && (
            <div
              className="fixed bottom-0 left-0 right-0 z-50 sm:hidden"
              style={{
                background: 'rgba(7,9,15,0.92)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderTop: '1px solid rgba(148,136,196,0.15)',
                padding: '12px 16px',
                paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
              }}
            >
              {completedCount < totalCount ? (
                <button
                  onClick={() => handleMeditationClick(nextMeditation ?? meditations[0])}
                  className="flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold text-white"
                  style={{
                    background: 'linear-gradient(135deg, #7c6fc0 0%, #9488C4 50%, #b0a6d8 100%)',
                    boxShadow: '0 8px 32px rgba(148,136,196,0.35)',
                  }}
                >
                  <Play className="h-4 w-4 flex-shrink-0" fill="currentColor" />
                  <span className="truncate">Continuar: {nextMeditation?.title ?? meditations[0].title}</span>
                </button>
              ) : null}
            </div>
          )}
        </main>
      )}

      {/* ── Ciclo Completo Overlay ── */}
      <AnimatePresence>
        {cycleJustFinished && (
          <motion.div
            key="cycle-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-6 text-center"
            style={{
              background: 'rgba(7,9,15,0.96)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
            }}
          >
            {/* Glow ambiental */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 45%, rgba(148,136,196,0.14) 0%, transparent 68%)' }}
            />

            {/* Símbolo ∞ pulsando */}
            <motion.div
              animate={{ scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }}
              transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
              className="relative z-10 mb-8 flex h-20 w-20 items-center justify-center rounded-full"
              style={{
                background: 'rgba(148,136,196,0.14)',
                border: '1px solid rgba(148,136,196,0.38)',
                boxShadow: '0 0 40px rgba(148,136,196,0.22)',
                fontSize: '2.5rem',
                color: '#b0a6d8',
              }}
            >
              ∞
            </motion.div>

            {/* Título */}
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.55 }}
              className="relative z-10 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl"
              style={{ textShadow: '0 2px 24px rgba(148,136,196,0.35)' }}
            >
              Ciclo {currentCycle} completo.
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="relative z-10 mt-3 text-base leading-relaxed sm:text-lg"
              style={{ color: 'rgba(255,255,255,0.70)' }}
            >
              Sua mente já não é a mesma.
            </motion.p>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="relative z-10 mt-8 flex items-center gap-4"
            >
              {[
                { value: `${(cyclesCompleted + 1) * totalCount}`, label: 'dias de prática' },
                { value: `${cyclesCompleted + 1}`, label: `ciclo${cyclesCompleted + 1 > 1 ? 's' : ''} completo${cyclesCompleted + 1 > 1 ? 's' : ''}` },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex flex-col items-center rounded-2xl px-6 py-4"
                  style={{
                    background: 'rgba(148,136,196,0.08)',
                    border: '1px solid rgba(148,136,196,0.20)',
                  }}
                >
                  <span className="text-2xl font-bold text-white">{stat.value}</span>
                  <span className="mt-0.5 text-xs text-white/50">{stat.label}</span>
                </div>
              ))}
            </motion.div>

            {/* CTA */}
            <motion.button
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65, duration: 0.5 }}
              onClick={handleStartNextCycle}
              className="relative z-10 mt-10 inline-flex items-center justify-center gap-2 rounded-full px-10 py-4 text-base font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #7c6fc0 0%, #9488C4 50%, #b0a6d8 100%)',
                boxShadow: '0 12px 40px rgba(148,136,196,0.40)',
              }}
            >
              Iniciar Ciclo {cyclesCompleted + 2} →
            </motion.button>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.5 }}
              className="relative z-10 mt-4 text-xs"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              O aprendizado é diário e constante.
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <DrJoeOfferModal open={offerOpen} onClose={() => setOfferOpen(false)} origin="dr_joe_dispenza_locked" />
    </div>
  );
}

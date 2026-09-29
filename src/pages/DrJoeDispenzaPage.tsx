import ProximoCaminho from '@/components/reino/ProximoCaminho';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import HomeHeader from '@/components/home/HomeHeader';
import { useAuth } from '@/contexts/AuthContext';
import ReinoChegada, { ReinoSessoes, type ReinoSessao } from '@/components/reino/ReinoChegada';
import ReinoCarregando from '@/components/reino/ReinoCarregando';
import { usePremiumContent } from '@/hooks/usePremiumContent';
import { useDrJoeEntitlement } from '@/hooks/useDrJoeEntitlement';
import UpgradeModal from '@/components/subscription/UpgradeModal';
import {
  trackMeditationEvent,
  parseDurationToSeconds,
  type MeditationListViewedPayload,
  type MeditationSelectedPayload,
  type PremiumContentBlockedPayload,
} from '@/analytics/meditation';

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
    effect: 'Reduz a atividade da rede de modo padrão (responsável pelos pensamentos automáticos) e ativa regiões associadas a criatividade, perspectiva e estados elevados.',
    quote: { text: 'Se você mantiver a mesma mente, criará o mesmo futuro.', author: 'Dr. Joe Dispenza' },
  },
  blessing_1: {
    about: 'Os centros de energia do corpo têm correlatos fisiológicos reais: plexos nervosos, glândulas endócrinas e campos eletromagnéticos mensuráveis.',
    effect: 'Direcionar atenção consciente para cada região ativa o sistema nervoso autônomo e começa a reorganizar a coerência eletromagnética do coração.',
    note: 'Calor, formigamento ou pulsação durante a prática são respostas normais: é o corpo respondendo à intenção.',
  },
  blessing_3: {
    about: 'Comportamentos repetidos criam conexões neurais automáticas que o corpo executa sem escolha consciente. Esta prática interrompe esses circuitos.',
    effect: 'Neuroplasticidade em ação: ao imaginar novos estados com emoção real, o cérebro começa a criar novas sinapses como se a experiência já tivesse acontecido.',
    note: 'Dr. Joe Dispenza conduziu estudos em mais de 15 países com mudanças mensuráveis no DNA, sistema imune e ondas cerebrais após práticas intensivas.',
  },
  blessing_5: {
    about: 'O movimento consciente integra o novo estado mental ao sistema nervoso motor, criando o que neurocientistas chamam de memória corporal.',
    effect: 'Caminhar com intenção específica ativa o córtex pré-frontal (região associada a autodireção e clareza) enquanto ancora o novo estado no corpo.',
  },
  blessing_6: {
    about: 'A mente analítica opera em tempo linear, o que limita o acesso a possibilidades além do que já foi vivido. Esta meditação treina o estado gama: a frequência mais alta registrada em meditadores avançados.',
    effect: 'Em estado de presença total, a percepção do tempo se dissolve. Pesquisas de Dr. Joe mostram correlação com mudanças epigenéticas: alterações reais na expressão do DNA.',
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
    image: 'url("/images/reino/portico-800.webp")',
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
    image: 'url("/images/reino/vale-800.webp")',
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
    image: 'url("/images/reino/capa-desperte.webp")',
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
    image: 'url("/images/reino/trilhas-800.webp")',
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
    image: 'url("/images/reino/capa-mente-quieta.webp")',
    imagePosition: 'center 32%',
    gradient: 'linear-gradient(to bottom, #FCD670 0%, #FBCA5D 15%, #F7B84A 30%, #F39A3C 45%, #EC7D2E 60%, #E26224 75%, #D7491F 90%, #C43520 100%)',
    completed: false,
    isPremium: true,
  },
];

export default function DrJoeDispenzaPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { checkAccess, requestUpgrade, showUpgradeModal, closeUpgradeModal } = usePremiumContent();
  const { hasAccess: hasDrJoeEntitlement } = useDrJoeEntitlement();
  const [isLoading, setIsLoading] = useState(true);
  const [sessionJustCompleted, setSessionJustCompleted] = useState<number | null>(null);
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
            image: initial?.image || item.image,
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

      requestUpgrade('dr_joe_dispenza_locked');
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

  const detalheDe = (id: string) => {
    const c = LEARN_MORE[id];
    if (!c) return undefined;
    return (
      <>
        <p>
          <strong>O que é.</strong> {c.about}
        </p>
        <p>
          <strong>O que acontece.</strong> {c.effect}
        </p>
        {c.note && <p className="reino-sessao__nota">{c.note}</p>}
        {c.quote && (
          <blockquote>
            "{c.quote.text}"<br />
            <small>{c.quote.author}</small>
          </blockquote>
        )}
      </>
    );
  };

  // A jornada em ordem: a experiência de intenção e os 5 dias.
  const dias = [sintonizeMeditation, etapa1Meditation, recondicioneMeditation, caminhandoMeditation, espacoTempoMeditation];
  const sessoes: ReinoSessao[] = [
    {
      id: 'experiencia',
      titulo: 'Criando seu novo potencial',
      descricao: '3 minutos para definir sua intenção e sentir a emoção.',
      meta: 'experiência · 3 min',
      estado: 'livre',
    },
    ...dias.map((m, i) => {
      const trancada = !!m.isPremium && !hasPremiumAccess;
      const proxima = !m.completed && m.id === nextMeditation?.id;
      const estado: ReinoSessao['estado'] = m.completed ? 'feita' : trancada ? 'trancada' : proxima ? 'proxima' : 'livre';
      const meta = m.completed
        ? 'feito'
        : trancada
        ? `assinantes · ${m.duration}`
        : proxima
        ? `hoje · ${m.duration}`
        : m.duration;
      return { id: m.id, titulo: `Dia ${i + 1}: ${m.title}`, descricao: m.description, meta, estado, detalhe: detalheDe(m.id) };
    }),
  ];

  const escolher = (id: string) => {
    if (id === 'experiencia') return navigate('/app/minigame-potencial');
    if (id === 'blessing_3') return navigate('/app/recondicione-antes-de-comecar');
    const m = dias.find((x) => x.id === id);
    if (m) handleMeditationClick(m);
  };

  return (
    <div className="reino-corpo" style={{ minHeight: '100dvh' }}>
      <HomeHeader />

      {isLoading ? (
        <ReinoCarregando inline />
      ) : (
        <main className="page-with-nav">
          <ReinoChegada
            mood="entardecer"
            imagem="/images/reino/capa-desperte.webp"
            foco="22% center"
            lugar={`TRI.04 · As Trilhas · Dr. Joe Dispenza${currentCycle > 1 ? ` · Ciclo ${currentCycle}` : ''}`}
            titulo="Você não precisa repetir o passado."
            sobre="Pode criar uma nova realidade. Um processo guiado para alinhar intenção clara e frequência elevada, e transformar sua mente, seu corpo e sua vida."
            voltar={{ rotulo: 'Voltar para Hoje', onClick: () => navigate('/app') }}
            progresso={{ valor: pct / 100, legenda: `${urgencyLabel}. ${completedCount} de ${totalCount} práticas.` }}
          >
            {!cycleJustFinished && completedCount < totalCount && (
              <button
                type="button"
                className="reino-placa"
                onClick={() => handleMeditationClick(nextMeditation ?? meditations[0])}
              >
                Criar minha nova realidade <span aria-hidden="true">→</span>
              </button>
            )}
          </ReinoChegada>

          <div className="reino-pagina">
            <p className="reino-rotulo">O que a jornada trabalha</p>
            <ul className="reino-abundancia__lista">
              <li>Neurociência aplicada à transformação mental</li>
              <li>Intenção clara e frequência elevada criando uma nova energia</li>
              <li>Prática guiada passo a passo</li>
            </ul>

            {cyclesCompleted > 0 && (
              <div className="reino-nota" style={{ marginTop: 24 }}>
                <p>
                  {cyclesCompleted} ciclo{cyclesCompleted > 1 ? 's' : ''} completo{cyclesCompleted > 1 ? 's' : ''}. O aprendizado é
                  diário e constante.
                </p>
              </div>
            )}

            {sessionJustCompleted !== null && (
              <div className="reino-nota" role="status" style={{ marginTop: 24 }}>
                <p>Prática concluída. Você avançou para {sessionJustCompleted}% da jornada.</p>
              </div>
            )}

            <section className="reino-drjoe__como" aria-labelledby="drjoe-como">
              <h2 id="drjoe-como" className="reino-corpo__titulo" style={{ fontSize: 26 }}>
                Quando você muda sua energia, começa a mudar o que cria.
              </h2>
              <p className="reino-corpo__sobre">Cada sessão treina seu sistema nervoso para viver no futuro antes de ele acontecer.</p>
              <details className="reino-sessao__detalhe">
                <summary>Como funciona</summary>
                <ol className="reino-sumario reino-drjoe__passos">
                  {[
                    { label: 'Intenção', text: 'Você define exatamente o que quer criar: específico o suficiente para ser real.' },
                    { label: 'Frequência', text: 'Você entra no estado interno de quem já vive isso, não como visualização, mas como experiência real no corpo.' },
                    { label: 'Assinatura', text: 'Intenção e frequência criam uma assinatura eletromagnética que se conecta ao campo de possibilidades.' },
                    { label: 'Materialização', text: 'Quando você sustenta esse estado, o externo começa a responder ao interno.' },
                  ].map((s, i) => (
                    <li key={s.label}>
                      <div className="reino-sessao" style={{ cursor: 'default' }}>
                        <span className="reino-sumario__n">{String(i + 1).padStart(2, '0')}</span>
                        <span className="reino-sessao__texto">
                          <span className="reino-sumario__t">{s.label}</span>
                          <span className="reino-sessao__descricao">{s.text}</span>
                        </span>
                        <span />
                      </div>
                    </li>
                  ))}
                </ol>
                <blockquote className="reino-drjoe__citacao">
                  "Se você pensa no futuro, mas vibra nas frequências do passado, nada muda."
                  <small>Dr. Joe Dispenza</small>
                </blockquote>
              </details>
            </section>

            <p className="reino-rotulo" id="jornada" style={{ marginTop: 40 }}>
              A jornada
            </p>
            <ReinoSessoes sessoes={sessoes} onEscolher={escolher} />

            <blockquote className="reino-drjoe__citacao reino-drjoe__fecho">
              "A frequência que você sustenta é a realidade que você cria."
              <small>Dr. Joe Dispenza</small>
            </blockquote>
          </div>
        </main>
      )}

      {cycleJustFinished && (
        <div className="reino-drjoe__ciclo" role="dialog" aria-modal="true" aria-labelledby="drjoe-ciclo">
          <div className="reino-drjoe__ciclo-caixa">
            <p className="reino-rotulo">TRI.04 · As Trilhas</p>
            <h2 id="drjoe-ciclo" className="reino-corpo__titulo">
              Ciclo {currentCycle} completo.
            </h2>
            <p className="reino-corpo__sobre">Sua mente já não é a mesma.</p>
            <p className="reino-drjoe__numeros">
              {(cyclesCompleted + 1) * totalCount} práticas feitas · {cyclesCompleted + 1} ciclo
              {cyclesCompleted + 1 > 1 ? 's' : ''} completo{cyclesCompleted + 1 > 1 ? 's' : ''}
            </p>
            <button type="button" className="reino-placa" onClick={handleStartNextCycle}>
              Iniciar o ciclo {cyclesCompleted + 2} <span aria-hidden="true">→</span>
            </button>
            <ProximoCaminho atual="drjoe" />
          </div>
        </div>
      )}

      <UpgradeModal open={showUpgradeModal} onClose={closeUpgradeModal} source="dr_joe_dispenza_locked" />
    </div>
  );
}

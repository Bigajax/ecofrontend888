import { Fragment, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Play, Check, Lock, ArrowLeft, Gift,
  Moon, ShieldCheck, Wind,
  Activity, Zap, TrendingUp,
} from 'lucide-react';
import HomeHeader from '@/components/home/HomeHeader';
import { useAuth } from '@/contexts/AuthContext';

interface ProtocolNight {
  id: string;
  night: number;
  title: string;
  description: string;
  duration: string;
  audioUrl?: string;
  imageUrl?: string;
  hasAudio: boolean;
  gradient: string;
}

const PROTOCOL_NIGHTS: ProtocolNight[] = [
  {
    id: 'night_1',
    night: 1,
    title: 'Desligando o Estado de Alerta',
    description: 'Ensine seu corpo a sair do modo tensão antes de dormir.',
    duration: '5 min',
    audioUrl: '/audio/desligando-estado-alerta.mp3',
    imageUrl: '/images/desligando-estado-alerta.png',
    hasAudio: true,
    gradient: 'linear-gradient(to bottom, #4A4E8A 0%, #14172E 100%)',
  },
  {
    id: 'night_2',
    night: 2,
    title: 'Respiração que Induz o Sono',
    description: 'Ative o sistema responsável pelo relaxamento profundo.',
    duration: '5 min',
    audioUrl: '/audio/respiracao-induz-sono.mp3',
    imageUrl: '/images/respiracao-induz-sono.webp',
    hasAudio: true,
    gradient: 'linear-gradient(to bottom, #6B5B95 0%, #251A45 100%)',
  },
  {
    id: 'night_3',
    night: 3,
    title: 'Esvaziando Pensamentos Repetitivos',
    description: 'Interrompa o ciclo mental que mantém você acordado.',
    duration: '5 min',
    audioUrl: '/audio/esvaziando-pensamentos.mp3',
    imageUrl: '/images/esvaziando-pensamentos.webp',
    hasAudio: true,
    gradient: 'linear-gradient(to bottom, #5B6B95 0%, #1A2545 100%)',
  },
  {
    id: 'night_4',
    night: 4,
    title: 'Liberando Preocupações do Dia',
    description: 'Pare de antecipar o amanhã quando deveria estar descansando.',
    duration: '5 min',
    audioUrl: '/audio/liberando-preocupacoes.mp3',
    imageUrl: '/images/liberando-preocupacoes.webp',
    hasAudio: true,
    gradient: 'linear-gradient(to bottom, #7B5B8A 0%, #2A1A40 100%)',
  },
  {
    id: 'night_5',
    night: 5,
    title: 'Silêncio Interno Guiado',
    description: 'Reduza estímulos e permita que o sono surja naturalmente.',
    duration: '~20 min',
    hasAudio: false,
    gradient: 'linear-gradient(to bottom, #4A6B8A 0%, #142045 100%)',
  },
  {
    id: 'night_6',
    night: 6,
    title: 'Indução ao Sono Profundo',
    description: 'Aprofunde o estado pré-sono com desaceleração progressiva.',
    duration: '~20 min',
    hasAudio: false,
    gradient: 'linear-gradient(to bottom, #6B4A8A 0%, #20142E 100%)',
  },
  {
    id: 'night_7',
    night: 7,
    title: 'Consolidação do Novo Padrão de Sono',
    description: 'Transforme prática em hábito automático.',
    duration: '~25 min',
    hasAudio: false,
    gradient: 'linear-gradient(to bottom, #4A5B8A 0%, #14172E 100%)',
  },
];

// Nights 1–2 always free; nights 3–7 require paid + sequential completion
// VIP users bypass sequential requirement and get all nights unlocked
function isNightAccessible(night: number, completed: Set<number>, isPaid: boolean, isVip: boolean): boolean {
  if (night === 1) return true;
  if (night === 2) return true;
  if (isVip) return true;
  if (!isPaid) return false;
  return completed.has(night - 1);
}

const UPGRADE_PATH = '/app/subscription/demo';

export default function MeditacoesSonoPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isVipUser } = useAuth();
  const uid = user?.id || 'guest';

  const [completedNights, setCompletedNights] = useState<Set<number>>(() => {
    const raw = localStorage.getItem(`eco.sono.protocol.v1.${uid}`);
    if (raw) {
      try {
        return new Set<number>(JSON.parse(raw).completedNights || []);
      } catch {
        return new Set<number>();
      }
    }
    return new Set<number>();
  });

  const [showCompletion, setShowCompletion] = useState(false);

  useEffect(() => {
    localStorage.setItem(`eco.sono.protocol.v1.${uid}`, JSON.stringify({
      completedNights: [...completedNights],
      lastActive: new Date().toISOString(),
    }));
  }, [completedNights, uid]);

  useEffect(() => {
    if (location.state?.returnFromMeditation) {
      const lastPlayedNight = sessionStorage.getItem('eco.sono.lastPlayedNight');
      if (lastPlayedNight) {
        const nightNum = parseInt(lastPlayedNight);
        const markerKey = `eco.meditation.completed80pct.night_${nightNum}`;
        if (localStorage.getItem(markerKey) === 'true') {
          setCompletedNights(prev => {
            const next = new Set([...prev, nightNum]);
            if (next.size === 7) setShowCompletion(true);
            return next;
          });
        }
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const completedCount = completedNights.size;
  const pct = Math.round((completedCount / 7) * 100);
  const nextNight = Math.min(completedCount + 1, 7);

  const heroButtonLabel =
    completedCount === 0
      ? 'Começar Minha Primeira Noite'
      : completedCount === 7
      ? 'Protocolo Concluído 🎉'
      : `Continuar Noite ${nextNight}`;

  const handleNightClick = (night: ProtocolNight) => {
    const accessible = isNightAccessible(night.night, completedNights, isVipUser, isVipUser);

    if (!accessible && night.night > 2) {
      navigate(UPGRADE_PATH);
      return;
    }

    if (!accessible) return;
    if (!night.hasAudio || !night.audioUrl) return;

    sessionStorage.setItem('eco.sono.lastPlayedNight', String(night.night));

    navigate('/app/meditation-player', {
      state: {
        meditation: {
          id: night.id,
          title: night.title,
          duration: night.duration,
          audioUrl: night.audioUrl,
          imageUrl: night.imageUrl ?? '/images/meditacoes-sono-hero.webp',
          backgroundMusic: 'Sono',
          gradient: night.gradient,
          category: 'sono',
          isPremium: false,
        },
        returnTo: '/app/meditacoes-sono',
      },
    });
  };

  const handleHeroButtonClick = () => {
    if (completedCount === 7) {
      setShowCompletion(true);
      return;
    }
    const targetNight = PROTOCOL_NIGHTS[nextNight - 1];
    if (targetNight) handleNightClick(targetNight);
  };

  // ── Tela de Conclusão ─────────────────────────────────────────────────────
  if (showCompletion) {
    return (
      <div className="min-h-screen bg-white font-primary flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-sm w-full">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="font-display text-2xl font-bold text-[var(--eco-text)] sm:text-3xl mb-4 leading-tight">
            Protocolo Concluído
          </h1>
          <p className="text-sm text-[var(--eco-muted)] sm:text-base leading-relaxed mb-8">
            Você recondicionou seu sistema para o descanso.<br />
            Agora você possui ferramentas para dormir sem depender do áudio.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate('/app')}
              className="w-full rounded-full bg-eco-babyDark px-6 py-3 text-sm font-semibold text-white shadow-md hover:shadow-lg hover:brightness-110 transition-all active:scale-95"
            >
              Explorar outros programas
            </button>
            <button
              onClick={() => navigate(UPGRADE_PATH)}
              className="w-full rounded-full border border-eco-baby px-6 py-3 text-sm font-semibold text-eco-babyDark hover:bg-eco-babySoft transition-all active:scale-95"
            >
              Conhecer o Plano Completo
            </button>
          </div>
          <button
            onClick={() => setShowCompletion(false)}
            className="mt-6 text-xs text-[var(--eco-muted)] underline underline-offset-2"
          >
            Ver protocolo novamente
          </button>
        </div>
      </div>
    );
  }

  // ── Página Principal ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white font-primary">
      {user && <HomeHeader />}

      <main className="pb-20">
        {/* Hero Section */}
        <section className="relative flex min-h-[600px] flex-col overflow-hidden sm:min-h-[680px]">
          {/* Navigation */}
          <div className="absolute left-4 top-4 right-4 z-20 flex items-center justify-between sm:left-6 sm:top-6">
            <button
              onClick={() => navigate('/app')}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-[var(--eco-text)] shadow-md backdrop-blur-sm transition-all hover:bg-white hover:shadow-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            {!user && (
              <button
                onClick={() => navigate('/register')}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-eco-babyDark to-eco-baby rounded-full hover:shadow-lg transition-all duration-200"
              >
                Criar conta grátis
              </button>
            )}
          </div>

          {/* Background Image */}
          <div
            className="absolute inset-0 bg-cover"
            style={{
              backgroundImage: 'url("/images/meditacoes-sono-hero.webp")',
              backgroundPosition: 'center center',
              transform: 'scale(1.05)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to bottom, rgba(0,0,0,0.52) 0%, rgba(0,0,0,0.38) 65%, rgba(255,255,255,1) 100%)',
            }}
          />

          {/* Content — constrained column, all elements share one axis */}
          <div className="relative z-10 mx-auto flex w-full max-w-sm flex-col items-center px-6 pt-24 pb-16 text-center sm:max-w-md sm:px-8 sm:pt-28 sm:pb-20">

            {/* Eyebrow */}
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50 sm:text-xs">
              7 Noites · Protocolo Progressivo
            </p>

            {/* Headline */}
            <h1
              className="mt-4 font-display text-[2rem] font-bold text-white sm:text-[2.75rem] leading-[1.12]"
              style={{ textShadow: '0 2px 20px rgba(0,0,0,0.55), 0 1px 4px rgba(0,0,0,0.35)' }}
            >
              Você não tem insônia.<br />
              Você está preso em modo alerta.
            </h1>

            {/* Subtitle — tight to headline */}
            <p
              className="mt-3 text-sm text-white/65 font-light leading-relaxed sm:text-[0.95rem]"
              style={{ textShadow: '0 1px 8px rgba(0,0,0,0.4)' }}
            >
              Em 7 noites você recondiciona seu sistema nervoso para desligar naturalmente.
            </p>

            {/* Benefits — uniform-width pills, same axis as headline */}
            <div className="mt-10 flex w-full flex-col gap-2.5 sm:mt-11">
              {[
                { icon: Moon,        label: 'Adormecer mais rápido' },
                { icon: ShieldCheck, label: 'Reduzir despertares noturnos' },
                { icon: Wind,        label: 'Diminuir ansiedade antes de deitar' },
              ].map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="flex w-full items-center gap-3 rounded-full px-5 py-2.5 text-sm font-medium text-white"
                  style={{
                    background: 'rgba(255,255,255,0.14)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255,255,255,0.28)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), 0 2px 14px rgba(0,0,0,0.18)',
                  }}
                >
                  <Icon className="h-4 w-4 text-eco-baby flex-shrink-0" strokeWidth={2} />
                  {label}
                </span>
              ))}
            </div>

            {/* CTA — same width as pills column */}
            <button
              onClick={handleHeroButtonClick}
              className="mt-8 flex w-full items-center justify-center gap-2.5 rounded-full py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:scale-105 active:scale-95 sm:mt-9 sm:py-4 sm:text-base"
              style={{
                background: 'rgba(255,255,255,0.18)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.35)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 4px 24px rgba(0,0,0,0.2)',
              }}
            >
              {completedCount < 7 && <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-eco-baby" fill="currentColor" />}
              {heroButtonLabel}
            </button>
          </div>
        </section>

        {/* Identification Block */}
        <section className="mx-auto max-w-4xl px-4 pt-8 pb-2 sm:px-8">
          <div className="rounded-2xl bg-eco-babySoft border border-eco-baby/30 px-5 py-4 sm:px-6 sm:py-5">
            <p className="text-sm text-[var(--eco-text)] sm:text-base leading-relaxed">
              Se você deita cansado, mas sua mente começa a trabalhar…<br />
              Se o corpo quer dormir, mas o cérebro insiste em resolver a vida…<br />
              <span className="font-semibold text-eco-babyDark">Esse protocolo foi feito para você.</span>
            </p>
          </div>
        </section>

        {/* Progress Bar */}
        <section className="mx-auto max-w-4xl px-4 pt-6 pb-2 sm:px-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[var(--eco-text)]">
              {completedCount === 7
                ? 'Programa concluído!'
                : `Você está na Noite ${nextNight} de 7`}
            </span>
            <span className="text-sm font-semibold text-eco-babyDark">{pct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-eco-babySoft">
            <div
              className="h-2 rounded-full bg-eco-babyDark transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-[var(--eco-muted)]">
            {completedCount} de 7 noites concluídas
          </p>
        </section>

        {/* Night Cards */}
        <section className="mx-auto max-w-4xl px-4 py-4 sm:px-8">
          {/* Free tier seal */}
          <p className="mb-3 text-xs font-medium text-eco-babyDark">
            🔓 2 primeiras noites liberadas gratuitamente
          </p>

          <div className="space-y-3">
            {PROTOCOL_NIGHTS.map((night, index) => {
              const accessible = isNightAccessible(night.night, completedNights, isVipUser, isVipUser);
              const completed = completedNights.has(night.night);
              const paidLocked = night.night > 2 && !isVipUser;
              const sequentialLocked = night.night > 2 && isVipUser && !accessible;
              const comingSoon = accessible && !night.hasAudio;

              return (
                <Fragment key={night.id}>
                  <div
                    onClick={() => handleNightClick(night)}
                    className={`flex items-center gap-3 rounded-2xl border p-3 sm:p-4 transition-all duration-200 ${
                      sequentialLocked
                        ? 'opacity-50 cursor-not-allowed border-[var(--eco-line)] bg-white'
                        : paidLocked
                        ? 'cursor-pointer border-eco-baby/30 bg-white hover:border-eco-baby hover:shadow-[0_4px_16px_rgba(110,200,255,0.15)]'
                        : comingSoon
                        ? 'cursor-default border-[var(--eco-line)] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
                        : completed
                        ? 'cursor-pointer border-eco-baby/40 bg-eco-babySoft/40 shadow-[0_2px_8px_rgba(110,200,255,0.1)] hover:shadow-[0_4px_16px_rgba(110,200,255,0.2)]'
                        : 'cursor-pointer border-[var(--eco-line)] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:border-eco-baby/40 hover:shadow-[0_4px_16px_rgba(110,200,255,0.1)]'
                    }`}
                  >
                    {/* Status Icon */}
                    <div className="flex-shrink-0">
                      {completed ? (
                        <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-eco-babyDark">
                          <Check className="h-4 w-4 sm:h-5 sm:w-5 text-white" strokeWidth={3} />
                        </div>
                      ) : sequentialLocked ? (
                        <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-gray-100">
                          <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
                        </div>
                      ) : (
                        <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full border-2 border-eco-baby">
                          <span className="text-xs font-bold text-eco-babyDark">{night.night}</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex flex-1 items-center justify-between gap-2 min-w-0">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-[var(--eco-text)] sm:text-base">
                          Noite {night.night} – {night.title}
                        </h3>
                        <p className="mt-0.5 text-xs text-[var(--eco-muted)] sm:text-sm">
                          {night.description}
                        </p>
                      </div>

                      <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
                        <span className="text-xs text-[var(--eco-muted)] sm:text-sm whitespace-nowrap">
                          {night.duration}
                        </span>

                        {paidLocked ? (
                          <span className="text-xs font-semibold text-eco-babyDark bg-eco-babySoft border border-eco-baby/40 px-2.5 py-1.5 rounded-full whitespace-nowrap">
                            Desbloquear
                          </span>
                        ) : comingSoon ? (
                          <span className="text-xs font-medium text-eco-babyDark bg-eco-babySoft px-2 py-1 rounded-full whitespace-nowrap">
                            Em breve
                          </span>
                        ) : (
                          <div
                            className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full ${
                              sequentialLocked ? 'bg-gray-100' : 'bg-eco-babySoft'
                            }`}
                          >
                            <Play
                              className={`h-4 w-4 sm:h-5 sm:w-5 ${
                                sequentialLocked ? 'text-gray-300' : 'text-eco-babyDark'
                              }`}
                              fill="currentColor"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* CTA intermediário após noite 2 */}
                  {index === 1 && !isVipUser && (
                    <div className="rounded-2xl border border-eco-baby/30 bg-eco-babySoft px-4 py-5 sm:px-5 text-center">
                      <p className="text-sm font-medium text-[var(--eco-text)] sm:text-base leading-snug">
                        Você já começou a sentir a diferença.<br />
                        <span className="text-[var(--eco-muted)] font-normal">Desbloqueie o restante do protocolo e complete as 7 noites.</span>
                      </p>
                      <button
                        onClick={() => navigate(UPGRADE_PATH)}
                        className="mt-4 inline-flex items-center gap-2 rounded-full bg-eco-babyDark px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:brightness-110 hover:scale-105 active:scale-95 transition-all duration-200"
                      >
                        Quero desbloquear agora
                      </button>
                    </div>
                  )}
                </Fragment>
              );
            })}
          </div>
        </section>

        {/* Bonus SOS */}
        <section className="mx-auto max-w-4xl px-4 pt-2 pb-4 sm:px-8">
          <div
            className={`flex items-center gap-3 rounded-2xl border p-3 sm:p-4 transition-all duration-200 ${
              isVipUser
                ? 'border-amber-200 bg-amber-50/40 cursor-pointer hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]'
                : 'opacity-60 cursor-not-allowed border-[var(--eco-line)] bg-gray-50/60'
            }`}
          >
            <div
              className={`flex-shrink-0 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full ${
                isVipUser ? 'bg-amber-100' : 'bg-gray-100'
              }`}
            >
              {isVipUser
                ? <Gift className="h-4 w-4 text-amber-600" />
                : <Lock className="h-3.5 w-3.5 text-gray-400" />
              }
            </div>
            <div className="flex flex-1 items-center justify-between gap-2 min-w-0">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-[var(--eco-text)] sm:text-base">
                  🎁 Áudio Extra – SOS: Não Consigo Dormir Hoje
                </h3>
                <p className="mt-0.5 text-xs text-[var(--eco-muted)] sm:text-sm">
                  Uma prática curta para momentos de insônia inesperada.
                </p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
                <span className="text-xs text-[var(--eco-muted)] whitespace-nowrap">5 min</span>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${
                    isVipUser
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {isVipUser ? 'Disponível' : 'Premium'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Authority Block */}
        <section className="mx-auto max-w-4xl px-4 pt-6 pb-12 sm:px-8">
          <h3 className="text-base font-semibold text-[var(--eco-text)] sm:text-lg mb-2">
            Por que este protocolo funciona?
          </h3>
          <p className="text-sm text-[var(--eco-muted)] sm:text-base mb-4">
            Baseado em princípios de:
          </p>
          <ul className="space-y-3">
            <li className="flex items-center gap-3 text-sm text-[var(--eco-muted)] sm:text-base">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-eco-babySoft">
                <Activity className="h-4 w-4 text-eco-babyDark" />
              </div>
              Regulação do sistema nervoso
            </li>
            <li className="flex items-center gap-3 text-sm text-[var(--eco-muted)] sm:text-base">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-eco-babySoft">
                <Zap className="h-4 w-4 text-eco-babyDark" />
              </div>
              Desaceleração cognitiva
            </li>
            <li className="flex items-center gap-3 text-sm text-[var(--eco-muted)] sm:text-base">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-eco-babySoft">
                <TrendingUp className="h-4 w-4 text-eco-babyDark" />
              </div>
              Condicionamento progressivo do sono
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}

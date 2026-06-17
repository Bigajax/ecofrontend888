/**
 * SonoNightsJourney
 *
 * Linha do tempo vertical das 7 noites do Protocolo Sono, exibida na tela de
 * conclusão (MeditationCompletion) para o fluxo sono autenticado. Mostra o arco
 * narrativo completo (títulos reais de PROTOCOL_NIGHTS), o progresso e uma CTA
 * forte para a próxima noite — dando sensação de jornada/sequência.
 *
 * Fonte única dos dados: PROTOCOL_NIGHTS (corrige a incoerência de títulos do
 * antigo RELATED_BY_CATEGORY).
 */

import { motion } from 'framer-motion';
import { Check, Lock, Play, Moon, ArrowRight } from 'lucide-react';
import { PROTOCOL_NIGHTS } from '@/data/protocolNights';

const SERIF = 'var(--font-subtitle, Lora, serif)';
const LIT = 'rgba(167,139,250,0.55)';
const DIM = 'rgba(255,255,255,0.10)';

export interface SonoNightsJourneyProps {
  /** Noite recém-concluída (1..7). */
  currentNight: number;
  /** Noites já concluídas (números). */
  completedNights: number[];
  /** Acesso pago (libera noites 2–7). */
  isPaid: boolean;
  /** Toca a noite (ou roteia pra oferta se bloqueada) — gate centralizado no pai. */
  onPlayNight: (night: number) => void;
  /** Próximo passo quando o protocolo está concluído (ponte pro resto do app). */
  onExploreApp?: () => void;
}

export default function SonoNightsJourney({
  currentNight,
  completedNights,
  isPaid,
  onPlayNight,
  onExploreApp,
}: SonoNightsJourneyProps) {
  // Protocolo SEQUENCIAL: o progresso é a noite mais avançada alcançada (a
  // recém-concluída ou a maior já registrada). Tudo até ela conta como concluído,
  // e a próxima é a seguinte — não o primeiro "buraco" (que sugeria a Noite 2
  // mesmo após concluir a 4).
  const inRange = (n: number) => n >= 1 && n <= 7;
  const maxReached = Math.max(
    inRange(currentNight) ? currentNight : 0,
    ...completedNights.filter(inRange),
    0,
  );
  const completed = new Set<number>();
  for (let i = 1; i <= maxReached; i++) completed.add(i);
  const nextNight = maxReached < 7 ? maxReached + 1 : null;
  const remaining = Math.max(0, 7 - maxReached);
  const done = maxReached >= 7;
  const progressLabel = Math.max(1, Math.min(maxReached, 7));

  return (
    <div
      className="rounded-2xl px-5 py-6 sm:px-6"
      style={{
        background: 'linear-gradient(160deg, rgba(20,23,46,0.55) 0%, rgba(8,12,30,0.65) 100%)',
        border: '1px solid rgba(124,91,138,0.22)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* ── Header / Celebração ── */}
      {done ? (
        /* Estado concluído: celebração + próximo passo (sem beco sem saída) */
        <div className="mb-7 flex flex-col items-center text-center">
          <motion.div
            className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(167,139,250,0.30) 0%, rgba(167,139,250,0.06) 70%)',
            }}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 80, damping: 16 }}
          >
            <motion.span
              className="absolute inset-0 rounded-full"
              style={{ border: '1px solid rgba(196,181,253,0.5)' }}
              animate={{ scale: [1, 1.35], opacity: [0.5, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
            />
            <Moon className="h-8 w-8" style={{ color: '#C4B5FD' }} />
          </motion.div>

          <p
            className="text-[11px] font-bold uppercase tracking-[0.22em]"
            style={{ color: 'rgba(196,181,253,0.6)' }}
          >
            Protocolo concluído · 7 de 7
          </p>
          <h3
            className="mt-2 font-display text-[27px] font-bold leading-tight text-white"
            style={{ textShadow: '0 0 30px rgba(167,139,250,0.4)' }}
          >
            Seu corpo já
            <br />
            sabe dormir.
          </h3>
          <p
            className="mt-3 max-w-[300px] text-[14px] italic leading-relaxed"
            style={{ fontFamily: SERIF, color: 'rgba(255,255,255,0.5)' }}
          >
            Você não precisa mais do áudio — o padrão mudou. Volte a qualquer noite
            sempre que precisar.
          </p>

          {onExploreApp && (
            <button
              onClick={onExploreApp}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-[15px] font-bold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.97]"
              style={{
                background: 'linear-gradient(135deg, #A78BFA 0%, #5A3DB0 100%)',
                boxShadow: '0 10px 32px rgba(124,58,237,0.45)',
              }}
            >
              Explorar o app
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="mb-7 text-center">
          <p
            className="text-[11px] font-bold uppercase tracking-[0.22em]"
            style={{ color: 'rgba(196,181,253,0.55)' }}
          >
            Sua jornada pro sono
          </p>
          <h3
            className="mt-1.5 font-display text-[26px] font-bold text-white"
            style={{ textShadow: '0 0 30px rgba(167,139,250,0.35)' }}
          >
            {`Noite ${progressLabel} de 7`}
          </h3>

          {/* 7-dot progress */}
          <div className="mt-3 flex items-center justify-center gap-1.5" aria-hidden>
            {PROTOCOL_NIGHTS.map((n) => {
              const isDone = completed.has(n.night);
              const isNext = n.night === nextNight;
              return (
                <span
                  key={n.night}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: isNext ? 18 : 6,
                    height: 6,
                    background: isDone
                      ? '#A78BFA'
                      : isNext
                        ? 'rgba(196,181,253,0.5)'
                        : 'rgba(255,255,255,0.14)',
                    boxShadow: isDone ? '0 0 8px rgba(167,139,250,0.6)' : 'none',
                  }}
                />
              );
            })}
          </div>

          <p
            className="mt-3 text-[13.5px] italic leading-snug"
            style={{ fontFamily: SERIF, color: 'rgba(255,255,255,0.46)' }}
          >
            {`Faltam ${remaining} ${remaining === 1 ? 'noite' : 'noites'} pro seu corpo dormir sozinho.`}
          </p>
        </div>
      )}

      {/* Rótulo da lista quando concluído (revisitar) */}
      {done && (
        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <span
            className="text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{ color: 'rgba(196,181,253,0.45)' }}
          >
            Suas 7 noites · revisite quando quiser
          </span>
          <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
        </div>
      )}

      {/* ── Timeline ── */}
      <div>
        {PROTOCOL_NIGHTS.map((night, idx) => {
          const isDone = completed.has(night.night);
          const isNext = night.night === nextNight;
          const locked = !isPaid && !night.isFree && !isDone;
          const isLast = idx === PROTOCOL_NIGHTS.length - 1;

          return (
            <motion.div
              key={night.id}
              className="relative flex gap-3.5"
              style={{ paddingBottom: isLast ? 0 : 18 }}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * idx, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            >
              {/* Node column */}
              <div className="relative flex-shrink-0" style={{ width: 28 }}>
                {/* Connector below this node */}
                {!isLast && (
                  <span
                    className="absolute left-1/2 -translate-x-1/2"
                    style={{ top: 28, bottom: 0, width: 2, background: isDone ? LIT : DIM }}
                  />
                )}

                {/* Node */}
                <div
                  className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full"
                  style={
                    isDone
                      ? {
                          background: 'linear-gradient(135deg, #A78BFA 0%, #6D42C9 100%)',
                          boxShadow: '0 0 12px rgba(167,139,250,0.5)',
                        }
                      : isNext
                        ? {
                            background: 'rgba(167,139,250,0.18)',
                            border: '1px solid rgba(196,181,253,0.6)',
                          }
                        : {
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.14)',
                          }
                  }
                >
                  {/* Pulsing ring on the next node */}
                  {isNext && (
                    <motion.span
                      className="absolute inset-0 rounded-full"
                      style={{ border: '1px solid rgba(196,181,253,0.7)' }}
                      animate={{ scale: [1, 1.45], opacity: [0.6, 0] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                    />
                  )}
                  {isDone ? (
                    <Check className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                  ) : locked ? (
                    <Lock className="h-3 w-3" style={{ color: 'rgba(255,255,255,0.40)' }} />
                  ) : (
                    <span
                      className="text-[11px] font-bold"
                      style={{ color: isNext ? '#C4B5FD' : 'rgba(255,255,255,0.45)' }}
                    >
                      {night.night}
                    </span>
                  )}
                </div>
              </div>

              {/* Content */}
              {isNext ? (
                <div
                  className="min-w-0 flex-1 rounded-xl px-4 py-3.5"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(167,139,250,0.14) 0%, rgba(90,61,176,0.10) 100%)',
                    border: '1px solid rgba(167,139,250,0.30)',
                  }}
                >
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.16em]"
                    style={{ color: 'rgba(196,181,253,0.7)' }}
                  >
                    {locked ? 'Próxima · bloqueada' : 'Próxima noite'}
                  </p>
                  <p className="mt-1 font-display text-[15px] font-bold leading-snug text-white">
                    Noite {night.night} — {night.title}
                  </p>
                  <p
                    className="mt-1 text-[13px] italic leading-relaxed"
                    style={{ fontFamily: SERIF, color: 'rgba(255,255,255,0.55)' }}
                  >
                    {night.description}
                  </p>
                  <button
                    onClick={() => onPlayNight(night.night)}
                    className="mt-3.5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-bold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.97]"
                    style={
                      locked
                        ? {
                            background: 'rgba(255,255,255,0.10)',
                            border: '1px solid rgba(255,255,255,0.18)',
                          }
                        : {
                            background: 'linear-gradient(135deg, #A78BFA 0%, #5A3DB0 100%)',
                            boxShadow: '0 8px 28px rgba(124,58,237,0.45)',
                          }
                    }
                  >
                    {locked ? (
                      <>
                        <Lock className="h-3.5 w-3.5" /> Desbloquear Noite {night.night}
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5" fill="currentColor" /> Iniciar Noite {night.night}
                      </>
                    )}
                    <span className="ml-1 text-[12px] font-medium opacity-70">{night.duration}</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => onPlayNight(night.night)}
                  disabled={locked}
                  className={`flex min-w-0 flex-1 flex-col items-start pt-0.5 text-left ${
                    locked ? 'cursor-default' : 'transition-opacity hover:opacity-80'
                  }`}
                  aria-label={`Noite ${night.night}: ${night.title}`}
                >
                  <p
                    className="font-display text-[14px] font-semibold leading-snug"
                    style={{ color: isDone ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.42)' }}
                  >
                    Noite {night.night} — {night.title}
                  </p>
                  <p
                    className="mt-0.5 text-[11.5px]"
                    style={{ color: isDone ? 'rgba(196,181,253,0.6)' : 'rgba(255,255,255,0.28)' }}
                  >
                    {isDone ? 'Concluída' : night.duration}
                  </p>
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

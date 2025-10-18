// src/components/Sequence.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, X } from 'lucide-react';
import { slides, OnboardingSlideData } from '../data/slides';
import mixpanel from '../lib/mixpanel';

interface SequenceProps {
  onClose: () => void;
  onComplete: () => void;
}

const orbPulseTransition = { duration: 6, repeat: Infinity, ease: 'easeInOut' } as const;
const floatTransition = { duration: 10, repeat: Infinity, ease: 'easeInOut' } as const;
const spinTransition = { duration: 18, repeat: Infinity, ease: 'linear' } as const;

const Sequence: React.FC<SequenceProps> = ({ onClose, onComplete }) => {
  const [slideIndex, setSlideIndex] = useState(0);
  const totalSlides = slides.length;
  const currentSlideData = slides[slideIndex];
  const prefersReducedMotion = useReducedMotion();

  const navLockRef = useRef(false);
  const unlockNavigation = () => window.setTimeout(() => (navLockRef.current = false), 200);

  useEffect(() => {
    mixpanel.track('Front-end: Tour Slide', {
      index: slideIndex,
      id: currentSlideData?.id,
      title: currentSlideData?.title,
    });
  }, [slideIndex, currentSlideData?.id, currentSlideData?.title]);

  const goTo = useCallback(
    (index: number) => {
      if (index === slideIndex || index < 0 || index >= totalSlides) return;
      setSlideIndex(index);
      mixpanel.track('Front-end: Tour Dot Click', {
        from: slideIndex,
        to: index,
        target: slides[index]?.id,
      });
    },
    [slideIndex, totalSlides]
  );

  const handleNext = useCallback(() => {
    if (navLockRef.current) return;
    navLockRef.current = true;

    if (slideIndex < totalSlides - 1) {
      mixpanel.track('Front-end: Tour Next', {
        from: slideIndex,
        to: slideIndex + 1,
        current: currentSlideData?.id,
      });
      setSlideIndex((i) => i + 1);
      unlockNavigation();
      return;
    }

    mixpanel.track('Front-end: Tour CTA Final Click', { id: currentSlideData?.id });
    onComplete();
  }, [currentSlideData?.id, onComplete, slideIndex, totalSlides]);

  const handlePrev = useCallback(() => {
    if (navLockRef.current || slideIndex === 0) return;
    navLockRef.current = true;
    mixpanel.track('Front-end: Tour Prev', {
      from: slideIndex,
      to: slideIndex - 1,
      current: currentSlideData?.id,
    });
    setSlideIndex((i) => i - 1);
    unlockNavigation();
  }, [currentSlideData?.id, slideIndex]);

  const handleSkip = useCallback(() => {
    mixpanel.track('Front-end: Tour Skip', { at: slideIndex, id: currentSlideData?.id });
    onComplete();
  }, [currentSlideData?.id, onComplete, slideIndex]);

  const handleKeydown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') handleNext();
      if (event.key === 'ArrowLeft') handlePrev();
      if (event.key === 'Escape') onClose();
    },
    [handleNext, handlePrev, onClose]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [handleKeydown]);

  const renderVisual = (slide: OnboardingSlideData) => {
    switch (slide.visual) {
      case 'orb':
        return (
          <div className="relative flex items-center justify-center">
            <div className="absolute h-48 w-48 sm:h-56 sm:w-56 rounded-full bg-sky-100/60 dark:bg-sky-500/10 blur-3xl" />
            <motion.div
              className="relative h-44 w-44 sm:h-52 sm:w-52 rounded-full bg-gradient-to-br from-[#c5e5ff] via-[#e0f0ff] to-white shadow-[0_28px_70px_rgba(15,23,42,0.12)]"
              animate={prefersReducedMotion ? undefined : { scale: [1, 1.035, 1] }}
              transition={orbPulseTransition}
            >
              <div className="absolute inset-[18%] rounded-full border border-white/60 bg-white/30 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]" />
              <div className="absolute inset-[34%] rounded-full bg-white/60 backdrop-blur-2xl" />
              <div className="absolute inset-[48%] rounded-full bg-[#9ecfff]/60 blur-xl" />
            </motion.div>
          </div>
        );
      case 'mirror':
        return (
          <div className="flex flex-col items-center gap-6">
            <div className="relative flex items-center justify-center">
              <div className="absolute h-48 w-48 sm:h-56 sm:w-56 rounded-full bg-sky-200/30 dark:bg-slate-700/30 blur-3xl" />
              <motion.div
                className="relative h-44 w-44 sm:h-52 sm:w-52 rounded-full border border-white/50 bg-white/40 backdrop-blur-3xl shadow-[0_18px_50px_rgba(15,23,42,0.12)]"
                animate={prefersReducedMotion ? undefined : { scale: [1, 1.015, 1] }}
                transition={orbPulseTransition}
              >
                <motion.div
                  className="absolute inset-[22%]"
                  animate={prefersReducedMotion ? undefined : { rotate: 360 }}
                  transition={spinTransition}
                >
                  <div className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-sky-500/70 shadow-[0_0_12px_rgba(59,130,246,0.55)]" />
                  <div className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-indigo-500/70 shadow-[0_0_12px_rgba(99,102,241,0.45)]" />
                  <div className="absolute left-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-emerald-500/70 shadow-[0_0_12px_rgba(16,185,129,0.45)]" />
                </motion.div>
                <div className="absolute inset-[34%] rounded-full border border-white/40 bg-gradient-to-br from-white/65 via-white/40 to-transparent" />
              </motion.div>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-300/80">
              <span className="text-slate-700 dark:text-white/90">Hoje</span>
              <span className="h-px w-10 bg-slate-300/60" aria-hidden="true" />
              <span>Padrões</span>
              <span className="h-px w-10 bg-slate-300/60" aria-hidden="true" />
              <span>Memórias</span>
              <span className="h-px w-10 bg-slate-300/60" aria-hidden="true" />
              <span>Você crescendo</span>
            </div>
          </div>
        );
      case 'usage':
        return (
          <div className="flex flex-col items-center gap-5">
            <div className="relative flex items-center justify-center">
              <div className="absolute h-48 w-48 sm:h-56 sm:w-56 rounded-full bg-blue-100/40 dark:bg-blue-500/10 blur-3xl" />
              <motion.div
                className="relative flex h-40 w-40 sm:h-48 sm:w-48 flex-col items-center justify-center rounded-[28px] border border-white/40 bg-white/60 dark:bg-white/5 shadow-[0_16px_50px_rgba(15,23,42,0.14)] backdrop-blur-3xl"
                animate={prefersReducedMotion ? undefined : { y: [-4, 4, -4] }}
                transition={floatTransition}
              >
                <div className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-white/40 via-white/20 to-transparent" />
                <motion.div
                  className="relative z-10 flex items-center gap-4 text-3xl"
                  animate={prefersReducedMotion ? undefined : { scale: [1, 1.06, 1] }}
                  transition={orbPulseTransition}
                >
                  <span aria-hidden="true">🎙️</span>
                  <span aria-hidden="true">💬</span>
                </motion.div>
                <p className="relative z-10 mt-3 text-sm font-medium text-slate-600 dark:text-slate-200">
                  Texto · Voz · Pausa guiada
                </p>
              </motion.div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/40 bg-white/50 px-4 py-1.5 text-xs font-medium text-slate-600 shadow-[0_10px_25px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:bg-white/10 dark:text-slate-200">
              <span aria-hidden="true">🔐</span>
              <span>Tudo criptografado e só seu</span>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-6 sm:py-12 dark:from-slate-950 dark:to-slate-900"
      style={{ paddingBottom: `max(2.5rem, calc(env(safe-area-inset-bottom, 0px) + 1.5rem))` }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-28 h-72 w-72 rounded-full bg-[#b8d8ff]/40 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-64 w-64 rounded-full bg-[#d6e9ff]/35 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-80px] h-80 w-80 rounded-full bg-[#cde9ff]/30 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(59,130,246,0.08),transparent_60%)]" />
      </div>

      <button
        onClick={onClose}
        aria-label="Fechar tour"
        className="absolute right-4 top-4 z-40 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70 text-slate-500 shadow-[0_12px_28px_rgba(15,23,42,0.12)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/90 hover:text-slate-700 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20"
      >
        <X size={18} />
      </button>

      <AnimatePresence mode="wait">
        <motion.article
          key={currentSlideData.id}
          initial={{ opacity: 0, scale: 0.97, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: -18 }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
          className="relative z-30 mx-auto flex w-full max-w-md flex-col items-center rounded-[28px] border border-white/20 bg-white/60 p-8 text-center shadow-[0_18px_55px_rgba(15,23,42,0.16)] backdrop-blur-2xl sm:p-10 dark:border-white/15 dark:bg-white/10"
        >
          <div className="flex w-full flex-col items-center gap-6">
            <header className="flex flex-col gap-3">
              <h2 className="text-[1.75rem] font-semibold leading-snug text-slate-900 sm:text-2xl dark:text-white">
                {currentSlideData.title}
              </h2>
              <div className="flex flex-col gap-3 text-[15px] leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
                {currentSlideData.paragraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </header>

            <div className="flex w-full flex-col items-center gap-4">
              {renderVisual(currentSlideData)}
              {currentSlideData.subtext ? (
                <p className="text-sm font-medium text-slate-500 dark:text-slate-300/80">
                  {currentSlideData.subtext}
                </p>
              ) : null}
              {currentSlideData.badges ? (
                <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
                  {currentSlideData.badges.map((badge) => (
                    <span
                      key={badge.label}
                      className="inline-flex items-center gap-1 rounded-full border border-white/40 bg-white/60 px-3 py-1 text-xs font-medium text-slate-600 shadow-[0_8px_20px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/10 dark:text-slate-200"
                    >
                      <span aria-hidden="true">{badge.icon}</span>
                      <span>{badge.label}</span>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="mt-2 flex w-full flex-col items-center gap-5">
              <div className="w-full">
                <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/40 dark:bg-white/10">
                  <motion.span
                    className="absolute inset-y-0 left-0 rounded-full bg-slate-900/70 dark:bg-white/80"
                    initial={false}
                    animate={{ width: `${((slideIndex + 1) / totalSlides) * 100}%` }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                  />
                </div>
                <div className="mt-3 flex items-center justify-center gap-2">
                  {slides.map((slide, index) => {
                    const active = index === slideIndex;
                    return (
                      <button
                        key={slide.id}
                        onClick={() => goTo(index)}
                        aria-label={`Ir para ${slide.title}`}
                        aria-current={active}
                        className={`relative h-2.5 w-2.5 rounded-full transition ${
                          active
                            ? 'bg-slate-900 shadow-[0_0_0_4px_rgba(148,163,184,0.25)] dark:bg-white'
                            : 'bg-slate-300/80 hover:bg-slate-400/80 dark:bg-white/30 dark:hover:bg-white/45'
                        }`}
                        type="button"
                      >
                        {active ? (
                          <motion.span
                            layoutId="onboarding-active-dot"
                            className="absolute inset-[-6px] rounded-full bg-slate-900/5"
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex w-full items-center gap-3">
                {slideIndex > 0 ? (
                  <button
                    onClick={handlePrev}
                    type="button"
                    className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-white/40 bg-white/50 px-4 text-sm font-medium text-slate-600 shadow-[0_12px_28px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                  >
                    <ArrowLeft size={16} />
                    Voltar
                  </button>
                ) : (
                  <span className="hidden flex-1 sm:block" aria-hidden="true" />
                )}

                <button
                  onClick={handleNext}
                  type="button"
                  className="inline-flex h-11 flex-[1.35] items-center justify-center rounded-2xl bg-[#007AFF] px-4 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(0,122,255,0.28)] transition hover:-translate-y-0.5 hover:bg-[#1a84ff] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#79b7ff]/80"
                >
                  {currentSlideData.ctaLabel}
                </button>
              </div>
            </div>
          </div>
        </motion.article>
      </AnimatePresence>

      <div className="absolute inset-x-0 bottom-6 z-40 flex justify-center">
        <button
          onClick={handleSkip}
          type="button"
          className="text-sm font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
        >
          Pular tour
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
        className="pointer-events-none absolute bottom-6 right-4 hidden max-w-[220px] items-center gap-2 rounded-2xl border border-white/30 bg-white/60 px-4 py-2 text-xs font-medium text-slate-600 shadow-[0_12px_30px_rgba(15,23,42,0.12)] backdrop-blur-2xl md:flex dark:border-white/10 dark:bg-white/10 dark:text-slate-200"
      >
        <span aria-hidden="true">✨</span>
        Versão Beta · 7 minutos por dia de clareza emocional
      </motion.div>
    </div>
  );
};

export default Sequence;

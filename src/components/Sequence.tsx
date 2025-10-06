// src/components/Sequence.tsx
import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import Slide from './Slide';
import { slides } from '../data/slides';
import mixpanel from '../lib/mixpanel';

interface SequenceProps {
  onClose: () => void;
  onComplete: () => void;
}

const SWIPE_THRESHOLD = 40; // px

const Sequence: React.FC<SequenceProps> = ({ onClose, onComplete }) => {
  const [slideIndex, setSlideIndex] = useState(0);
  const totalSlides = slides.length;
  const currentSlideData = slides[slideIndex];
  const prefersReducedMotion = useReducedMotion();

  // Evita múltiplos avanços por keydown/click
  const navLockRef = useRef(false);
  const lock = () => (navLockRef.current = true);
  const unlock = () => setTimeout(() => (navLockRef.current = false), 180);

  // Gestos (swipe)
  const startXRef = useRef<number | null>(null);
  const draggingRef = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    startXRef.current = e.clientX;
    draggingRef.current = true;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!draggingRef.current || startXRef.current == null) return;
    const delta = e.clientX - startXRef.current;
    draggingRef.current = false;
    startXRef.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD) return;
    if (delta < 0) handleNext(); // arrastou para esquerda
    else handlePrev(); // arrastou para direita
  };

  // Track
  useEffect(() => {
    mixpanel.track('Front-end: Tour Slide', {
      index: slideIndex,
      title: currentSlideData?.title,
    });
  }, [slideIndex, currentSlideData?.title]);

  const handleNext = () => {
    if (navLockRef.current) return;
    lock();
    if (slideIndex < totalSlides - 1) {
      mixpanel.track('Front-end: Tour Next', { from: slideIndex, to: slideIndex + 1 });
      setSlideIndex((i) => i + 1);
      unlock();
    } else {
      mixpanel.track('Front-end: Tour CTA Final Click');
      onComplete();
    }
  };

  const handlePrev = () => {
    if (navLockRef.current) return;
    if (slideIndex > 0) {
      lock();
      mixpanel.track('Front-end: Tour Prev', { from: slideIndex, to: slideIndex - 1 });
      setSlideIndex((i) => i - 1);
      unlock();
    }
  };

  const goToSlide = (i: number) => {
    if (i === slideIndex) return;
    mixpanel.track('Front-end: Tour Dot Click', { from: slideIndex, to: i });
    setSlideIndex(i);
  };

  // Atalhos de teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideIndex]);

  // Anima só no primeiro slide
  const eyeState: 'idle' | 'thinking' =
    slideIndex === 0 && !prefersReducedMotion ? 'thinking' : 'idle';

  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden bg-white"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      {/* Fechar */}
      <button
        onClick={onClose}
        aria-label="Fechar"
        className="absolute right-3.5 top-3.5 inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100/70 hover:text-slate-700 transition z-10"
      >
        <X size={18} />
      </button>

      {/* Pular tour */}
      <button
        onClick={() => {
          mixpanel.track('Front-end: Tour Skip');
          onClose();
        }}
        className="absolute left-3.5 top-3.5 h-9 px-3 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition z-10"
      >
        Pular tour
      </button>

      {/* Slide com transição */}
      <div className="relative w-full h-full flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={slideIndex}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {currentSlideData && (
              <Slide
                title={currentSlideData.title}
                text={currentSlideData.text}
                bubblePosition={currentSlideData.bubblePosition as any}
                background={currentSlideData.background}
                pills={(currentSlideData as any).pills}
                eyeBubble={{ enabled: true, state: eyeState, size: 240 }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controles (fixos no rodapé) */}
      <div
        className="absolute bottom-5 md:bottom-6 left-0 right-0 flex items-center justify-center gap-4 z-10"
        role="navigation"
        aria-label="Controles do tour"
      >
        {slideIndex > 0 ? (
          <button
            onClick={handlePrev}
            aria-label="Anterior"
            className="btn-apple !h-10 !w-10 !p-0 rounded-full flex items-center justify-center"
          >
            <ArrowLeft size={18} />
          </button>
        ) : (
          <div className="w-10" aria-hidden="true" />
        )}

        {/* Dots + contador invisível */}
        <div className="flex items-center gap-2.5" role="tablist" aria-label="Slides do tour">
          <span className="sr-only" aria-live="polite">
            Slide {slideIndex + 1} de {totalSlides}
          </span>
          {slides.map((s, i) => {
            const active = i === slideIndex;
            return (
              <button
                key={s.title + i}
                onClick={() => goToSlide(i)}
                role="tab"
                aria-selected={active}
                aria-label={`Ir para o slide ${i + 1}: ${s.title}`}
                aria-current={active ? 'page' : undefined}
                className={[
                  'rounded-full transition-all duration-200',
                  active
                    ? 'w-2.5 h-2.5 bg-slate-900 ring-2 ring-slate-300/50 shadow-[0_0_0_1px_rgba(255,255,255,.8)_inset]'
                    : 'w-2 h-2 bg-slate-300 hover:bg-slate-400',
                ].join(' ')}
              />
            );
          })}
        </div>

        {slideIndex < totalSlides - 1 ? (
          <button
            onClick={handleNext}
            aria-label="Próximo"
            className="btn-apple !h-10 !w-10 !p-0 rounded-full flex items-center justify-center"
          >
            <ArrowRight size={18} />
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="btn-apple btn-apple-primary px-5 h-11 rounded-2xl"
          >
            Começar agora
          </button>
        )}
      </div>
    </div>
  );
};

export default Sequence;

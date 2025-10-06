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

const Sequence: React.FC<SequenceProps> = ({ onClose, onComplete }) => {
  const [slideIndex, setSlideIndex] = useState(0);
  const totalSlides = slides.length;
  const currentSlideData = slides[slideIndex];
  const prefersReducedMotion = useReducedMotion();

  // evita avanço duplo
  const navLockRef = useRef(false);
  const navUnlock = () => setTimeout(() => (navLockRef.current = false), 180);

  useEffect(() => {
    mixpanel.track('Front-end: Tour Slide', {
      index: slideIndex,
      title: currentSlideData?.title,
    });
  }, [slideIndex, currentSlideData?.title]);

  const handleNext = () => {
    if (navLockRef.current) return;
    navLockRef.current = true;
    if (slideIndex < totalSlides - 1) {
      mixpanel.track('Front-end: Tour Next', { from: slideIndex, to: slideIndex + 1 });
      setSlideIndex((i) => i + 1);
      navUnlock();
    } else {
      mixpanel.track('Front-end: Tour CTA Final Click');
      onComplete();
    }
  };

  const handlePrev = () => {
    if (navLockRef.current) return;
    if (slideIndex > 0) {
      navLockRef.current = true;
      mixpanel.track('Front-end: Tour Prev', { from: slideIndex, to: slideIndex - 1 });
      setSlideIndex((i) => i - 1);
      navUnlock();
    }
  };

  const goToSlide = (i: number) => {
    if (i === slideIndex) return;
    mixpanel.track('Front-end: Tour Dot Click', { from: slideIndex, to: i });
    setSlideIndex(i);
  };

  const handleSkip = () => {
    mixpanel.track('Front-end: Tour Skip', { at: slideIndex, title: currentSlideData?.title });
    onComplete(); // ou onClose() se preferir apenas fechar
  };

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

  const eyeState: 'idle' | 'thinking' =
    slideIndex === 0 && !prefersReducedMotion ? 'thinking' : 'idle';

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden bg-white">
      {/* Fechar (top-right) */}
      <button
        onClick={onClose}
        aria-label="Fechar"
        className="absolute right-3.5 top-3.5 inline-flex h-9 w-9 items-center justify-center rounded-xl
                   text-slate-500 hover:bg-slate-100/70 hover:text-slate-700 transition z-20"
      >
        <X size={18} />
      </button>

      {/* Slide com transição */}
      <div className="relative w-full h-full flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={slideIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
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

      {/* Rodapé único: skip à esquerda, controles centralizados, CTA/Próximo à direita */}
      <div
        className="absolute bottom-5 md:bottom-6 left-0 right-0 z-30 px-3
                   flex items-center"
      >
        {/* Pular tour (clicável, fora do cluster) */}
        <button
          onClick={handleSkip}
          aria-label="Pular tour e ir para o chat"
          className="text-sm font-medium text-slate-600 hover:text-slate-900
                     px-1.5 py-1 rounded-md hover:bg-slate-100/70
                     focus:outline-none focus:ring-2 focus:ring-slate-700/10"
        >
          Pular tour
        </button>

        {/* Cluster central */}
        <div className="mx-auto flex items-center justify-center gap-4" role="navigation" aria-label="Controles do tour">
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

          <div className="flex items-center gap-2.5" role="tablist" aria-label="Slides do tour">
            {slides.map((s, i) => {
              const active = i === slideIndex;
              return (
                <button
                  key={s.title + i}
                  onClick={() => goToSlide(i)}
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
    </div>
  );
};

export default Sequence;

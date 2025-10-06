import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    mixpanel.track('Front-end: Tour Slide', {
      index: slideIndex,
      title: currentSlideData?.title,
    });
  }, [slideIndex, currentSlideData?.title]);

  const handleNext = () => {
    if (slideIndex < totalSlides - 1) setSlideIndex((i) => i + 1);
    else onComplete();
  };
  const handlePrev = () => { if (slideIndex > 0) setSlideIndex((i) => i - 1); };
  const goToSlide = (i: number) => setSlideIndex(i);

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

  // Anima só no primeiro slide; demais ficam “atentos” porém estáticos
  const eyeState: 'idle' | 'thinking' = slideIndex === 0 && !prefersReducedMotion ? 'thinking' : 'idle';

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden bg-white">
      {/* Fechar */}
      <button
        onClick={onClose}
        aria-label="Fechar"
        className="absolute right-3.5 top-3.5 inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100/70 hover:text-slate-700 transition z-10"
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
                bubblePosition={currentSlideData.bubblePosition}
                background={currentSlideData.background}
                // 👇 ativa a bolha com olho nas telas da sequência
                eyeBubble={{ enabled: true, state: eyeState, size: 240 }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controles (fixos no rodapé) */}
      <div className="absolute bottom-5 md:bottom-6 left-0 right-0 flex items-center justify-center gap-4 z-10">
        {slideIndex > 0 ? (
          <button
            onClick={handlePrev}
            aria-label="Anterior"
            className="btn-apple !h-10 !w-10 !p-0 rounded-full flex items-center justify-center"
          >
            <ArrowLeft size={18} />
          </button>
        ) : (
          <div className="w-10" />
        )}

        {/* Dots */}
        <div className="flex items-center gap-2.5">
          {slides.map((_, i) => {
            const active = i === slideIndex;
            return (
              <button
                key={i}
                onClick={() => goToSlide(i)}
                aria-label={`Ir para o slide ${i + 1}`}
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
            Ir para o chat
          </button>
        )}
      </div>
    </div>
  );
};

export default Sequence;

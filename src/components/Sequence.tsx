// src/components/Sequence.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, X } from 'lucide-react';
import { slides, OnboardingSlideData } from '../data/slides';
import mixpanel from '../lib/mixpanel';
import './Sequence.css';

interface SequenceProps {
  onClose: () => void;
  onComplete: () => void;
}

const haloPulseTransition = { duration: 4, repeat: Infinity, ease: 'easeInOut' } as const;
const corePulseTransition = { duration: 6, repeat: Infinity, ease: 'easeInOut' } as const;
const floatTransition = { duration: 8, repeat: Infinity, ease: 'easeInOut', repeatType: 'mirror' } as const;
const spinTransition = { duration: 16, repeat: Infinity, ease: 'linear' } as const;

const Sequence: React.FC<SequenceProps> = ({ onClose, onComplete }) => {
  const [slideIndex, setSlideIndex] = useState(0);
  const totalSlides = slides.length;
  const currentSlideData = slides[slideIndex];
  const prefersReducedMotion = useReducedMotion();

  const navLockRef = useRef(false);
  const unlockNavigation = useCallback(() => {
    window.setTimeout(() => {
      navLockRef.current = false;
    }, 200);
  }, []);

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
    try {
      onComplete();
    } catch (error) {
      console.error('[Tour] Error in onComplete:', error);
      navLockRef.current = false;
    }
  }, [currentSlideData?.id, onComplete, slideIndex, totalSlides, unlockNavigation]);

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
  }, [currentSlideData?.id, slideIndex, unlockNavigation]);

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

  const isFirstSlide = slideIndex === 0;
  const isLastSlide = slideIndex === totalSlides - 1;

  const renderVisual = (slide: OnboardingSlideData) => {
    switch (slide.visual) {
      case 'orb':
        return (
          <div className="onboarding-visual" role="presentation">
            <motion.span
              aria-hidden="true"
              className="onboarding-visual__halo"
              animate={
                prefersReducedMotion
                  ? { opacity: 0.1 }
                  : { opacity: [0.08, 0.12, 0.08] }
              }
              transition={haloPulseTransition}
            />
            <motion.div
              aria-hidden="true"
              className="onboarding-visual__core onboarding-visual__core--orb"
              animate={prefersReducedMotion ? undefined : { scale: [1, 1.03, 1] }}
              transition={corePulseTransition}
            >
              <span className="onboarding-visual__ring onboarding-visual__ring--solid" />
              <span className="onboarding-visual__ring onboarding-visual__ring--soft" />
              <span className="onboarding-visual__ring onboarding-visual__ring--accent" />
            </motion.div>
          </div>
        );
      case 'mirror':
        return (
          <div className="onboarding-visual" role="presentation">
            <motion.span
              aria-hidden="true"
              className="onboarding-visual__halo onboarding-visual__halo--cool"
              animate={
                prefersReducedMotion
                  ? { opacity: 0.1 }
                  : { opacity: [0.08, 0.11, 0.08] }
              }
              transition={haloPulseTransition}
            />
            <motion.div
              aria-hidden="true"
              className="onboarding-visual__core onboarding-visual__core--mirror"
              animate={prefersReducedMotion ? undefined : { rotate: 360 }}
              transition={spinTransition}
            >
              <span className="onboarding-visual__marker onboarding-visual__marker--top" />
              <span className="onboarding-visual__marker onboarding-visual__marker--right" />
              <span className="onboarding-visual__marker onboarding-visual__marker--left" />
            </motion.div>
          </div>
        );
      case 'usage':
        return (
          <div className="onboarding-visual" role="presentation">
            <motion.span
              aria-hidden="true"
              className="onboarding-visual__halo onboarding-visual__halo--warm"
              animate={
                prefersReducedMotion
                  ? { opacity: 0.1 }
                  : { opacity: [0.08, 0.12, 0.08] }
              }
              transition={haloPulseTransition}
            />
            <motion.div
              aria-hidden="true"
              className="onboarding-visual__card"
              animate={prefersReducedMotion ? undefined : { y: [-4, 4, -4] }}
              transition={floatTransition}
            >
              <motion.div
                className="onboarding-visual__card-icons"
                animate={prefersReducedMotion ? undefined : { scale: [1, 1.05, 1] }}
                transition={corePulseTransition}
              >
                <span aria-hidden="true">🎙️</span>
                <span aria-hidden="true">💬</span>
              </motion.div>
              <p className="onboarding-visual__card-caption">Texto · Voz · Pausa guiada</p>
            </motion.div>
          </div>
        );
      case 'image':
        return (
          <div className="onboarding-visual onboarding-visual--image" role="presentation">
            <img
              src={slide.imageSrc}
              alt={slide.title}
              className="onboarding-visual__image"
              loading="lazy"
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="onboarding-shell">
      <div className="onboarding-wrapper">
        <button
          onClick={onClose}
          aria-label="Fechar tour"
          className="onboarding-close"
          type="button"
        >
          <X size={18} />
        </button>

        <div className="onboarding-stage">
          <AnimatePresence mode="wait">
            <motion.article
              key={currentSlideData.id}
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -6 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.16, ease: 'easeOut' }}
              role="region"
              aria-labelledby={`onboarding-slide-${currentSlideData.id}-title`}
              className="onboarding-panel"
            >
              <div className="onboarding-scroll" data-testid="onboarding-scroll">
                <div className="onboarding-layout">
                  <div className="onboarding-copy">
                    <header className="onboarding-header">
                      <h2
                        id={`onboarding-slide-${currentSlideData.id}-title`}
                        className="onboarding-headline"
                      >
                        {currentSlideData.title}
                      </h2>
                      <div className="onboarding-body-copy">
                        {currentSlideData.paragraphs.map((paragraph, index) => (
                          <p key={index} className="onboarding-body-text">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </header>

                    {currentSlideData.badges ? (
                      <div className="onboarding-badges" role="list">
                        {currentSlideData.badges.map((badge) => (
                          <span key={badge.label} className="onboarding-badge" role="listitem">
                            <span aria-hidden="true">{badge.icon}</span>
                            <span>{badge.label}</span>
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="onboarding-visual-column">
                    {renderVisual(currentSlideData)}
                    {currentSlideData.subtext ? (
                      <p className="onboarding-subtext">{currentSlideData.subtext}</p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="onboarding-footer" role="group" aria-label="Navegação do tour">
                <div className="onboarding-pagination" role="tablist" aria-label="Pontos do tour">
                  {slides.map((slide, index) => {
                    const active = index === slideIndex;
                    return (
                      <button
                        key={slide.id}
                        onClick={() => goTo(index)}
                        type="button"
                        aria-label={`Ir para ${slide.title}`}
                        aria-current={active ? 'step' : undefined}
                        className="onboarding-dot"
                        data-active={active || undefined}
                      />
                    );
                  })}
                </div>

                <div className="onboarding-actions">
                  <button
                    onClick={handlePrev}
                    type="button"
                    aria-label="Voltar slide"
                    disabled={isFirstSlide}
                    aria-disabled={isFirstSlide || undefined}
                    className={`onboarding-button onboarding-button--secondary${
                      isFirstSlide ? ' onboarding-button--disabled' : ''
                    }`}
                  >
                    <ArrowLeft size={16} />
                    Voltar
                  </button>

                  <button
                    onClick={handleNext}
                    type="button"
                    className={`onboarding-button onboarding-button--primary${
                      isLastSlide ? ' onboarding-button--primary-final' : ''
                    }`}
                    aria-label={isLastSlide ? 'Começar agora' : 'Próximo slide'}
                  >
                    {currentSlideData.ctaLabel}
                  </button>
                </div>
              </div>
            </motion.article>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Sequence;

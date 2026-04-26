// src/components/HomePageTour.tsx
import { useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';
import { useHomePageTour } from '@/hooks/useHomePageTour';
import { useAuth } from '@/contexts/AuthContext';
import EcoBubbleOneEye from './EcoBubbleOneEye';
import mixpanel from '@/lib/mixpanel';

interface HomePageTourProps {
  onClose: () => void;
  reason?: string | null;
  nextPath?: string;
  onBeforeNavigate?: () => void;
  forceStart?: boolean;
}

const FONT_LINK =
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&display=swap';

// Accent color per step id
const STEP_ACCENT: Record<string, string> = {
  'eco-ai':     '#6EC8FF',
  meditations:  '#7EC8B0',
  stoicism:     '#C4A882',
  discipline:   '#9B8BDB',
  sleep:        '#8BAED4',
  cta:          '#6EC8FF',
};

export default function HomePageTour({
  onClose,
  reason,
  nextPath,
  onBeforeNavigate,
  forceStart,
}: HomePageTourProps) {
  const navigate = useNavigate();
  const { loginAsGuest } = useAuth();
  const fontRef = useRef<HTMLLinkElement | null>(null);

  const {
    isActive,
    step,
    isFirstStep,
    isLastStep,
    currentStep,
    nextStep,
    skipTour: skipTourInternal,
    completeTour: completeTourInternal,
    startTour,
    resetTour,
  } = useHomePageTour();

  // Load Cormorant Garamond once
  useEffect(() => {
    if (document.querySelector(`link[href="${FONT_LINK}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONT_LINK;
    document.head.appendChild(link);
    fontRef.current = link;
    return () => {
      if (fontRef.current && document.head.contains(fontRef.current)) {
        document.head.removeChild(fontRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      mixpanel.track('Front-end: Tour Aberto', { entry: window.location.href, reason });
    }
    if (forceStart) resetTour();
    startTour();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isActive) {
      mixpanel.track('Front-end: Tour Slide', {
        index: currentStep,
        id: step?.id,
        title: step?.title,
      });
    }
  }, [currentStep, step?.id, step?.title, isActive]);

  const skipTour = useCallback(() => {
    mixpanel.track('Front-end: Tour Fechado', { step: step?.id });
    skipTourInternal();
    onClose();
  }, [skipTourInternal, onClose, step?.id]);

  const handleComplete = useCallback(async () => {
    mixpanel.track('Front-end: Tour Concluído');
    completeTourInternal();
    try {
      await loginAsGuest();
      onBeforeNavigate?.();
    } catch {
      if (typeof navigate === 'function') {
        navigate('/login', { replace: true });
        return;
      }
    }
    const targetPath = nextPath && nextPath !== '/' ? nextPath : '/app';
    if (typeof navigate === 'function') {
      navigate(targetPath, { replace: true });
      return;
    }
    if (typeof window !== 'undefined') window.location.assign(targetPath);
  }, [completeTourInternal, navigate, nextPath, onBeforeNavigate, loginAsGuest]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') skipTour();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [skipTour]);

  if (!isActive || !step) return null;

  const totalSteps = 6;
  const accent = STEP_ACCENT[step.id] ?? '#6EC8FF';
  const hasImage = !!step.image && !step.isCta;

  const content = (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Conheça o ECO"
      style={{ background: '#07091A' }}
    >
      {/* ── Background image (image cards) ──────────────────── */}
      <AnimatePresence>
        {hasImage && (
          <motion.div
            key={`bg-${step.id}`}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: 'easeInOut' }}
          >
            <img
              src={step.image}
              alt=""
              aria-hidden
              className="h-full w-full"
              style={{
                objectFit: 'cover',
                objectPosition: step.imagePosition ?? 'center',
              }}
            />
            {/* Heavy bottom gradient for text legibility */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to top, rgba(5,7,18,0.98) 0%, rgba(5,7,18,0.75) 40%, rgba(5,7,18,0.2) 70%, transparent 100%)',
              }}
            />
            {/* Subtle top vignette */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to bottom, rgba(5,7,18,0.55) 0%, transparent 25%)',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ECO AI card background (no image) ───────────────── */}
      {step.id === 'eco-ai' && (
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(155deg, #071220 0%, #0C1E38 55%, #071520 100%)',
          }}
        >
          {/* Ambient glow */}
          <div
            className="absolute"
            style={{
              width: '70vw',
              height: '70vw',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(110,200,255,0.10) 0%, transparent 70%)',
              top: '5%',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          />
        </div>
      )}

      {/* ── CTA card background ──────────────────────────────── */}
      {step.isCta && (
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(155deg, #07091A 0%, #0A1228 55%, #07091A 100%)',
          }}
        >
          {/* Star field */}
          {[...Array(40)].map((_, i) => (
            <span
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                left: `${((i * 137.5) % 100).toFixed(1)}%`,
                top: `${((i * 83.7 + 11) % 100).toFixed(1)}%`,
                width: `${(0.8 + ((i * 0.43) % 1.4)).toFixed(1)}px`,
                height: `${(0.8 + ((i * 0.43) % 1.4)).toFixed(1)}px`,
                opacity: 0.15 + ((i * 0.07) % 0.35),
              }}
            />
          ))}
          {/* Center glow */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 60% 40% at 50% 35%, rgba(110,200,255,0.07) 0%, transparent 70%)',
            }}
          />
        </div>
      )}

      {/* ── Top bar: close + progress ────────────────────────── */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-[max(18px,env(safe-area-inset-top))] pb-3">
        <button
          onClick={skipTour}
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
          style={{ background: 'rgba(255,255,255,0.10)' }}
          aria-label="Fechar"
        >
          <X size={15} color="rgba(255,255,255,0.6)" />
        </button>

        {/* Progress segments */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <motion.div
              key={i}
              animate={{ width: i === currentStep ? 22 : 6, opacity: i < currentStep ? 0.55 : i === currentStep ? 1 : 0.22 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="h-[3px] rounded-full"
              style={{ background: i === currentStep ? accent : 'rgba(255,255,255,0.5)' }}
            />
          ))}
        </div>

        {/* Spacer */}
        <div className="w-8" />
      </div>

      {/* ── Slide content ────────────────────────────────────── */}
      <div className="relative z-10 flex flex-1 flex-col">
        {/* ECO AI slide: centered icon layout */}
        {step.id === 'eco-ai' && (
          <AnimatePresence mode="wait">
            <motion.div
              key="eco-ai-content"
              className="flex flex-1 flex-col items-center justify-center px-8 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                initial={{ scale: 0.65, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', bounce: 0.4, duration: 0.55, delay: 0.05 }}
                className="mb-8 flex h-28 w-28 items-center justify-center rounded-full"
                style={{
                  background: 'rgba(110,200,255,0.10)',
                  boxShadow: '0 0 0 1px rgba(110,200,255,0.18), 0 12px 40px rgba(110,200,255,0.15)',
                }}
              >
                <EcoBubbleOneEye variant="icon" size={60} />
              </motion.div>

              <motion.p
                className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em]"
                style={{ color: accent, fontFamily: 'Inter, system-ui, sans-serif' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.12 }}
              >
                {step.category}
              </motion.p>

              <motion.h2
                className="mb-4 font-bold leading-tight"
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: 'clamp(26px, 7vw, 32px)',
                  color: '#FFFFFF',
                  letterSpacing: '-0.01em',
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                {step.title}
              </motion.h2>

              <motion.p
                style={{
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: '15px',
                  lineHeight: '1.7',
                  color: 'rgba(255,255,255,0.58)',
                  maxWidth: 320,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {step.description}
              </motion.p>
            </motion.div>
          </AnimatePresence>
        )}

        {/* CTA slide: centered premium layout */}
        {step.isCta && (
          <AnimatePresence mode="wait">
            <motion.div
              key="cta-content"
              className="flex flex-1 flex-col items-center justify-center px-8 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              {/* Decorative mark */}
              <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.08, type: 'spring', bounce: 0.35 }}
                className="mb-8 flex h-16 w-16 items-center justify-center rounded-full"
                style={{
                  background: 'rgba(110,200,255,0.08)',
                  border: '1px solid rgba(110,200,255,0.20)',
                }}
              >
                <span style={{ fontSize: 28 }}>✦</span>
              </motion.div>

              <motion.h2
                className="mb-5 font-bold leading-tight"
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: 'clamp(28px, 8vw, 36px)',
                  color: '#FFFFFF',
                  letterSpacing: '-0.01em',
                }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
              >
                {step.title}
              </motion.h2>

              <motion.p
                style={{
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: '15px',
                  lineHeight: '1.75',
                  color: 'rgba(255,255,255,0.52)',
                  maxWidth: 300,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {step.description}
              </motion.p>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Image slides: content pinned to bottom */}
        {hasImage && (
          <div className="flex flex-1 flex-col justify-end">
            <AnimatePresence mode="wait">
              <motion.div
                key={`content-${step.id}`}
                className="px-6 pb-2"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                {step.category && (
                  <p
                    className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em]"
                    style={{ color: accent, fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    {step.category}
                  </p>
                )}
                <h2
                  className="mb-3 font-bold leading-tight"
                  style={{
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontSize: 'clamp(26px, 7.5vw, 34px)',
                    color: '#FFFFFF',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {step.title}
                </h2>
                <p
                  style={{
                    fontFamily: 'Inter, system-ui, sans-serif',
                    fontSize: '14px',
                    lineHeight: '1.7',
                    color: 'rgba(255,255,255,0.60)',
                    maxWidth: 340,
                  }}
                >
                  {step.description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Bottom actions ───────────────────────────────────── */}
      <div
        className="relative z-10 flex flex-col items-center gap-3 px-6 pb-[max(32px,env(safe-area-inset-bottom))] pt-5"
      >
        {isLastStep ? (
          <>
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleComplete}
              className="w-full max-w-sm rounded-2xl py-4 text-[15px] font-semibold transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, #6EC8FF 0%, #5AB8E5 100%)',
                color: '#07091A',
                boxShadow: '0 8px 28px rgba(110,200,255,0.30)',
                fontFamily: 'Inter, system-ui, sans-serif',
                letterSpacing: '0.01em',
              }}
            >
              Começar a explorar →
            </motion.button>
            <button
              onClick={skipTour}
              style={{
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: '13px',
                color: 'rgba(255,255,255,0.30)',
              }}
            >
              Talvez depois
            </button>
          </>
        ) : (
          <div className="flex w-full max-w-sm gap-3">
            {!isFirstStep && (
              <button
                onClick={skipTour}
                className="flex-none rounded-xl px-5 py-3.5 text-[14px] font-medium transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  color: 'rgba(255,255,255,0.40)',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  border: '1px solid rgba(255,255,255,0.09)',
                }}
              >
                Pular
              </button>
            )}

            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              whileTap={{ scale: 0.97 }}
              onClick={nextStep}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3.5 text-[14px] font-semibold transition-all duration-200"
              style={{
                background: `${accent}1A`,
                color: accent,
                border: `1px solid ${accent}30`,
                fontFamily: 'Inter, system-ui, sans-serif',
                boxShadow: `0 4px 16px ${accent}12`,
              }}
            >
              {isFirstStep ? 'Descobrir' : 'Próximo'}
              <ChevronRight size={18} />
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );

  if (typeof document === 'undefined') return content;
  return createPortal(content, document.body);
}

// src/components/HomePageTour.tsx
import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useHomePageTour, HOMEPAGE_TOUR_STEPS } from '@/hooks/useHomePageTour';
import { useAuth } from '@/contexts/AuthContext';
import { Astro } from '@/components/reino/ReinoScene';
import { getReinoMood } from '@/components/reino/reinoMood';
import mixpanel from '@/lib/mixpanel';
import '@/components/reino/reino.css';

interface HomePageTourProps {
  onClose: () => void;
  reason?: string | null;
  nextPath?: string;
  onBeforeNavigate?: () => void;
  forceStart?: boolean;
}

export default function HomePageTour({
  onClose,
  reason,
  nextPath,
  onBeforeNavigate,
  forceStart,
}: HomePageTourProps) {
  const navigate = useNavigate();
  const { loginAsGuest } = useAuth();

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      mixpanel.track('Tour · Aberto', { entry: window.location.href, reason });
    }
    if (forceStart) resetTour();
    startTour();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isActive) {
      mixpanel.track('Tour · Slide', {
        index: currentStep,
        id: step?.id,
        title: step?.title,
      });
    }
  }, [currentStep, step?.id, step?.title, isActive]);

  const skipTour = useCallback(() => {
    mixpanel.track('Tour · Fechado', { step: step?.id });
    skipTourInternal();
    onClose();
  }, [skipTourInternal, onClose, step?.id]);

  const handleComplete = useCallback(async () => {
    mixpanel.track('Tour · Concluído');
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

  const total = HOMEPAGE_TOUR_STEPS.length;
  const mood = getReinoMood();

  // Um lugar por passo: a pintura em cima, a folha de anil embaixo, sem nada
  // se mexendo sozinho. O último passo é o convite, com o astro da hora.
  const content = (
    <div className="reino-tour reino-hero" data-mood={mood} role="dialog" aria-modal="true" aria-label="Conheça o Ecotopia">
      <div className="reino-tour__topo">
        <span className="reino-tour__passo">
          {currentStep + 1} de {total}
        </span>
        <button type="button" className="reino-tour__fechar" onClick={skipTour}>
          Fechar
        </button>
      </div>

      {step.isCta ? (
        <div className="reino-tour__convite">
          <Astro className="reino-tour__astro" mood={mood} />
        </div>
      ) : (
        <div className="reino-tour__pintura reino-rasgo-b" key={step.id}>
          <img src={step.image} alt="" style={{ objectPosition: step.imagePosition ?? 'center' }} />
        </div>
      )}

      <div className="reino-tour__folha">
        {step.category && <p className="reino-tour__lugar">{step.category}</p>}
        <h2 className="reino-tour__titulo">{step.title}</h2>
        <p className="reino-tour__texto">{step.description}</p>

        <div className="reino-tour__acoes">
          {isLastStep ? (
            <>
              <button type="button" className="reino-placa" onClick={handleComplete}>
                Começar a explorar <span aria-hidden="true">→</span>
              </button>
              <button type="button" className="reino-tour__pular" onClick={skipTour}>
                Talvez depois
              </button>
            </>
          ) : (
            <>
              <button type="button" className="reino-placa" onClick={nextStep}>
                {isFirstStep ? 'Conhecer' : 'Próximo'} <span aria-hidden="true">→</span>
              </button>
              {!isFirstStep && (
                <button type="button" className="reino-tour__pular" onClick={skipTour}>
                  Pular
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return content;
  return createPortal(content, document.body);
}

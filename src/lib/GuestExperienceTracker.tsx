import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useGuestExperience } from '@/contexts/GuestExperienceContext';
import { GUEST_EXPERIENCE_FEATURES } from '@/constants/guestExperience';

/**
 * GuestExperienceTracker
 *
 * Componente invisível que rastreia automaticamente:
 * - Mudanças de rota (page views)
 * - Cliques em elementos com data-track-* attributes
 * - Eventos customizados do ECO (eco:*)
 *
 * Integração:
 * - Adicionar em App.tsx dentro de <BrowserRouter>
 * - Fica ao lado de MixpanelRouteListener e PixelRouteListener
 */
export function GuestExperienceTracker() {
  const location = useLocation();
  const { user, isGuestMode } = useAuth();
  const { trackPageView, trackInteraction } = useGuestExperience();

  // Rastrear mudanças de rota
  useEffect(() => {
    if (!isGuestMode || user) return;

    trackPageView(location.pathname);
  }, [location.pathname, isGuestMode, user, trackPageView]);

  // Listener global de cliques (elementos com data-track-type)
  useEffect(() => {
    if (!isGuestMode || user) return;
    if (!GUEST_EXPERIENCE_FEATURES.TRACK_INTERACTIONS) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Buscar elemento com data-track-type (pode ser pai)
      const trackElement = target.closest('[data-track-type]') as HTMLElement;
      if (!trackElement) return;

      const trackType = trackElement.getAttribute('data-track-type');
      if (!trackType) return;

      // Coletar metadata dos atributos data-track-*
      const metadata: Record<string, string> = {};

      trackElement.getAttributeNames().forEach((attr) => {
        if (attr.startsWith('data-track-') && attr !== 'data-track-type') {
          const key = attr.replace('data-track-', '');
          metadata[key] = trackElement.getAttribute(attr) || '';
        }
      });

      // Rastrear como 'navigation' genérico
      trackInteraction('navigation', {
        ...metadata,
        page: location.pathname,
      });
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [isGuestMode, user, location.pathname, trackInteraction]);

  // Listener de eventos customizados do ECO
  useEffect(() => {
    if (!isGuestMode || user) return;
    if (!GUEST_EXPERIENCE_FEATURES.TRACK_INTERACTIONS) return;

    // Chat message sent
    const handleChatMessage = (e: Event) => {
      const customEvent = e as CustomEvent;
      trackInteraction('chat_message_sent', {
        page: location.pathname,
        ...customEvent.detail,
      });
    };

    // Meditation started
    const handleMeditationStarted = (e: Event) => {
      const customEvent = e as CustomEvent;
      trackInteraction('meditation_started', {
        page: location.pathname,
        ...customEvent.detail,
      });
    };

    // Meditation completed
    const handleMeditationCompleted = (e: Event) => {
      const customEvent = e as CustomEvent;
      trackInteraction('meditation_completed', {
        page: location.pathname,
        ...customEvent.detail,
      });
    };

    // Voice message sent
    const handleVoiceMessage = (e: Event) => {
      const customEvent = e as CustomEvent;
      trackInteraction('voice_message_sent', {
        page: location.pathname,
        ...customEvent.detail,
      });
    };

    // Feedback submitted
    const handleFeedback = (e: Event) => {
      const customEvent = e as CustomEvent;
      trackInteraction('feedback_submitted', {
        page: location.pathname,
        ...customEvent.detail,
      });
    };

    // Memory viewed
    const handleMemoryViewed = (e: Event) => {
      const customEvent = e as CustomEvent;
      trackInteraction('memory_viewed', {
        page: location.pathname,
        ...customEvent.detail,
      });
    };

    // Registrar listeners
    window.addEventListener('eco:chat:message-sent', handleChatMessage);
    window.addEventListener('eco:meditation:started', handleMeditationStarted);
    window.addEventListener('eco:meditation:completed', handleMeditationCompleted);
    window.addEventListener('eco:voice:message-sent', handleVoiceMessage);
    window.addEventListener('eco:feedback:submitted', handleFeedback);
    window.addEventListener('eco:memory:viewed', handleMemoryViewed);

    // Cleanup
    return () => {
      window.removeEventListener('eco:chat:message-sent', handleChatMessage);
      window.removeEventListener('eco:meditation:started', handleMeditationStarted);
      window.removeEventListener('eco:meditation:completed', handleMeditationCompleted);
      window.removeEventListener('eco:voice:message-sent', handleVoiceMessage);
      window.removeEventListener('eco:feedback:submitted', handleFeedback);
      window.removeEventListener('eco:memory:viewed', handleMemoryViewed);
    };
  }, [isGuestMode, user, location.pathname, trackInteraction]);

  // Componente invisível
  return null;
}

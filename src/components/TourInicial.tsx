// src/components/TourInicial.tsx
import React, { useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Sequence from './Sequence';
import mixpanel from '../lib/mixpanel';

interface TourInicialProps {
  onClose: () => void;
  reason?: string | null;
  nextPath?: string;
  onBeforeNavigate?: () => void;
}

const TourInicial: React.FC<TourInicialProps> = ({ onClose, reason, nextPath, onBeforeNavigate }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      mixpanel.track('Front-end: Tour Aberto', {
        entry: window.location.href,
        reason,
      });
    }
  }, [reason]);

  const handleClose = useCallback(() => {
    mixpanel.track('Front-end: Tour Fechado', { step: 'sequence' });
    onClose();
  }, [onClose]);

  const handleComplete = useCallback(() => {
    console.log('[TourInicial] handleComplete called');
    mixpanel.track('Front-end: Tour Concluído');
    try {
      console.log('[TourInicial] Calling onBeforeNavigate');
      onBeforeNavigate?.();
    } catch (error) {
      console.error('[TourInicial] Error in onBeforeNavigate:', error);
    }

    // Always default to /app for guest flow, even if nextPath is /
    const targetPath = (nextPath && nextPath !== '/') ? nextPath : '/app';
    console.log('[TourInicial] Navigating to:', targetPath);

    if (typeof navigate === 'function') {
      console.log('[TourInicial] Using navigate hook');
      navigate(targetPath, { replace: true });
      return;
    }

    if (typeof window !== 'undefined') {
      console.log('[TourInicial] Using window.location.assign');
      window.location.assign(targetPath);
    }
  }, [navigate, nextPath, onBeforeNavigate]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose();
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleClose]);

  const modalContent = (
    <div
      className="fixed inset-0 z-50"
      style={{ background: '#ffffff' }}
      role="dialog"
      aria-modal="true"
      aria-label="Tour inicial"
    >
      <Sequence onClose={handleClose} onComplete={handleComplete} />
    </div>
  );

  if (typeof document === 'undefined') {
    return modalContent;
  }

  return createPortal(modalContent, document.body);
};

export default TourInicial;

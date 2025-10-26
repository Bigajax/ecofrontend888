import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TourInicial from '../components/TourInicial';
import { useShouldShowTour } from '../hooks/useShouldShowTour';
import { useAuth } from '../contexts/AuthContext';
import { enableGuestAutoEntry } from '../constants/guest';

export default function WelcomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { shouldShow, reason, markSeen } = useShouldShowTour();
  const [open, setOpen] = useState(false);

  // Abre o tour em primeira visita ou quando forçado por query (ex: ?tour=1)
  useEffect(() => {
    if (shouldShow) {
      setOpen(true);
    }
  }, [shouldShow]);

  const closeTour = useCallback(
    (targetPath?: string) => {
      markSeen();
      setOpen(false);

      const destination = targetPath ?? (user ? '/app' : '/');
      navigate(destination, { replace: true });
    },
    [markSeen, navigate, user]
  );

  const handleClose = useCallback(() => {
    closeTour();
  }, [closeTour]);

  const handleTourComplete = useCallback(() => {
    if (!user) {
      enableGuestAutoEntry();
    }

    closeTour('/app');
  }, [closeTour, user]);

  if (!open) return null;

  return (
    <TourInicial
      reason={reason}
      nextPath="/app"
      onClose={handleClose}
      onComplete={handleTourComplete}
    />
  );
}

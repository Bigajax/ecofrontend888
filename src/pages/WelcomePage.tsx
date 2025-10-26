import { useCallback, useEffect, useRef, useState } from 'react';
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
  const shouldRedirectToChatRef = useRef(false);

  // Abre o tour em primeira visita ou quando forçado por query (ex: ?tour=1)
  useEffect(() => {
    if (shouldShow) {
      setOpen(true);
    }
  }, [shouldShow]);

  const goNext = useCallback(() => {
    markSeen();
    const shouldGoToChat = Boolean(user) || shouldRedirectToChatRef.current;
    navigate(shouldGoToChat ? '/app' : '/', { replace: true });
    shouldRedirectToChatRef.current = false;
  }, [markSeen, navigate, user]);

  const handleTourComplete = useCallback(() => {
    shouldRedirectToChatRef.current = true;
    if (!user) {
      enableGuestAutoEntry();
    }
  }, [user]);

  if (!open) return null;

  return (
    <TourInicial
      reason={reason}
      nextPath="/app"
      onClose={goNext}
      onComplete={handleTourComplete}
    />
  );
}

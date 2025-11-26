import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HomePageTour from '../components/HomePageTour';
import { useShouldShowTour } from '../hooks/useShouldShowTour';
import { useAuth } from '../contexts/AuthContext';

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

  const goNext = () => {
    try {
      markSeen();
    } catch (error) {
      console.error('[WelcomePage] Error in markSeen:', error);
    }
    navigate('/app', { replace: true });
  };

  if (!open) return null;

  return (
    <HomePageTour
      reason={reason}
      nextPath="/app"
      onClose={goNext}
      onBeforeNavigate={markSeen}
    />
  );
}

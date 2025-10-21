import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TourInicial from '../components/TourInicial';
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
    markSeen();
    navigate(user ? '/app' : '/', { replace: true });
  };

  if (!open) return null;

  return (
    <TourInicial
      reason={reason}
      nextPath={user ? '/app' : '/'}
      onClose={goNext}
    />
  );
}

/**
 * GuestMeditationPage
 *
 * Página pública para acesso direto a meditações específicas
 * Permite compartilhar links sem necessidade de login
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import mixpanel from '@/lib/mixpanel';

// Dados da meditação "Sintonize Novos Potenciais"
const MEDITATION_DATA = {
  id: 'blessing_2',
  title: 'Sintonize Novos Potenciais',
  duration: '7 min',
  audioUrl: '/audio/sintonizar-novos-potenciais.mp3',
  imageUrl: '/images/meditacao-novos-potenciais.webp',
  backgroundMusic: 'Cristais',
  gradient: 'linear-gradient(to bottom, #4A7FCC 0%, #3D6BB8 20%, #3358A3 40%, #2A478E 60%, #213779 80%, #182864 100%)',
  category: 'dr_joe_dispenza',
  isPremium: false,
  description: 'Acesse o campo quântico e manifeste a realidade que você deseja',
};

export default function GuestMeditationPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Track guest meditation access
    mixpanel.track('Guest Meditation Accessed', {
      meditation_id: MEDITATION_DATA.id,
      meditation_title: MEDITATION_DATA.title,
      source: 'guest_link',
    });

    // Navegar direto para o player guest com os dados da meditação
    navigate('/guest/meditation-player', {
      state: {
        meditation: MEDITATION_DATA,
        returnTo: '/',
        isGuestAccess: true,
      },
      replace: true,
    });
  }, [navigate]);

  // Loading state enquanto redireciona
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500" />
        <p className="text-lg text-gray-700 font-medium">Carregando meditação...</p>
        <p className="text-sm text-gray-500">Sintonize Novos Potenciais</p>
      </div>
    </div>
  );
}

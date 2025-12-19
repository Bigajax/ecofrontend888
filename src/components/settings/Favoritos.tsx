import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Play } from 'lucide-react';
import { trackMeditationEvent, parseDurationToSeconds, getCategoryFromPath } from '@/analytics/meditation';

interface Meditacao {
  id: string;
  title: string;
  duration: string;
  audioUrl: string;
  image: string;
  category: string;
  gradient: string;
}

export default function Favoritos() {
  const navigate = useNavigate();
  const [favoritos, setFavoritos] = useState<Meditacao[]>([
    {
      id: 'blessing_1',
      title: 'Meditação Bênção dos centros de energia',
      duration: '7 min',
      audioUrl: '/audio/energy-blessings-meditation.mp3',
      image: '/images/meditacao-bencao-energia.webp',
      category: 'Dr. Joe Dispenza',
      gradient: 'linear-gradient(to bottom, #F5C563 0%, #F5A84D 15%, #F39439 30%, #E67E3C 45%, #D95B39 60%, #C74632 80%, #A63428 100%)',
    },
    {
      id: 'blessing_2',
      title: 'Meditação para sintonizar novos potenciais',
      duration: '7 min',
      audioUrl: '/audio/sintonizar-novos-potenciais.mp3',
      image: '/images/meditacao-novos-potenciais.webp',
      category: 'Dr. Joe Dispenza',
      gradient: 'linear-gradient(to bottom, #4A7FCC 0%, #3D6BB8 20%, #3358A3 40%, #2A478E 60%, #213779 80%, #182864 100%)',
    },
    {
      id: 'blessing_8',
      title: 'Meditação do Sono',
      duration: '15 min',
      audioUrl: '/audio/meditacao-sono.mp3',
      image: '/images/meditacao-sono-new.webp',
      category: 'Sono',
      gradient: 'linear-gradient(to bottom, #4A4E8A 0%, #3E4277 20%, #333665 40%, #282B52 60%, #1E2140 80%, #14172E 100%)',
    },
  ]);

  const handlePlayMeditation = (meditacao: Meditacao) => {
    // Inferir categoria do nome da categoria
    const categoryMap: Record<string, string> = {
      'Dr. Joe Dispenza': 'dr_joe_dispenza',
      'Sono': 'sono',
      'Introdução': 'introducao',
    };
    const category = categoryMap[meditacao.category] || 'unknown';

    navigate('/app/meditation-player', {
      state: {
        meditation: {
          id: meditacao.id,
          title: meditacao.title,
          duration: meditacao.duration,
          audioUrl: meditacao.audioUrl,
          imageUrl: meditacao.image,
          backgroundMusic: 'Cristais',
          gradient: meditacao.gradient,
          category,
          isPremium: false,
        },
        returnTo: '/app/configuracoes',
      }
    });
  };

  const handleRemoveFavorite = (id: string) => {
    const meditacao = favoritos.find(fav => fav.id === id);
    if (!meditacao) return;

    // Inferir categoria
    const categoryMap: Record<string, string> = {
      'Dr. Joe Dispenza': 'dr_joe_dispenza',
      'Sono': 'sono',
      'Introdução': 'introducao',
    };
    const category = categoryMap[meditacao.category] || 'unknown';

    // Track Unfavorited
    const payload = {
      meditation_id: meditacao.id,
      meditation_title: meditacao.title,
      category,
      source: 'settings' as const,
    };
    trackMeditationEvent('Front-end: Meditation Unfavorited', payload);

    setFavoritos(favoritos.filter(fav => fav.id !== id));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Favoritos</h2>
        <p className="text-sm text-gray-600">
          Suas meditações e conteúdos favoritos em um só lugar.
        </p>
      </div>

      {favoritos.length === 0 ? (
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-12 shadow-sm text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
              <Heart size={32} className="text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Nenhum favorito ainda
              </h3>
              <p className="text-sm text-gray-600">
                Adicione meditações aos seus favoritos para acessá-las rapidamente
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {favoritos.map((item) => (
            <div
              key={item.id}
              className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-shadow"
            >
              <div
                className="w-20 h-20 rounded-xl bg-cover bg-center flex-shrink-0"
                style={{ backgroundImage: `url(${item.image})` }}
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm md:text-base truncate">
                  {item.title}
                </h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-500">{item.duration}</span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500">{item.category}</span>
                </div>
              </div>
              <button
                onClick={() => handlePlayMeditation(item)}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-[#E3F5FF] hover:bg-[#D0EEFF] transition-colors flex-shrink-0"
              >
                <Play size={18} className="text-[#6EC8FF] fill-[#6EC8FF] ml-0.5" />
              </button>
              <button
                onClick={() => handleRemoveFavorite(item.id)}
                className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
              >
                <Heart size={18} className="text-red-500 fill-red-500" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import HomeHeader from '@/components/home/HomeHeader';

interface EnergyCenter {
  id: number;
  title: string;
  duration: string;
}

const energyCenters: EnergyCenter[] = [
  { id: 1, title: 'Alinhando a respiração e o centro base', duration: '8 min' },
  { id: 2, title: 'Despertando o centro da criatividade', duration: '10 min' },
  { id: 3, title: 'Equilibrando o centro do poder pessoal', duration: '12 min' },
  { id: 4, title: 'Harmonizando o centro do coração', duration: '15 min' },
  { id: 5, title: 'Destravando o centro da expressão', duration: '10 min' },
  { id: 6, title: 'Expandindo o centro da sabedoria', duration: '12 min' },
  { id: 7, title: 'Conectando o centro da consciência', duration: '18 min' },
];

export default function EnergyBlessingsPage() {
  const navigate = useNavigate();

  const handlePlayMain = () => {
    // Navegar para a página de player de meditação
    navigate('/app/meditation-player', {
      state: {
        meditation: {
          title: 'Bênçãos dos Centros de Energia',
          duration: '07:42',
          audioUrl: '/audio/energy-blessings-meditation.mp3',
          imageUrl: '/images/energy-blessings.png',
          backgroundMusic: 'Cristais'
        }
      }
    });
  };

  const handlePlayCenter = (centerId: number) => {
    // Implementar lógica de reprodução de centro específico
    const center = energyCenters.find(c => c.id === centerId);
    if (center) {
      navigate('/app/meditation-player', {
        state: {
          meditation: {
            title: center.title,
            duration: center.duration,
            audioUrl: `/audio/center-${centerId}.mp3`,
            imageUrl: '/images/energy-blessings.png',
            backgroundMusic: 'Cristais'
          }
        }
      });
    }
  };

  return (
    <div className="min-h-screen bg-white font-primary">
      {/* Header */}
      <HomeHeader />

      {/* Main Content */}
      <main className="md:pt-0">
        {/* Hero Section com imagem de fundo */}
        <div
          className="relative h-[80vh] flex items-center justify-center"
        style={{
          backgroundImage: 'url("/images/energy-blessings-hero.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Overlay suave */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/40 via-purple-800/30 to-white" />

        {/* Conteúdo central */}
        <div className="relative z-10 text-center px-6 max-w-2xl mt-20">
          {/* Título */}
          <h1 className="font-display text-2xl md:text-3xl font-bold text-white mb-3 drop-shadow-2xl">
            Bênçãos dos Centros de Energia
          </h1>

          {/* Subtítulo */}
          <p className="text-sm md:text-base text-white/95 mb-6 leading-relaxed drop-shadow-lg">
            Uma prática profunda para equilibrar, harmonizar e despertar seus centros de energia internos.
            Uma jornada guiada para restaurar presença, vitalidade e clareza.
          </p>

          {/* Botão Play Principal */}
          <button
            onClick={handlePlayMain}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-purple-500 hover:bg-purple-600 text-white font-medium text-base transition-all hover:scale-105 shadow-2xl"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
              <Play size={16} className="fill-white text-white ml-0.5" />
            </div>
            Tocar
          </button>
        </div>
      </div>

      {/* Seção "E agora?" */}
      <div className="max-w-4xl mx-auto px-4 py-12 md:px-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">E agora?</h2>

        {/* Lista de centros de energia */}
        <div className="space-y-3">
          {energyCenters.map((center) => (
            <button
              key={center.id}
              onClick={() => handlePlayCenter(center.id)}
              className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all hover:scale-[1.02] border border-gray-100"
            >
              {/* Ícone Play Circular */}
              <div className="flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                <Play size={16} className="fill-purple-600 text-purple-600 ml-0.5" />
              </div>

              {/* Conteúdo */}
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-gray-800 text-[15px]">
                  {center.title}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">{center.duration}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
      </main>
    </div>
  );
}

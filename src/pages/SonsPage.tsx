import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Headphones, Music2, Flame, Brain, Moon, CloudRain, Sparkles, Radio, User, Leaf, type LucideIcon } from 'lucide-react';
import HomeHeader from '@/components/home/HomeHeader';
import ReinoChegada from '@/components/reino/ReinoChegada';
import { SOUND_CATEGORIES, type Sound } from '@/data/sounds';

interface CategoryPill {
  id: string;
  label: string;
  icon: LucideIcon;
}

const CATEGORY_PILLS: CategoryPill[] = [
  { id: 'all', label: 'Todos os sons', icon: Headphones },
  { id: 'musicas', label: 'Todas as músicas', icon: Music2 },
  { id: 'populares', label: 'Populares', icon: Flame },
  { id: 'concentracao', label: 'Música para concentração', icon: Brain },
  { id: 'dormir', label: 'Música para dormir', icon: Moon },
  { id: 'chuva', label: 'Sons de chuva', icon: CloudRain },
  { id: 'misticos', label: 'Sons místicos', icon: Sparkles },
  { id: 'radio', label: 'Rádio de música', icon: Radio },
  { id: 'meditacao', label: 'Música para meditação', icon: User },
  { id: 'natureza', label: 'Sons da natureza', icon: Leaf },
];

export default function SonsPage() {
  const navigate = useNavigate();
  const [selectedPill, setSelectedPill] = useState('all');
  const [selectedSound, setSelectedSound] = useState<Sound | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(10);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getFilteredCategories = () => {
    switch (selectedPill) {
      case 'all':
        return SOUND_CATEGORIES;
      case 'musicas':
        return SOUND_CATEGORIES.map(cat => ({
          ...cat,
          sounds: cat.sounds.filter(sound => sound.badge === 'MÚSICA')
        })).filter(cat => cat.sounds.length > 0);
      case 'populares':
        return SOUND_CATEGORIES.map(cat => ({
          ...cat,
          sounds: cat.sounds.slice(0, 3)
        }));
      case 'concentracao':
        return SOUND_CATEGORIES.filter(cat =>
          cat.id === 'frequencias' || cat.id === 'meditacao'
        );
      case 'dormir':
        return SOUND_CATEGORIES.filter(cat => cat.id === 'natureza');
      case 'chuva':
        return SOUND_CATEGORIES.map(cat => ({
          ...cat,
          sounds: cat.sounds.filter(sound =>
            sound.title.toLowerCase().includes('chuva') ||
            sound.title.toLowerCase().includes('tempestade')
          )
        })).filter(cat => cat.sounds.length > 0);
      case 'misticos':
        return SOUND_CATEGORIES.filter(cat => cat.id === 'meditacao');
      case 'radio':
        return SOUND_CATEGORIES.map(cat => ({
          ...cat,
          sounds: cat.sounds.filter(sound => sound.badge === 'MÚSICA')
        })).filter(cat => cat.sounds.length > 0);
      case 'meditacao':
        return SOUND_CATEGORIES.filter(cat => cat.id === 'meditacao');
      case 'natureza':
        return SOUND_CATEGORIES.filter(cat => cat.id === 'natureza');
      default:
        return SOUND_CATEGORIES;
    }
  };

  const filteredCategories = getFilteredCategories();

  const handleCardClick = (sound: Sound) => {
    setSelectedSound(sound);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSound(null);
    setSelectedDuration(10);
  };

  const handleStartSound = () => {
    if (selectedSound) {
      navigate('/app/sound-player', {
        state: {
          sound: selectedSound,
          selectedDuration: selectedDuration
        }
      });
    }
  };

  return (
    <div className="reino-corpo page-with-nav" style={{ minHeight: '100dvh' }}>
      <HomeHeader />

      <ReinoChegada
        mood="noite"
        imagem="/images/reino/vale-800.webp"
        foco="40% 50%"
        lugar="SOM.02 · Vale do Sono · sons"
        titulo="Sons do vale"
        sobre="Música ambiente e sons para qualquer momento: para dormir, para concentrar, para ficar."
        voltar={{ rotulo: 'Voltar para o Mapa', onClick: () => navigate('/app/mapa') }}
      />

      <div className="reino-corpo__coluna">
        <div className="reino-filtros" role="group" aria-label="Filtrar sons">
          {CATEGORY_PILLS.map((pill) => (
            <button
              key={pill.id}
              type="button"
              className="reino-filtro"
              aria-pressed={selectedPill === pill.id}
              onClick={() => setSelectedPill(pill.id)}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {filteredCategories.map((category) => (
          <section key={category.id} className="reino-corpo__secao" aria-label={category.title}>
            <h2 className="reino-corpo__titulo" style={{ fontSize: 28 }}>
              {category.title}
            </h2>
            <ul className="reino-estante">
              {category.sounds.map((sound, i) => (
                <li key={sound.id}>
                  <button type="button" className="reino-capa" onClick={() => handleCardClick(sound)}>
                    <span
                      className={`reino-som__capa ${i % 2 ? 'reino-rasgo-b' : 'reino-rasgo-a'}`}
                      style={{ background: sound.image, backgroundSize: 'cover', backgroundPosition: 'center' }}
                      aria-hidden="true"
                    />
                    <span className="reino-capa__meta">
                      {sound.badge ? `${sound.badge.toLowerCase()} · ` : ''}
                      {sound.duration}
                      {sound.isPremium ? ' · assinantes' : ''}
                    </span>
                    <span className="reino-capa__titulo">{sound.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {isModalOpen && selectedSound && (
        <DurationModal
          sound={selectedSound}
          duration={selectedDuration}
          onDurationChange={setSelectedDuration}
          onClose={handleCloseModal}
          onStart={handleStartSound}
        />
      )}
    </div>
  );
}

/* ─── Escolha da duração: uma página sobre a noite ─────────────── */

interface DurationModalProps {
  sound: Sound;
  duration: number;
  onDurationChange: (d: number) => void;
  onClose: () => void;
  onStart: () => void;
}

function DurationModal({ sound, duration, onDurationChange, onClose, onStart }: DurationModalProps) {
  return (
    <div className="reino-drjoe__ciclo" role="dialog" aria-modal="true" aria-labelledby="som-titulo" onClick={onClose}>
      <div className="reino-drjoe__ciclo-caixa" onClick={(e) => e.stopPropagation()}>
        <p className="reino-rotulo" style={{ color: '#5b6080' }}>
          Quanto tempo no vale?
        </p>
        <h2 id="som-titulo" className="reino-corpo__titulo" style={{ color: '#1c2350' }}>
          {sound.title}
        </h2>
        <div className="reino-som__duracoes" role="radiogroup" aria-label="Duração da sessão">
          {[5, 10, 20].map((mins) => (
            <button
              key={mins}
              type="button"
              role="radio"
              aria-checked={duration === mins}
              className="reino-som__duracao"
              onClick={() => onDurationChange(mins)}
            >
              <span className="reino-som__minutos">{mins}</span>
              <span className="reino-som__unidade">min</span>
            </button>
          ))}
        </div>
        <div className="reino-player-aviso__acoes" style={{ padding: 0, background: 'transparent' }}>
          <button type="button" className="reino-placa" onClick={onStart}>
            Começar <span aria-hidden="true">→</span>
          </button>
          <button type="button" className="reino-chegada__voltar" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

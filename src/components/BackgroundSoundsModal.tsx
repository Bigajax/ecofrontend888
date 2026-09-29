import { useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { SOUND_CATEGORIES, type Sound } from '@/data/sounds';
import '@/components/reino/reino.css';

interface BackgroundSoundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSoundId?: string | null;
  onSelectSound: (sound: Sound) => void;
  backgroundVolume?: number;
  onVolumeChange?: (volume: number) => void;
  /** tirar o som de fundo; sem isso, a opção "Silêncio" não aparece */
  onClear?: () => void;
}

// Nomes das categorias sem emoji, no tom do reino.
const NOME_DA_CATEGORIA: Record<string, string> = {
  natureza: 'Da natureza',
  meditacao: 'Para meditar',
  frequencias: 'Frequências',
};

const imagemDe = (sound: Sound) =>
  sound.image.startsWith('url(') ? sound.image.replace(/^url\(["']?/, '').replace(/["']?\)$/, '') : null;

/**
 * Som de fundo, no reino (set/2026): uma folha da noite, igual ao player. O
 * volume no topo (o mesmo controle do painel de som), "Silêncio" para tirar o
 * som, e os sons como pequenas pinturas; o escolhido ganha o anel ocre. Sons
 * sem arquivo de áudio aparecem como "em breve" e não podem ser escolhidos
 * (antes eram escolhíveis e não tocavam nada). Antes: roxo, brilhos e emoji.
 */
export default function BackgroundSoundsModal({
  isOpen,
  onClose,
  selectedSoundId,
  onSelectSound,
  backgroundVolume = 70,
  onVolumeChange,
  onClear,
}: BackgroundSoundsModalProps) {
  const [volume, setVolume] = useState(backgroundVolume);

  useEffect(() => {
    setVolume(backgroundVolume);
  }, [backgroundVolume]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const mudarVolume = (v: number) => {
    setVolume(v);
    onVolumeChange?.(v);
  };

  return createPortal(
    <div
      className="reino-sons"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sons-titulo"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="reino-sons__folha">
        <div className="reino-sons__topo">
          <div>
            <h2 id="sons-titulo" className="reino-sons__titulo">
              Som de fundo
            </h2>
            <p className="reino-sons__sub">Toca junto com a voz.</p>
          </div>
          <button type="button" className="reino-sons__fechar" onClick={onClose}>
            Pronto
          </button>
        </div>

        {selectedSoundId && (
          <label className="reino-player__canal reino-sons__volume">
            <span className="reino-player__canal-nome">Volume</span>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => mudarVolume(parseFloat(e.target.value))}
              aria-label="Volume do som de fundo"
              aria-valuetext={`${Math.round(volume)}%`}
              className="reino-player__faixa"
              style={{ '--v': `${volume}%` } as CSSProperties}
            />
            <span className="reino-player__canal-valor">{Math.round(volume)}%</span>
          </label>
        )}

        <div className="reino-sons__corpo">
          {onClear && (
            <button
              type="button"
              className={`reino-sons__silencio${!selectedSoundId ? ' is-escolhido' : ''}`}
              onClick={onClear}
              aria-pressed={!selectedSoundId}
            >
              Silêncio
              <span>só a voz</span>
            </button>
          )}

          {SOUND_CATEGORIES.map((categoria) => (
            <section key={categoria.id} className="reino-sons__grupo" aria-label={NOME_DA_CATEGORIA[categoria.id] ?? categoria.title}>
              <p className="reino-sons__rotulo">{NOME_DA_CATEGORIA[categoria.id] ?? categoria.title}</p>
              <ul className="reino-sons__lista">
                {categoria.sounds.map((sound) => {
                  const escolhido = selectedSoundId === sound.id;
                  const disponivel = Boolean(sound.audioUrl);
                  const img = imagemDe(sound);
                  return (
                    <li key={sound.id}>
                      <button
                        type="button"
                        className={`reino-sons__som${escolhido ? ' is-escolhido' : ''}`}
                        onClick={() => disponivel && onSelectSound(sound)}
                        disabled={!disponivel}
                        aria-pressed={escolhido}
                      >
                        <span className="reino-sons__pintura" aria-hidden="true">
                          {img ? <img src={img} alt="" loading="lazy" /> : <span style={{ background: sound.image }} />}
                        </span>
                        <span className="reino-sons__nome">{sound.title}</span>
                        <span className="reino-sons__meta">{disponivel ? (escolhido ? 'tocando' : sound.duration) : 'em breve'}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

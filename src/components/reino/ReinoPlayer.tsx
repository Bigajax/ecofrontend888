import type { ChangeEvent, CSSProperties, ReactNode } from 'react';
import { PincelProgresso } from './ReinoScene';
import './reino.css';

/**
 * O player no reino: você está sentado num lugar pintado, ouvindo. Só a
 * apresentação; áudio, eventos, retomada e telas de conclusão continuam no
 * MeditationPlayerPage. O modo convidado do funil do sono não usa isto.
 */
interface ReinoPlayerProps {
  titulo: string;
  duracaoRotulo: string;
  imagem: string;
  /** não aparece mais no player (o cabeçalho já diz onde você está); mantido por compatibilidade */
  lugar?: string;
  /** ex.: "Noite 2 de 7" */
  etapa?: string;
  /** progresso da jornada (noites feitas / 7), quando houver */
  jornada?: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  formatTime: (t: number) => string;
  onBack: () => void;
  onPlayPause: () => void;
  onSkip: (s: number) => void;
  onProgressChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onProgressChangeEnd?: () => void;
  /** sem som de fundo (ex.: o player de sons), a linha some */
  somDeFundo?: string;
  onSomDeFundo?: () => void;
  isFavorite: boolean;
  onFavorite?: () => void;
  volume: number;
  onVolume: (v: number) => void;
  /** volume do som de fundo (0 a 100); sem ele, a linha mostra só a escolha do som */
  volumeFundo?: number;
  onVolumeFundo?: (v: number) => void;
  /** aviso acima da pintura (ex.: continuar de onde parou): no fluxo, nunca por cima */
  avisoTopo?: ReactNode;
  /** aviso abaixo dos controles (ex.: pode bloquear a tela) */
  avisoBase?: ReactNode;
}

export default function ReinoPlayer({
  titulo,
  duracaoRotulo,
  imagem,
  etapa,
  jornada,
  isPlaying,
  currentTime,
  duration,
  formatTime,
  onBack,
  onPlayPause,
  onSkip,
  onProgressChange,
  onProgressChangeEnd,
  somDeFundo,
  onSomDeFundo,
  isFavorite,
  onFavorite,
  volume,
  onVolume,
  volumeFundo,
  onVolumeFundo,
  avisoTopo,
  avisoBase,
}: ReinoPlayerProps) {
  const frac = duration > 0 ? currentTime / duration : 0;
  // capa pode ser um caminho de imagem ou um fundo CSS (url(...) / gradiente)
  const capaCss = /^(url\(|linear-gradient|radial-gradient)/.test(imagem);

  return (
    <div className="reino-corpo reino-player">
      <div className="reino-player__topo">
        <button type="button" className="reino-chegada__voltar" onClick={onBack}>
          <span aria-hidden="true">←</span> Voltar
        </button>
        <span />
        {onFavorite ? (
          <button
            type="button"
            className="reino-player__guardar"
            onClick={onFavorite}
            aria-pressed={isFavorite}
          >
            {isFavorite ? 'Guardado' : 'Guardar'}
          </button>
        ) : (
          <span />
        )}
      </div>

      <div className="reino-player__centro">
        {avisoTopo && <div className="reino-player__aviso">{avisoTopo}</div>}
        <div className="reino-player__arte reino-rasgo-a">
          {capaCss ? (
            <span className="reino-player__arte-css" style={{ background: imagem, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          ) : (
            <img src={imagem} alt="" decoding="async" />
          )}
        </div>

        <div className="reino-player__titulos">
          <h1 className="reino-player__titulo">{titulo}</h1>
          <p className="reino-player__meta">
            {etapa ? `${etapa} · ${duracaoRotulo}` : duracaoRotulo}
          </p>
          {jornada !== undefined && <PincelProgresso value={jornada} className="reino-player__jornada" />}
        </div>

        <div className="reino-player__controles">
          <button type="button" className="reino-player__pular" onClick={() => onSkip(-15)} aria-label="Voltar 15 segundos">
            −15s
          </button>
          <button
            type="button"
            className="reino-player__tocar"
            onClick={onPlayPause}
            aria-label={isPlaying ? 'Pausar' : 'Tocar'}
          >
            {isPlaying ? (
              <svg viewBox="0 0 32 32" aria-hidden="true">
                <path d="M11.2 8.6c.2 5 .1 10-.2 14.8M20.6 8.8c-.2 4.8 0 9.8.3 14.6" />
              </svg>
            ) : (
              <svg viewBox="0 0 32 32" aria-hidden="true" className="is-play">
                <path d="M11.4 7.8c5.4 2.4 10 5.3 13.4 8.3-3.6 2.8-8.3 5.8-13.3 8.2-.4-5.5-.5-11 0-16.5Z" />
              </svg>
            )}
          </button>
          <button type="button" className="reino-player__pular" onClick={() => onSkip(15)} aria-label="Avançar 15 segundos">
            +15s
          </button>
        </div>

        <div className="reino-player__progresso">
          <span className="reino-player__tempo">{formatTime(currentTime)}</span>
          <div className="reino-player__trilha">
            <PincelProgresso value={frac} className="reino-player__pincel" />
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={onProgressChange}
              onMouseUp={onProgressChangeEnd}
              onTouchEnd={onProgressChangeEnd}
              aria-label="Progresso da meditação"
              aria-valuetext={`${formatTime(currentTime)} de ${formatTime(duration)}`}
              className="reino-player__range"
            />
          </div>
          <span className="reino-player__tempo">{formatTime(duration)}</span>
        </div>

        {/* O painel de som (set/2026): função antes de enfeite. Voz e som de fundo
            lado a lado, com o volume de cada um à mão; o do som de fundo antes
            só existia escondido dentro do modal. */}
        <div className="reino-player__mixer">
          <label className="reino-player__canal">
            <span className="reino-player__canal-nome">Voz</span>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => onVolume(parseFloat(e.target.value))}
              aria-label="Volume da voz"
              aria-valuetext={`${Math.round(volume)}%`}
              className="reino-player__faixa"
              style={{ '--v': `${volume}%` } as CSSProperties}
            />
            <span className="reino-player__canal-valor">{Math.round(volume)}%</span>
          </label>

          {onSomDeFundo && (
            <div className="reino-player__canal">
              <button type="button" className="reino-player__canal-nome is-escolha" onClick={onSomDeFundo}>
                Som de fundo
                <span className="reino-player__canal-som">
                  {somDeFundo && somDeFundo !== 'Nenhum' ? somDeFundo : 'escolher'} ›
                </span>
              </button>
              {somDeFundo && somDeFundo !== 'Nenhum' && onVolumeFundo && volumeFundo !== undefined ? (
                <>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volumeFundo}
                    onChange={(e) => onVolumeFundo(parseFloat(e.target.value))}
                    aria-label="Volume do som de fundo"
                    aria-valuetext={`${Math.round(volumeFundo)}%`}
                    className="reino-player__faixa"
                    style={{ '--v': `${volumeFundo}%` } as CSSProperties}
                  />
                  <span className="reino-player__canal-valor">{Math.round(volumeFundo)}%</span>
                </>
              ) : (
                <span className="reino-player__canal-vazio">Nenhum tocando. Escolha um para tocar junto com a voz.</span>
              )}
            </div>
          )}
        </div>
        {avisoBase && <div className="reino-player__aviso">{avisoBase}</div>}
      </div>
    </div>
  );
}

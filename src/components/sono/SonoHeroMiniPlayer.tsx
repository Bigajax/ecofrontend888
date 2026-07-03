import { memo, useEffect, useState } from 'react';
import { PROTOCOL_NIGHTS } from '@/data/protocolNights';

/**
 * Mini-player do herói da /sono (iPhone em CSS puro) que rotaciona pelas 7 noites
 * a cada 2,8s com crossfade na arte e flip do rótulo/título.
 *
 * Isolado num componente memoizado de propósito: o `setInterval` força um
 * re-render a cada 2,8s. Enquanto isso vivia no componente raiz (`EcotopiaSonoPage`,
 * ~1600 linhas) a página INTEIRA reconciliava continuamente — jank e consumo de
 * bateria mensuráveis no webview do FB/IG no mobile (o grosso do tráfego pago),
 * rodando mesmo com a aba oculta. Aqui só esta subárvore re-renderiza; `memo`
 * ainda impede que re-renders do pai (troca de tab/plano, prova social, preview
 * de áudio) atinjam o mini-player.
 */
function SonoHeroMiniPlayerImpl() {
  const [heroNightIndex, setHeroNightIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setHeroNightIndex((prev) => (prev + 1) % PROTOCOL_NIGHTS.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);
  const heroNight = PROTOCOL_NIGHTS[heroNightIndex];

  return (
    <div className="lp-sono-mini-player">
      <p
        key={`eyebrow-${heroNightIndex}`}
        className="lp-sono-mini-player-eyebrow lp-sono-label-flip"
      >
        Noite {heroNight.night} de 7
      </p>

      <div className="lp-sono-mini-player-art">
        {PROTOCOL_NIGHTS.map((night, i) => (
          <img
            key={night.id}
            src={night.imageUrl}
            alt=""
            loading={i === 0 ? 'eager' : 'lazy'}
            decoding="async"
            style={{ opacity: i === heroNightIndex ? 1 : 0 }}
          />
        ))}
      </div>

      <div className="lp-sono-mini-player-meta">
        <p
          key={`title-${heroNightIndex}`}
          className="lp-sono-mini-player-title lp-sono-label-flip"
        >
          {heroNight.title}
        </p>
        <p
          key={`duration-${heroNightIndex}`}
          className="lp-sono-mini-player-duration lp-sono-label-flip"
        >
          {heroNight.duration}
        </p>
      </div>

      <div className="lp-sono-mini-player-dots">
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <span
            key={n}
            className={`lp-sono-mini-player-dot ${n === heroNight.night ? 'is-current' : ''}`}
          />
        ))}
      </div>

      <div className="lp-sono-mini-player-controls">
        <span className="lp-sono-mini-player-skip">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="11 17 6 12 11 7" />
            <path d="M18 18a6 6 0 0 0-6-6H6" />
          </svg>
          <span>15</span>
        </span>

        <span className="lp-sono-mini-player-play">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 5.5v13a1 1 0 0 0 1.55.83l10-6.5a1 1 0 0 0 0-1.66l-10-6.5A1 1 0 0 0 7 5.5z" />
          </svg>
        </span>

        <span className="lp-sono-mini-player-skip">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="13 17 18 12 13 7" />
            <path d="M6 18a6 6 0 0 1 6-6h6" />
          </svg>
          <span>15</span>
        </span>
      </div>

      <div className="lp-sono-mini-player-progress">
        <span className="lp-sono-mini-player-time">0:00</span>
        <div className="lp-sono-mini-player-bar">
          <span className="lp-sono-mini-player-fill" />
          <span className="lp-sono-mini-player-thumb" />
        </div>
        <span key={`end-${heroNightIndex}`} className="lp-sono-mini-player-time is-end lp-sono-label-flip">
          {heroNight.duration}
        </span>
      </div>
    </div>
  );
}

const SonoHeroMiniPlayer = memo(SonoHeroMiniPlayerImpl);
export default SonoHeroMiniPlayer;

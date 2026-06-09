import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import mixpanel from '@/lib/mixpanel';

// Posições determinísticas das estrelas (distribuição por razão áurea) —
// evita reflow aleatório a cada render e mantém o céu estável.
const STARS = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  x: ((i * 127.1 + 23.5) % 100).toFixed(2),
  y: ((i * 83.7 + 11.3) % 100).toFixed(2),
  r: (0.8 + ((i * 0.43) % 1.6)).toFixed(1),
  dur: (2.6 + ((i * 0.31) % 4.2)).toFixed(1),
  del: ((i * 0.19) % 7).toFixed(1),
}));

const DREAM_CTA = '/sonhos?from=eco_ia_dream';

function MoonOrb() {
  return (
    <span className="lp-eco-dream-moon" aria-hidden="true">
      <svg width="56" height="56" viewBox="0 0 64 64" fill="none">
        <defs>
          <radialGradient id="ecoDreamMoon" cx="38%" cy="30%" r="68%">
            <stop offset="0%" stopColor="#F5E09A" />
            <stop offset="45%" stopColor="#C9A55A" />
            <stop offset="100%" stopColor="#7A5520" />
          </radialGradient>
        </defs>
        <circle cx="32" cy="32" r="26" fill="url(#ecoDreamMoon)" />
        <circle cx="25" cy="23" r="4" fill="rgba(0,0,0,0.13)" />
        <circle cx="38" cy="38" r="2.5" fill="rgba(0,0,0,0.1)" />
        <circle cx="22" cy="38" r="1.8" fill="rgba(0,0,0,0.08)" />
        <circle cx="40" cy="22" r="1.2" fill="rgba(0,0,0,0.07)" />
      </svg>
    </span>
  );
}

export default function EcoDreamSection() {
  // Cormorant Garamond — fonte onírica da experiência de sonhos. Carregada
  // sob demanda (mesmo padrão de EcoDreamPage) para não pesar nas outras seções.
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap';
    document.head.appendChild(link);
    return () => {
      if (document.head.contains(link)) document.head.removeChild(link);
    };
  }, []);

  const handleCtaClick = () => {
    try {
      mixpanel.track('Landing · Dream CTA clicado', {
        section: 'eco_ia_dream',
        from: 'eco_ia_dream',
        plan: 'annual',
      });
    } catch {
      // noop
    }
  };

  return (
    <section className="lp-eco-dream" aria-labelledby="eco-dream-title">
      {/* Atmosfera: nebulosa + campo de estrelas */}
      <div className="lp-eco-dream-nebula" aria-hidden="true" />
      <div className="lp-eco-dream-stars" aria-hidden="true">
        {STARS.map((star) => (
          <span
            key={star.id}
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.r}px`,
              height: `${star.r}px`,
              animationDuration: `${star.dur}s`,
              animationDelay: `${star.del}s`,
            }}
          />
        ))}
      </div>

      <div className="lp-eco-dream-inner">
        <div className="lp-eco-dream-head scroll-reveal">
          <MoonOrb />
          <p className="lp-eco-dream-kicker">Ecodream · Interpretação de sonhos</p>
          <h2 id="eco-dream-title" className="lp-eco-dream-title">
            O que seu sonho está tentando <em>te dizer?</em>
          </h2>
          <p className="lp-eco-dream-lead">
            A Eco interpreta pelo olhar de Freud e Jung — em segundos.
          </p>
        </div>

        <div className="lp-eco-dream-cards scroll-reveal stagger-1">
          <article className="lp-eco-dream-card">
            <p className="lp-eco-dream-card-label">Seu sonho</p>
            <p className="lp-eco-dream-card-dream">
              “Eu estava sendo perseguido e minhas pernas não respondiam.”
            </p>
          </article>

          <article className="lp-eco-dream-card lp-eco-dream-card--interp">
            <p className="lp-eco-dream-card-label">A leitura da Eco</p>
            <p className="lp-eco-dream-card-interp">
              A perseguição costuma falar de algo <strong>evitado na vida
              desperta</strong>. As pernas que travam são o corpo dizendo: parte
              de você quer parar de fugir e encarar o que vem atrás.
            </p>
          </article>
        </div>

        <div className="lp-eco-dream-actions scroll-reveal stagger-2">
          <Link to={DREAM_CTA} className="lp-eco-dream-cta" onClick={handleCtaClick}>
            Interpretar meu sonho →
          </Link>
        </div>
      </div>
    </section>
  );
}

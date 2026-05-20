import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useHeadlineVariant } from '@/hooks/useHeadlineVariant';
import { useSectionInView } from './useSectionInView';
import { trackLandingCta } from './trackLandingCta';

const HERO_ROTATING_LINES = [
  'Menos ansiedade',
  'Durma melhor',
  'Mais presença',
  'Sinta-se mais leve',
  'Entenda suas emoções',
  'Volte para si',
] as const;

const ROTATION_INTERVAL_MS = 2400;
const ENTER_DURATION = 0.35;
const EXIT_DURATION = 0.4;
const SLIDE_DISTANCE = 50;

export default function EcotopiaHero() {
  const { variant } = useHeadlineVariant();
  const ref = useSectionInView('hero', variant);
  const [lineIndex, setLineIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setLineIndex((i) => (i + 1) % HERO_ROTATING_LINES.length);
    }, ROTATION_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  const currentLine = HERO_ROTATING_LINES[lineIndex];

  return (
    <section id="topo" ref={ref} className="lp-hero">
      <h1 className="reveal-soft">
        <span className="lp-hero-rotator-window" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={currentLine}
              className="lp-hero-rotator-line"
              initial={{ y: SLIDE_DISTANCE, opacity: 0 }}
              animate={{
                y: 0,
                opacity: 1,
                transition: { duration: ENTER_DURATION, ease: [0.22, 1, 0.36, 1] },
              }}
              exit={{
                y: -SLIDE_DISTANCE,
                opacity: 0,
                transition: { duration: EXIT_DURATION, ease: [0.4, 0, 1, 1] },
              }}
            >
              {currentLine}
            </motion.span>
          </AnimatePresence>
        </span>
        <span><em>tudo com a Ecotopia</em></span>
      </h1>

      <div className="lp-hero-cards">
        <div className="lp-hero-card reveal-soft animation-delay-100">
          <h2>
            Aplicativo de autoconhecimento com<br />
            Eco AI, ritual diário e biblioteca filosófica
          </h2>
          <Link
            to="/register?plan=annual&from=hero_card1"
            className="cta-dark"
            onClick={() =>
              trackLandingCta({
                section: 'hero',
                plan: 'annual',
                from: 'hero_card1',
                headline_variant: variant,
              })
            }
          >
            Experimente por R$ 0
          </Link>
          <div
            className="lp-hero-placeholder"
            style={{
              backgroundImage: 'url(/images/5-aneis-hero.webp)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        </div>

        <div className="lp-hero-card reveal-soft animation-delay-200">
          <h2>
            Diário Estoico
            <br />
            366 lições filosóficas
          </h2>
          <Link
            to="/register?plan=annual&from=hero_card2"
            className="cta-dark"
            onClick={() =>
              trackLandingCta({
                section: 'hero',
                plan: 'annual',
                from: 'hero_card2',
                headline_variant: variant,
              })
            }
          >
            Começar hoje
          </Link>
          <div
            className="lp-hero-placeholder"
            style={{
              backgroundImage: 'url(/images/diario-estoico.webp)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        </div>
      </div>
    </section>
  );
}

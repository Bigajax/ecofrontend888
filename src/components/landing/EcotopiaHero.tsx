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

const HERO_BULLETS = [
  'Eco IA disponível 24 horas por dia.',
  'Meditações, sono, estoicismo e práticas guiadas.',
  '7 dias gratuitos para experimentar tudo.',
] as const;

const ROTATION_INTERVAL_MS = 2400;
const ENTER_DURATION = 0.35;
const EXIT_DURATION = 0.4;
const SLIDE_DISTANCE = 50;

function CheckCircleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.2 2.4 2.4 4.6-5" />
    </svg>
  );
}

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

      <ul className="lp-hero-bullets reveal-soft animation-delay-100">
        {HERO_BULLETS.map((bullet) => (
          <li key={bullet}>
            <CheckCircleIcon />
            {bullet}
          </li>
        ))}
      </ul>

      <div className="lp-hero-cards">
        <div className="lp-hero-card reveal-soft animation-delay-100">
          <h2>Autoconhecimento prático em um único app.</h2>
          <Link
            to="/assinar?step=plan&plan=monthly&from=hero_card1"
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
            Começar 7 dias gratuitos
          </Link>
          <div className="lp-hero-placeholder">
            <img
              src="/images/autoconhecimento-card.webp"
              alt=""
              width="800"
              height="500"
              fetchPriority="high"
              decoding="async"
              className="lp-hero-placeholder-img"
            />
          </div>
        </div>

        <div className="lp-hero-card reveal-soft animation-delay-200">
          <h2>Uma conversa quando você precisar.</h2>
          <Link
            to="/assinar?step=plan&plan=monthly&from=hero_card2"
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
            Conhecer a Eco
          </Link>
          <div className="lp-hero-placeholder">
            <img
              src="/images/eco-ai-card.webp"
              alt=""
              width="600"
              height="500"
              fetchPriority="high"
              decoding="async"
              className="lp-hero-placeholder-img"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

import { Link } from 'react-router-dom';
import { useHeadlineVariant } from '@/hooks/useHeadlineVariant';
import { useSectionInView } from './useSectionInView';
import { trackLandingCta } from './trackLandingCta';

// Orb decorativo (mascote ECO de olho fechado) — mesma linguagem da Testimonios
const Orb = ({ bg, eyeColor = '#0D3461' }: { bg: string; eyeColor?: string }) => (
  <svg viewBox="0 0 80 80" width="100%" height="100%" aria-hidden="true">
    <defs>
      <radialGradient id={`emp-grad-${bg.replace(/[^a-z0-9]/gi, '')}`} cx="35%" cy="32%" r="70%">
        <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
        <stop offset="60%" stopColor={bg} />
        <stop offset="100%" stopColor={bg} />
      </radialGradient>
    </defs>
    <circle cx="40" cy="40" r="36" fill={`url(#emp-grad-${bg.replace(/[^a-z0-9]/gi, '')})`} />
    <path d="M30 42 q5 6 10 0" stroke={eyeColor} strokeWidth="3" strokeLinecap="round" fill="none" />
    <path d="M44 42 q5 6 10 0" stroke={eyeColor} strokeWidth="3" strokeLinecap="round" fill="none" />
  </svg>
);

const Sparkle = ({ color }: { color: string }) => (
  <svg viewBox="0 0 20 20" width="100%" height="100%" aria-hidden="true">
    <path d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8 Z" fill={color} />
  </svg>
);

const Cloud = ({ color }: { color: string }) => (
  <svg viewBox="0 0 100 60" width="100%" height="100%" aria-hidden="true">
    <ellipse cx="30" cy="40" rx="22" ry="16" fill={color} />
    <ellipse cx="55" cy="34" rx="26" ry="20" fill={color} />
    <ellipse cx="78" cy="42" rx="18" ry="14" fill={color} />
  </svg>
);

export default function EmpresasSection() {
  const { variant } = useHeadlineVariant();
  const ref = useSectionInView('empresas', variant);

  return (
    <section ref={ref} id="empresas" className="lp-empresas">
      <div className="lp-empresas-card">
        {/* Decorações no lado direito (no lugar das fotos) */}
        <div className="lp-empresas-deco" aria-hidden="true">
          <span className="lp-empresas-orb lp-empresas-orb--peach">
            <Orb bg="#FFC499" />
          </span>
          <span className="lp-empresas-orb lp-empresas-orb--violet">
            <Orb bg="#B89CFF" />
          </span>
          <span className="lp-empresas-orb lp-empresas-orb--mint">
            <Orb bg="#9EE6BD" />
          </span>
          <span className="lp-empresas-sparkle lp-empresas-sparkle--yellow">
            <Sparkle color="#FFD54F" />
          </span>
          <span className="lp-empresas-sparkle lp-empresas-sparkle--pink">
            <Sparkle color="#F091A8" />
          </span>
          <span className="lp-empresas-cloud">
            <Cloud color="rgba(255, 255, 255, 0.85)" />
          </span>
        </div>

        <div className="lp-empresas-body">
          <h2 className="lp-empresas-title scroll-reveal">
            Para equipes que cuidam
            <br />
            das pessoas que cuidam
          </h2>
          <p className="lp-empresas-text scroll-reveal">
            Leve o ECO para sua equipe — Eco IA, meditações guiadas, Diário Estoico
            e Cinco Anéis da Disciplina em um único acesso. Bem-estar emocional
            prático, em português, para o seu time.
          </p>
          <div className="lp-empresas-actions">
            <Link
              to="/contato?from=empresas_demo"
              className="lp-empresas-cta lp-empresas-cta--primary"
              onClick={() =>
                trackLandingCta({
                  section: 'empresas',
                  plan: 'b2b',
                  from: 'empresas_demo',
                  headline_variant: variant,
                })
              }
            >
              Solicitar demonstração
            </Link>
            <Link
              to="/empresas?from=empresas_saber_mais"
              className="lp-empresas-cta lp-empresas-cta--ghost"
              onClick={() =>
                trackLandingCta({
                  section: 'empresas',
                  plan: 'b2b',
                  from: 'empresas_saber_mais',
                  headline_variant: variant,
                })
              }
            >
              Saber mais
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

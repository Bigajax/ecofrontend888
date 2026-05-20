import { useSectionInView } from './useSectionInView';

type Testimonio = {
  key: string;
  quote: string;
  caption: string;
};

const TESTIMONIOS: Testimonio[] = [
  {
    key: 'lembretes',
    quote:
      'Os lembretes diários para ser gentil e paciente comigo mesma — enquanto pratico hábitos novos — me ajudaram a encontrar um espaço interno mais calmo no meu dia.',
    caption: 'Membro · sobre construir hábitos mais úteis',
  },
  {
    key: 'pensamentos',
    quote:
      'O ECO me ajudou a começar o processo de me afastar de pensamentos tóxicos e perceber que faço parte de algo maior do que as minhas próprias mágoas.',
    caption: 'Membro · sobre aprender a pensar de outros jeitos',
  },
  {
    key: 'relacao',
    quote:
      'As estratégias dos programas me permitiram trabalhar em partes de mim que eu vinha empurrando com a barriga. O ECO mudou a relação que eu tinha comigo mesma.',
    caption: 'Membro · sobre atravessar os próprios sentimentos',
  },
];

// ─── Orb decorativo (mascote ECO com olho fechado) ───────────────────────────
const Orb = ({ bg, eyeColor = '#1A1A1A' }: { bg: string; eyeColor?: string }) => (
  <svg viewBox="0 0 80 80" width="80" height="80" aria-hidden="true">
    <defs>
      <radialGradient id={`grad-${bg.replace(/[^a-z0-9]/gi, '')}`} cx="35%" cy="32%" r="70%">
        <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
        <stop offset="60%" stopColor={bg} />
        <stop offset="100%" stopColor={bg} />
      </radialGradient>
    </defs>
    <circle cx="40" cy="40" r="36" fill={`url(#grad-${bg.replace(/[^a-z0-9]/gi, '')})`} />
    <path
      d="M30 42 q5 6 10 0"
      stroke={eyeColor}
      strokeWidth="3"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M44 42 q5 6 10 0"
      stroke={eyeColor}
      strokeWidth="3"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

const Sparkle = ({ color }: { color: string }) => (
  <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
    <path d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8 Z" fill={color} />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────

export default function TestimoniosSection() {
  const ref = useSectionInView('depoimentos');

  return (
    <section ref={ref} id="depoimentos" className="lp-testimonios">
      <div className="lp-testimonios-hero">
        <span className="lp-testimonios-orb lp-testimonios-orb--blue"><Orb bg="#6EC8FF" /></span>
        <span className="lp-testimonios-orb lp-testimonios-orb--green"><Orb bg="#5BC07F" /></span>
        <span className="lp-testimonios-orb lp-testimonios-orb--orange"><Orb bg="#F58A2E" /></span>
        <span className="lp-testimonios-orb lp-testimonios-orb--pink"><Orb bg="#F091A8" /></span>

        <span className="lp-testimonios-sparkle lp-testimonios-sparkle--yellow"><Sparkle color="#F2C94C" /></span>
        <span className="lp-testimonios-sparkle lp-testimonios-sparkle--pink"><Sparkle color="#F091A8" /></span>

        <h2 className="lp-testimonios-title scroll-reveal">
          Membros vivendo dias
          <br />
          mais leves e equilibrados
        </h2>
      </div>

      <div className="lp-testimonios-grid">
        {TESTIMONIOS.map((t, i) => (
          <article
            key={t.key}
            className={`lp-testimonios-card scroll-reveal stagger-${(i % 3) + 1}`}
          >
            <p className="lp-testimonios-quote">“{t.quote}”</p>
            <p className="lp-testimonios-caption">{t.caption}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

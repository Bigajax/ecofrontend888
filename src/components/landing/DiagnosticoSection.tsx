import { ChevronRight } from 'lucide-react';

// ──────────────────────────────────────────────────────────────────────
// Ícones coloridos — SVGs inline, estilo Headspace (cheios, decorativos)
// ──────────────────────────────────────────────────────────────────────

type OrbTone = 'sleep' | 'stress' | 'anxiety' | 'thoughts' | 'meditation' | 'talk';

const OrbIcon = ({ src, tone }: { src: string; tone: OrbTone }) => (
  <img
    src={src}
    alt=""
    aria-hidden="true"
    width={88}
    height={88}
    loading="lazy"
    decoding="async"
    className={`lp-cat-orb lp-cat-orb--${tone}`}
  />
);

const StresseIcon = () => <OrbIcon src="/images/stress-orb.png" tone="stress" />;
const MoonIcon = () => <OrbIcon src="/images/sleep-orb.png" tone="sleep" />;
const SpiralIcon = () => <OrbIcon src="/images/anxiety-orb.png" tone="anxiety" />;

const BlobThoughtIcon = () => <OrbIcon src="/images/thoughts-orb.png" tone="thoughts" />;
const SunIcon = () => <OrbIcon src="/images/meditation-orb.png" tone="meditation" />;

const ChatThumbIcon = () => <OrbIcon src="/images/talk-orb.png" tone="talk" />;

// ──────────────────────────────────────────────────────────────────────

const CATEGORIAS = [
  { Icon: StresseIcon,     label: 'Menos estresse',            href: '#biblioteca' },
  { Icon: MoonIcon,        label: 'Durma bem',                 href: '#biblioteca' },
  { Icon: SpiralIcon,      label: 'Gerenciar a ansiedade',     href: '#biblioteca' },
  { Icon: BlobThoughtIcon, label: 'Organizar a cabeça',         href: '#biblioteca' },
  { Icon: SunIcon,         label: 'Meditar',                    href: '#biblioteca' },
  { Icon: ChatThumbIcon,   label: 'Conversar com a Eco',       href: '#biblioteca' },
];

export default function DiagnosticoSection() {
  return (
    <section id="categorias" className="lp-cat-section">
      <h2 className="scroll-reveal">
        O que você precisa hoje?
      </h2>
      <div className="lp-cat-grid">
        {CATEGORIAS.map(({ Icon, label, href }, i) => (
          <a
            key={label}
            href={href}
            className={`lp-cat scroll-reveal stagger-${(i % 6) + 1}`}
          >
            <span className="lp-cat-label">{label}</span>
            <span className="lp-cat-end">
              <span className="lp-cat-emoji" aria-hidden="true">
                <Icon />
              </span>
              <ChevronRight size={24} strokeWidth={2} color="#4B4C4D" className="lp-cat-arrow" />
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

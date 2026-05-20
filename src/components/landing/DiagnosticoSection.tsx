import { ChevronRight } from 'lucide-react';

// ──────────────────────────────────────────────────────────────────────
// Ícones coloridos — SVGs inline, estilo Headspace (cheios, decorativos)
// ──────────────────────────────────────────────────────────────────────

const StresseIcon = () => (
  <svg viewBox="0 0 40 40" width="36" height="36" aria-hidden="true">
    <path
      d="M5 22 Q9 12, 13 22 T21 22 T29 22 T35 22"
      stroke="#FFC107"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

const MoonIcon = () => (
  <svg viewBox="0 0 40 40" width="36" height="36" aria-hidden="true">
    <path
      d="M27 8 a14 14 0 1 0 5 24 c-8 1 -14 -6 -14 -14 c0 -4 2 -8 6 -10 c1 0 2 0 3 0z"
      fill="#A78BFA"
    />
    <circle cx="10" cy="12" r="1.4" fill="#FBCFE8" />
    <circle cx="14" cy="6" r="1" fill="#FBCFE8" />
    <circle cx="6" cy="22" r="1" fill="#FBCFE8" />
  </svg>
);

const SpiralIcon = () => (
  <svg viewBox="0 0 40 40" width="36" height="36" aria-hidden="true">
    <path
      d="M20 20 m-2 0 a2 2 0 1 1 4 0 a5 5 0 1 1 -7 0 a8 8 0 1 1 11 0 a11 11 0 1 1 -14 0 a14 14 0 1 1 17 0"
      stroke="#1FB6FF"
      strokeWidth="3.2"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

const BlobThoughtIcon = () => (
  <svg viewBox="0 0 40 40" width="36" height="36" aria-hidden="true">
    <defs>
      <radialGradient id="blobGrad" cx="35%" cy="35%" r="70%">
        <stop offset="0%" stopColor="#FFD3B5" />
        <stop offset="55%" stopColor="#FF8FBF" />
        <stop offset="100%" stopColor="#E8528E" />
      </radialGradient>
    </defs>
    <path
      d="M22 4 c10 0 16 6 16 16 c0 10 -6 16 -16 16 c-12 0 -18 -8 -18 -16 c0 -10 6 -16 18 -16z"
      fill="url(#blobGrad)"
    />
    <path
      d="M16 22 q3 2 6 0"
      stroke="#7A2A4A"
      strokeWidth="1.6"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

const SunIcon = () => (
  <svg viewBox="0 0 40 40" width="36" height="36" aria-hidden="true">
    <circle cx="20" cy="20" r="11" fill="#FF8A1F" />
    <circle cx="20" cy="20" r="14" fill="none" stroke="#FF8A1F" strokeOpacity="0.25" strokeWidth="2" />
  </svg>
);

const ChatThumbIcon = () => (
  <svg viewBox="0 0 40 40" width="36" height="36" aria-hidden="true">
    {/* thumbs up amarelo (atrás) */}
    <path
      d="M6 22 h4 v10 h-4z"
      fill="#FFC107"
    />
    <path
      d="M10 21 c2 -4 4 -6 6 -10 c1 -2 4 -1 4 2 c0 2 -1 4 -1 5 h6 c2 0 3 2 2 4 l-2 7 c-1 2 -2 3 -4 3 h-11z"
      fill="#FFD93D"
    />
    {/* chat bubble azul (frente) */}
    <path
      d="M22 6 h10 a4 4 0 0 1 4 4 v8 a4 4 0 0 1 -4 4 h-5 l-4 4 v-4 h-1 a4 4 0 0 1 -4 -4 v-8 a4 4 0 0 1 4 -4z"
      fill="#1FB6FF"
    />
  </svg>
);

// ──────────────────────────────────────────────────────────────────────

const CATEGORIAS = [
  { Icon: StresseIcon,     label: 'Menos estresse',            href: '#biblioteca' },
  { Icon: MoonIcon,        label: 'Durma bem',                 href: '#biblioteca' },
  { Icon: SpiralIcon,      label: 'Gerenciar a ansiedade',     href: '#biblioteca' },
  { Icon: BlobThoughtIcon, label: 'Pensamentos sobre o processo', href: '#biblioteca' },
  { Icon: SunIcon,         label: 'Pratique meditação',        href: '#biblioteca' },
  { Icon: ChatThumbIcon,   label: 'Conversar com a Eco',       href: '#biblioteca' },
];

export default function DiagnosticoSection() {
  return (
    <section id="categorias" className="lp-cat-section">
      <h2 className="scroll-reveal">
        Que tipo de estado de espírito você está buscando?
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
              <ChevronRight size={22} strokeWidth={2.25} color="var(--lp-text-muted)" />
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

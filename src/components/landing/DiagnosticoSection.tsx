import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import NeedModal from './NeedModal';
import { NEEDS } from './needsModalData';

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

// `needKey` casa com a `key` em needsModalData.ts → abre o modal correspondente.
const CATEGORIAS = [
  { Icon: StresseIcon,     label: 'Menos estresse',        needKey: 'stress' },
  { Icon: MoonIcon,        label: 'Durma bem',             needKey: 'sleep' },
  { Icon: SpiralIcon,      label: 'Gerenciar a ansiedade', needKey: 'anxiety' },
  { Icon: BlobThoughtIcon, label: 'Organizar a cabeça',    needKey: 'thoughts' },
  { Icon: SunIcon,         label: 'Meditar',               needKey: 'meditation' },
  { Icon: ChatThumbIcon,   label: 'Conversar com a Eco',   needKey: 'eco' },
];

export default function DiagnosticoSection() {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const activeNeed = NEEDS.find((n) => n.key === openKey) ?? null;

  return (
    <section id="categorias" className="lp-cat-section">
      <h2 className="scroll-reveal">
        O que você precisa hoje?
      </h2>
      <div className="lp-cat-grid">
        {CATEGORIAS.map(({ Icon, label, needKey }, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setOpenKey(needKey)}
            className={`lp-cat scroll-reveal stagger-${(i % 6) + 1}`}
          >
            <span className="lp-cat-label">{label}</span>
            <span className="lp-cat-end">
              <span className="lp-cat-emoji" aria-hidden="true">
                <Icon />
              </span>
              <ChevronRight size={24} strokeWidth={2} color="#4B4C4D" className="lp-cat-arrow" />
            </span>
          </button>
        ))}
      </div>

      <NeedModal
        open={openKey !== null}
        data={activeNeed}
        onClose={() => setOpenKey(null)}
      />
    </section>
  );
}

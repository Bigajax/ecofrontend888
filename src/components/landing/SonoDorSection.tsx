// Seção de Dor / Agitação — espelha a cena noturna do usuário ("isso sou eu")
// antes de apresentar o mecanismo (Protocolo do Sono). Estática; o fade-in ao
// entrar na viewport vem da classe .scroll-reveal já acionada por useScrollReveal().
// Layout: foto da cena (mulher cansada na cama) em recorte orgânico com ícones
// noturnos ao redor; no desktop vira 2 colunas (foto + conteúdo) com legenda
// manuscrita sob a foto. Marcadores com ícone em círculo colorido vazado e a
// frase de virada num card azul-claro com lua e estrelas.

// Stickers ilustrados (círculo roxo próprio) — um por dor, sem repetir forma.
const RECOGNITION = [
  { text: 'Deito cansado, mas a mente não desliga.', sticker: '/images/sono-sticker-nuvem.webp' },
  { text: 'Acordo no meio da noite e não volto a dormir.', sticker: '/images/sono-sticker-relogio.webp' },
  { text: 'Durmo, mas acordo como se não tivesse descansado.', sticker: '/images/sono-sticker-zzz.webp' },
];

function DecoStars() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M6 4v5M3.5 6.5h5" />
      <circle cx="16" cy="13" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="18" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Versão noturna (variante deite_se): cena da ovelha na cama + copy da referência.
const DOR_NIGHT: { lead: string; rest: string; icon: 'moon' | 'pulse' | 'spark' | 'headphones' }[] = [
  {
    icon: 'moon',
    lead: 'Você apaga a luz cansado.',
    rest: 'Mas, em vez de relaxar, a mente começa a acelerar.',
  },
  {
    icon: 'pulse',
    lead: 'O corpo está na cama,',
    rest: 'mas por dentro ainda parece ligado: pensando no que falou, no que vem amanhã, no que você não consegue resolver.',
  },
  {
    icon: 'spark',
    lead: 'O Ritual Boa Noite foi criado',
    rest: 'para esse momento.',
  },
  {
    icon: 'headphones',
    lead: 'Você não precisa escolher uma meditação,',
    rest: 'aprender uma técnica ou forçar o sono. Só deitar, colocar os fones e deixar a voz conduzir o corpo para fora do estado de alerta.',
  },
];

function DorNightIcon({ name }: { name: 'moon' | 'pulse' | 'spark' | 'headphones' }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  if (name === 'moon') {
    return (
      <svg {...common}>
        <path d="M20 14a8 8 0 1 1-9.5-9.8A6 6 0 0 0 20 14z" />
      </svg>
    );
  }
  if (name === 'pulse') {
    return (
      <svg {...common}>
        <path d="M3 12h3l2.5-6 4 13 2.5-7H21" />
      </svg>
    );
  }
  if (name === 'spark') {
    return (
      <svg {...common}>
        <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
      <path d="M4 14a2 2 0 0 1 2-2h1v6H6a2 2 0 0 1-2-2v-2z" />
      <path d="M20 14a2 2 0 0 0-2-2h-1v6h1a2 2 0 0 0 2-2v-2z" />
    </svg>
  );
}

interface SonoDorSectionProps {
  /** Variante deite_se: versão noturna (ovelha na cama + copy do ritual). */
  conviteMode?: boolean;
}

export default function SonoDorSection({ conviteMode = false }: SonoDorSectionProps) {
  if (conviteMode) {
    return (
      <section className="lp-sono-dor lp-sono-dor--night">
        {/* Costura: o creme da seção anterior esmaece pra dentro do navy */}
        <div className="lp-sono-seam lp-sono-seam--from-creme" aria-hidden />
        <div className="lp-sono-dor-night-inner">
          <div className="lp-sono-dor-night-text">
            <h2 className="lp-sono-dor-night-title scroll-reveal">
              Você conhece <span className="lp-sono-dor-night-accent">essa cena.</span>
            </h2>
            <ul className="lp-sono-dor-night-list">
              {DOR_NIGHT.map((item, i) => (
                <li className={`lp-sono-dor-night-item scroll-reveal stagger-${i + 1}`} key={item.lead}>
                  <span className="lp-sono-dor-night-ico" aria-hidden>
                    <DorNightIcon name={item.icon} />
                  </span>
                  <p className="lp-sono-dor-night-copy">
                    <strong>{item.lead}</strong> {item.rest}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="lp-sono-dor">
      <div className="lp-sono-dor-inner">
        <span className="lp-sono-dor-deco lp-sono-dor-deco--titlestars" aria-hidden>
          <DecoStars />
        </span>

        <h2 className="lp-sono-dor-title lp-sono-dor-title--mobile scroll-reveal">
          Você conhece <span className="lp-sono-dor-accent">essa cena.</span>
        </h2>

        <div className="lp-sono-dor-grid">
          <div className="lp-sono-dor-media scroll-reveal">
            <div className="lp-sono-dor-photo-wrap">
              <div className="lp-sono-dor-photo">
                <img
                  src="/images/sono-dor-cena.jpg"
                  alt="Mulher sentada na cama à noite, cansada, com a mão no rosto"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>

            <p className="lp-sono-dor-caption">
              Isso não é falta de força.
              <br />É falta de sono de verdade.
            </p>
          </div>

          <div className="lp-sono-dor-content">
            <h2 className="lp-sono-dor-title lp-sono-dor-title--desktop" aria-hidden>
              Você conhece <span className="lp-sono-dor-accent">essa cena.</span>
            </h2>

            <p className="lp-sono-dor-scene scroll-reveal stagger-1">
              Você apaga a luz cansado. Mas em vez de relaxar, a mente acelera: o que
              ficou pendente, o que vem amanhã, aquilo que você não devia ter dito.
            </p>
            <p className="lp-sono-dor-scene scroll-reveal stagger-1">
              Você olha o relógio. Já é 1h. Pega o celular “só um minuto”. Quando
              percebe, está mais alerta do que antes. E o sono, mais longe.
            </p>
            <p className="lp-sono-dor-scene scroll-reveal stagger-1">
              Talvez você já tenha tentado o comprimido, a melatonina, o chá.
              Resolve uma noite, mas você não quer depender disso pra dormir.
            </p>

            <ul className="lp-sono-dor-list scroll-reveal stagger-2">
              {RECOGNITION.map(({ text, sticker }) => (
                <li className="lp-sono-dor-card" key={text}>
                  <span className="lp-sono-dor-pill-icon" aria-hidden>
                    <img src={sticker} alt="" loading="lazy" decoding="async" />
                  </span>
                  <span className="lp-sono-dor-card-text">{text}</span>
                </li>
              ))}
            </ul>

            <div className="lp-sono-dor-turn scroll-reveal stagger-3">
              <p className="lp-sono-dor-turn-text">
                O problema não é o seu cansaço.{' '}
                <strong>É o estado de alerta que o seu corpo nunca aprendeu a desligar.</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

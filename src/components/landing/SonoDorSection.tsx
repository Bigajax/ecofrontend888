// Seção de Dor / Agitação — espelha a cena noturna do usuário ("isso sou eu")
// antes de apresentar o mecanismo (Protocolo do Sono). Estática; o fade-in ao
// entrar na viewport vem da classe .scroll-reveal já acionada por useScrollReveal().
// Layout: foto da cena (mulher cansada na cama) em recorte orgânico com ícones
// noturnos ao redor; no desktop vira 2 colunas (foto + conteúdo) com legenda
// manuscrita sob a foto. Marcadores com ícone em círculo colorido vazado e a
// frase de virada num card azul-claro com lua e estrelas.

// Stickers ilustrados (círculo roxo próprio) — um por dor, sem repetir forma.
const RECOGNITION = [
  { text: 'Deito cansado, mas a mente não desliga.', sticker: '/images/sono-sticker-nuvem.png' },
  { text: 'Acordo no meio da noite e não volto a dormir.', sticker: '/images/sono-sticker-relogio.png' },
  { text: 'Durmo, mas acordo como se não tivesse descansado.', sticker: '/images/sono-sticker-zzz.png' },
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

export default function SonoDorSection() {
  return (
    <section className="lp-sono-dor">
      <div className="lp-sono-dor-inner">
        <span className="lp-sono-dor-deco lp-sono-dor-deco--img lp-sono-dor-deco--titlecloud" aria-hidden>
          <img src="/images/sono-sticker-nuvem.png" alt="" loading="lazy" decoding="async" />
        </span>
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

            <ul className="lp-sono-dor-list scroll-reveal stagger-2">
              {RECOGNITION.map(({ text, sticker }) => (
                <li className="lp-sono-dor-card" key={text}>
                  <span className="lp-sono-dor-pill-icon" aria-hidden>
                    <img src={sticker} alt="" loading="lazy" decoding="async" />
                  </span>
                  <span className="lp-sono-dor-card-text">{text}</span>
                  <span className="lp-sono-dor-ring" aria-hidden />
                </li>
              ))}
            </ul>

            <div className="lp-sono-dor-turn scroll-reveal stagger-3">
              <span className="lp-sono-dor-turn-icon" aria-hidden>
                <img src="/images/sono-sticker-pillow.png" alt="" loading="lazy" decoding="async" />
              </span>
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

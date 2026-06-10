// Seção de Dor / Agitação — espelha a cena noturna do usuário ("isso sou eu")
// antes de apresentar o mecanismo (Protocolo do Sono). Estática; o fade-in ao
// entrar na viewport vem da classe .scroll-reveal já acionada por useScrollReveal().
// Layout: foto da cena (mulher cansada na cama) em moldura orgânica com ícones
// noturnos ao redor; no desktop vira 2 colunas (foto + conteúdo) com legenda
// manuscrita sob a foto. A frase de virada vive num card creme com ícone.

const RECOGNITION = [
  'Deito cansado, mas a mente não desliga.',
  'Acordo no meio da noite e não volto a dormir.',
  'Durmo, mas acordo como se não tivesse descansado.',
];

function DecoMoonStars() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6a9.5 9.5 0 1 0 8 14.5A11 11 0 0 1 20 6z" />
      <path d="M7 8.5v4M5 10.5h4" />
      <circle cx="28.5" cy="7.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function DecoBell() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

function DecoCrescent() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 4a8 8 0 1 0 6.5 11.5A9.5 9.5 0 0 1 14 4z" />
    </svg>
  );
}

function TurnMoonCloud() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 5a5 5 0 1 0 4 8 6.5 6.5 0 0 1-4-8z" />
      <path d="M3 18h9a3 3 0 0 0 0-6 4.5 4.5 0 0 0-8.6 1.4A2.4 2.4 0 0 0 3 18z" />
    </svg>
  );
}

export default function SonoDorSection() {
  return (
    <section className="lp-sono-dor">
      <div className="lp-sono-dor-inner">
        <h2 className="lp-sono-dor-title lp-sono-dor-title--mobile scroll-reveal">
          Você conhece <span className="lp-sono-dor-accent">essa cena.</span>
        </h2>

        <div className="lp-sono-dor-grid">
          <div className="lp-sono-dor-media scroll-reveal">
            <span className="lp-sono-dor-deco lp-sono-dor-deco--moon" aria-hidden>
              <DecoMoonStars />
            </span>
            <span className="lp-sono-dor-deco lp-sono-dor-deco--bell" aria-hidden>
              <DecoBell />
            </span>
            <span className="lp-sono-dor-deco lp-sono-dor-deco--crescent" aria-hidden>
              <DecoCrescent />
            </span>

            <div className="lp-sono-dor-photo">
              <img
                src="/images/sono-dor-cena.jpg"
                alt="Mulher sentada na cama à noite, cansada, com a mão no rosto"
                loading="lazy"
                decoding="async"
              />
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
              {RECOGNITION.map((text) => (
                <li className="lp-sono-dor-card" key={text}>
                  <span className="lp-sono-dor-dot" aria-hidden />
                  <span className="lp-sono-dor-card-text">{text}</span>
                </li>
              ))}
            </ul>

            <div className="lp-sono-dor-turn scroll-reveal stagger-3">
              <span className="lp-sono-dor-turn-icon" aria-hidden>
                <TurnMoonCloud />
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

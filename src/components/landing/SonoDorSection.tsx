// Seção de Dor / Agitação — espelha a cena noturna do usuário ("isso sou eu")
// antes de apresentar o mecanismo (Protocolo do Sono). Estática; o fade-in ao
// entrar na viewport vem da classe .scroll-reveal já acionada por useScrollReveal().
// Layout: foto da cena (mulher cansada na cama) em recorte orgânico com ícones
// noturnos ao redor; no desktop vira 2 colunas (foto + conteúdo) com legenda
// manuscrita sob a foto. Marcadores com ícone em círculo colorido vazado e a
// frase de virada num card azul-claro com lua e estrelas.

function PillMoon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 4a8 8 0 1 0 6.5 11.5A9.5 9.5 0 0 1 14 4z" />
      <path d="M5 5.5v3M3.5 7h3" />
    </svg>
  );
}

function PillPhone() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="3" width="10" height="18" rx="2.5" />
      <path d="M11 17.5h2" />
    </svg>
  );
}

function PillSnooze() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.5 5a7 7 0 1 0 6 10A8.5 8.5 0 0 1 12.5 5z" />
      <path d="M16 4h4l-4 4h4" />
    </svg>
  );
}

const RECOGNITION = [
  { text: 'Deito cansado, mas a mente não desliga.', Icon: PillMoon },
  { text: 'Acordo no meio da noite e não volto a dormir.', Icon: PillPhone },
  { text: 'Durmo, mas acordo como se não tivesse descansado.', Icon: PillSnooze },
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
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

function DecoSnooze() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.5 5a7 7 0 1 0 6 10A8.5 8.5 0 0 1 12.5 5z" />
      <path d="M15.5 4h3.5l-3.5 3.5H19" />
    </svg>
  );
}

function DecoCloud() {
  return (
    <svg width="30" height="20" viewBox="0 0 30 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 15h16a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1.8A3.6 3.6 0 0 0 6 15z" />
      <circle cx="27.5" cy="5" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function DecoStars() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M6 4v5M3.5 6.5h5" />
      <circle cx="16" cy="13" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="18" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TurnMoonStars() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 8a9 9 0 1 0 7.5 13.5A10.5 10.5 0 0 1 19 8z" />
      <path d="M8 5v4M6 7h4" />
      <circle cx="27" cy="6.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="30" cy="12" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function SonoDorSection() {
  return (
    <section className="lp-sono-dor">
      <div className="lp-sono-dor-inner">
        <span className="lp-sono-dor-deco lp-sono-dor-deco--titlecloud" aria-hidden>
          <DecoCloud />
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
              <span className="lp-sono-dor-deco lp-sono-dor-deco--moon" aria-hidden>
                <DecoMoonStars />
              </span>
              <span className="lp-sono-dor-deco lp-sono-dor-deco--bell" aria-hidden>
                <DecoBell />
              </span>
              <span className="lp-sono-dor-deco lp-sono-dor-deco--snooze" aria-hidden>
                <DecoSnooze />
              </span>

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
              {RECOGNITION.map(({ text, Icon }) => (
                <li className="lp-sono-dor-card" key={text}>
                  <span className="lp-sono-dor-pill-icon" aria-hidden>
                    <Icon />
                  </span>
                  <span className="lp-sono-dor-card-text">{text}</span>
                  <span className="lp-sono-dor-ring" aria-hidden />
                </li>
              ))}
            </ul>

            <div className="lp-sono-dor-turn scroll-reveal stagger-3">
              <span className="lp-sono-dor-turn-icon" aria-hidden>
                <TurnMoonStars />
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

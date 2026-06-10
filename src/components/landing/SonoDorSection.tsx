// Seção de Dor / Agitação — espelha a cena noturna do usuário ("isso sou eu")
// antes de apresentar o mecanismo (Protocolo do Sono). Estática; o fade-in ao
// entrar na viewport vem da classe .scroll-reveal já acionada por useScrollReveal().
// Layout: foto da cena (mulher cansada na cama) em recorte orgânico com ícones
// noturnos ao redor; no desktop vira 2 colunas (foto + conteúdo) com legenda
// manuscrita sob a foto. Marcadores com ícone em círculo colorido vazado e a
// frase de virada num card azul-claro com lua e estrelas.

// Olho aberto — deitado, mas a mente não desliga.
function PillEye() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

// Despertador — acordar no meio da noite.
function PillAlarm() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13.5" r="7" />
      <path d="M12 10.5v3l2 1.5" />
      <path d="M5.5 3 3 5.5M18.5 3 21 5.5" />
    </svg>
  );
}

// Bateria fraca — acordar sem ter descansado.
function PillBattery() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="8" width="16" height="8" rx="2" />
      <path d="M21.5 11v2" />
      <rect x="5" y="10.3" width="3.4" height="3.4" rx="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

const RECOGNITION = [
  { text: 'Deito cansado, mas a mente não desliga.', Icon: PillEye },
  { text: 'Acordo no meio da noite e não volto a dormir.', Icon: PillAlarm },
  { text: 'Durmo, mas acordo como se não tivesse descansado.', Icon: PillBattery },
];

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
              <span className="lp-sono-dor-deco lp-sono-dor-deco--img lp-sono-dor-deco--moon" aria-hidden>
                <img src="/images/sono-sticker-pillow.png" alt="" loading="lazy" decoding="async" />
              </span>
              <span className="lp-sono-dor-deco lp-sono-dor-deco--img lp-sono-dor-deco--bell" aria-hidden>
                <img src="/images/sono-sticker-relogio.png" alt="" loading="lazy" decoding="async" />
              </span>
              <span className="lp-sono-dor-deco lp-sono-dor-deco--img lp-sono-dor-deco--snooze" aria-hidden>
                <img src="/images/sono-sticker-zzz.png" alt="" loading="lazy" decoding="async" />
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

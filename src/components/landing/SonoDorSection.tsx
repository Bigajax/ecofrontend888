// Seção de Dor / Agitação — espelha a cena noturna do usuário ("isso sou eu")
// antes de apresentar o mecanismo (Protocolo do Sono). Estática; o fade-in ao
// entrar na viewport vem da classe .scroll-reveal já acionada por useScrollReveal().
// Conceito: editorial "noite → amanhecer" — atmosfera fria no topo que aquece na
// frase de virada (o insight). Detalhes artesanais levemente imperfeitos.

const RECOGNITION = [
  'Deito cansado, mas a mente não desliga.',
  'Acordo no meio da noite e não volto a dormir.',
  'Durmo, mas acordo como se não tivesse descansado.',
];

export default function SonoDorSection() {
  return (
    <section className="lp-sono-dor">
      <div className="lp-sono-dor-inner">
        <h2 className="lp-sono-dor-title scroll-reveal">
          Você conhece{' '}
          <span className="lp-sono-dor-accent">essa cena.</span>
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

        <p className="lp-sono-dor-turn scroll-reveal stagger-3">
          O problema não é o seu cansaço. É o estado de alerta que o seu corpo nunca
          aprendeu a desligar.
        </p>
      </div>
    </section>
  );
}

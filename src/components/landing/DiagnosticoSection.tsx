// Seção Categorias — "Que tipo de Ecotopia você está procurando?"
// Grid de 6 cards com emoji + nome. Substitui o Diagnóstico no fluxo.

const CATEGORIAS = [
  { label: 'Reduzir o estresse', emoji: '〰️' },
  { label: 'Dormir tranquilo', emoji: '🌙' },
  { label: 'Conversar com a Eco AI', emoji: '💬' },
  { label: 'Processar pensamentos', emoji: '💭' },
  { label: 'Praticar meditação', emoji: '🟠' },
  { label: 'Estudar filosofia', emoji: '📖' },
];

export default function DiagnosticoSection() {
  return (
    <section id="categorias" className="lp-cat-section">
      <h2 className="scroll-reveal">
        Que tipo de Ecotopia você está procurando?
      </h2>
      <div className="lp-cat-grid">
        {CATEGORIAS.map(({ label, emoji }, i) => (
          <a
            key={label}
            href="#biblioteca"
            className={`lp-cat scroll-reveal stagger-${(i % 6) + 1}`}
          >
            <span>{label}</span>
            <span className="lp-cat-emoji">
              {emoji} <span aria-hidden>›</span>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

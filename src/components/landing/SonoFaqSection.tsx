import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

// Seção FAQ / Objeções — acordeão controlado (apenas 1 item aberto por vez) que
// derruba as últimas objeções antes do bloco de oferta/preço/CTA.

const FAQ = [
  {
    q: 'Vou ser cobrado nos 7 dias?',
    a: 'Não. A cobrança só começa no 8º dia, e só se você não cancelar antes.',
  },
  {
    q: 'E se não funcionar pra mim?',
    a: 'Cancele em 1 toque, a qualquer momento, direto no app.',
  },
  {
    q: 'Quanto tempo preciso por noite?',
    a: 'Cerca de 10 minutos, antes de deitar.',
  },
  {
    q: 'Já tentei de tudo. É diferente?',
    a: 'Não é um som de chuva aleatório. É uma sequência de 7 noites que trabalha o estado de alerta em camadas: do corpo tenso aos pensamentos que não param.',
  },
];

export default function SonoFaqSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="lp-sono-faq">
      <div className="lp-sono-faq-inner">
        <h2 className="lp-sono-faq-title scroll-reveal">Antes de começar</h2>

        <div className="lp-sono-faq-list scroll-reveal stagger-1">
          {FAQ.map(({ q, a }, i) => {
            const isOpen = open === i;
            const panelId = `sono-faq-panel-${i}`;
            const buttonId = `sono-faq-button-${i}`;
            return (
              <div className={`lp-sono-faq-item ${isOpen ? 'is-open' : ''}`} key={q}>
                <button
                  type="button"
                  id={buttonId}
                  className="lp-sono-faq-q"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  <span className="lp-sono-faq-q-text">{q}</span>
                  <ChevronDown className="lp-sono-faq-chevron" size={20} aria-hidden />
                </button>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className="lp-sono-faq-a"
                  data-open={isOpen}
                >
                  <div className="lp-sono-faq-a-inner">
                    <p>{a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

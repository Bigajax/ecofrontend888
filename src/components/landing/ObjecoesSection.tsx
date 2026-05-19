import { useState } from 'react';
import { useSectionInView } from './useSectionInView';

// Biblioteca com abas — substitui a antiga Objeções. Grid 3 com cards gradient.

type Tab = 'destaques' | 'populares' | 'sono' | 'estresse' | 'meditacao';

interface LibCard {
  tag: string;
  title: string;
  body: string;
  grad: string;
  tabs: Tab[];
}

const ALL_CARDS: LibCard[] = [
  {
    tag: 'Em alta',
    title: 'Eco AI',
    body: 'Diálogo socrático em português, 24h. Treinada em Jung, Freud e estoicismo.',
    grad: 'var(--lp-grad-1)',
    tabs: ['destaques', 'populares', 'estresse'],
  },
  {
    tag: 'Novo',
    title: 'Diário Estoico',
    body: '366 lições de Marco Aurélio, Sêneca e Epicteto. Uma reflexão por dia.',
    grad: 'var(--lp-grad-2)',
    tabs: ['destaques', 'populares'],
  },
  {
    tag: 'Coleção',
    title: 'Cinco Anéis',
    body: 'Ritual diário de 5 min. Terra, Água, Fogo, Vento, Vazio — inspirado em Musashi.',
    grad: 'var(--lp-grad-3)',
    tabs: ['destaques', 'meditacao'],
  },
  {
    tag: 'Em alta',
    title: 'Protocolo do Sono',
    body: '7 noites de áudios guiados que reeducam seu sistema nervoso.',
    grad: 'var(--lp-grad-4)',
    tabs: ['destaques', 'sono', 'populares'],
  },
  {
    tag: 'Novo',
    title: 'Jornadas Dispenza',
    body: 'Meditações guiadas no estilo Dispenza. Em português, sem espera por tradução.',
    grad: 'var(--lp-grad-5)',
    tabs: ['destaques', 'meditacao'],
  },
  {
    tag: 'Curso',
    title: 'Quem Pensa Enriquece',
    body: '6 passos para mindset financeiro com profundidade socrática — não motivacional vazio.',
    grad: 'var(--lp-grad-6)',
    tabs: ['destaques', 'populares'],
  },
  {
    tag: 'Programa',
    title: 'Caleidoscópio',
    body: 'Mind movie de visualização ativa. Construa o filme da próxima versão de você.',
    grad: 'var(--lp-grad-7)',
    tabs: ['meditacao', 'populares'],
  },
  {
    tag: 'Coleção',
    title: 'Energy Blessings',
    body: 'Bênção dos centros de energia, sintonia com novos potenciais, espaço-tempo.',
    grad: 'var(--lp-grad-8)',
    tabs: ['meditacao', 'estresse'],
  },
];

const TABS: { id: Tab; label: string }[] = [
  { id: 'destaques', label: 'Destaques' },
  { id: 'populares', label: 'Populares' },
  { id: 'sono', label: 'Sono' },
  { id: 'estresse', label: 'Estresse' },
  { id: 'meditacao', label: 'Meditação' },
];

export default function ObjecoesSection() {
  const ref = useSectionInView('biblioteca_tabs');
  const [activeTab, setActiveTab] = useState<Tab>('destaques');

  const visibleCards = ALL_CARDS.filter((c) => c.tabs.includes(activeTab)).slice(0, 6);

  return (
    <section ref={ref} id="biblioteca" className="lp-library">
      <h2 className="lp-section-title scroll-reveal" style={{ marginTop: 0 }}>
        Explore a biblioteca
      </h2>

      <div className="lp-lib-tabs scroll-reveal" role="tablist">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            role="tab"
            aria-selected={activeTab === id}
            className={`lp-lib-tab ${activeTab === id ? 'is-active' : ''}`}
            onClick={() => setActiveTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="lp-lib-grid">
        {visibleCards.map((card, i) => (
          <article
            key={card.title}
            className={`lp-lib-card scroll-reveal stagger-${(i % 6) + 1}`}
            style={{ background: card.grad }}
          >
            <span className="lp-lib-tag">{card.tag}</span>
            <h3>{card.title}</h3>
            <p>{card.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

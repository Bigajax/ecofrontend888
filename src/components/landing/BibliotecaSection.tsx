import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useHeadlineVariant } from '@/hooks/useHeadlineVariant';
import { trackLandingCta } from './trackLandingCta';
import { DR_JOE_MEDITATIONS, type DrJoeMeditation } from '@/data/drJoeMeditations';
import { PROTOCOL_NIGHTS, type ProtocolNight } from '@/data/protocolNights';

type TabId = 'destaques' | 'populares' | 'sono' | 'ansiedade' | 'meditacao' | 'programas';

type CardKind = 'meditacao' | 'programa' | 'artigo' | 'sono';

const KIND_LABEL: Record<CardKind, string> = {
  meditacao: 'Meditação',
  programa: 'Programa',
  artigo: 'Artigo',
  sono: 'Sono',
};

type LibraryCard = {
  key: string;
  image: string;            // CSS url() ou string vazia (cai pro gradient)
  imagePosition?: string;
  gradient: string;
  title: string;
  subtitle: string;
  kind: CardKind;           // tipo do conteúdo (badge no canto superior)
  tag?: string;             // selo promocional opcional ("Em alta", "Top"…)
  to: string;
  from: string;
};

const TABS: { id: TabId; label: string }[] = [
  { id: 'destaques', label: 'Destaques' },
  { id: 'populares', label: 'Populares' },
  { id: 'meditacao', label: 'Meditação' },
  { id: 'programas', label: 'Programas' },
  { id: 'sono',      label: 'Sono' },
  { id: 'ansiedade', label: 'Ansiedade' },
];

// Programas e artigos próprios da Ecotopia (mesmas imagens usadas no app)
const PROGRAM_ANEIS: LibraryCard = {
  key: 'lib-prog-aneis',
  image: 'url("/images/five-rings-visual.webp")',
  imagePosition: 'center center',
  gradient: 'linear-gradient(to bottom, #5F7F52 0%, #1B3A26 100%)',
  title: '5 Anéis da Disciplina',
  subtitle: 'Construa hábitos que duram',
  kind: 'programa',
  to: '/assinar?plan=monthly&from=library_aneis',
  from: 'library_aneis',
};

const PROGRAM_RIQUEZA: LibraryCard = {
  key: 'lib-prog-riqueza',
  image: 'url("/images/quem-pensa-enriquece.webp")',
  imagePosition: 'center center',
  gradient: 'linear-gradient(to bottom, #1E3A5F 0%, #6BB6FF 100%)',
  title: 'Quem Pensa Enriquece',
  subtitle: 'Reprograme sua mente financeira',
  kind: 'programa',
  to: '/assinar?plan=monthly&from=library_riqueza',
  from: 'library_riqueza',
};

const PROGRAM_ESTOICO: LibraryCard = {
  key: 'lib-prog-estoico',
  image: 'url("/images/diario-estoico.webp")',
  imagePosition: 'center center',
  gradient: 'linear-gradient(to bottom, #1F3A5E 0%, #0D1F36 100%)',
  title: 'Diário Estoico',
  subtitle: '366 lições para a vida boa',
  kind: 'programa',
  to: '/assinar?plan=monthly&from=library_estoico',
  from: 'library_estoico',
};

const PROGRAM_ABUNDANCIA: LibraryCard = {
  key: 'lib-prog-abundancia',
  image: 'url("/images/abundancia-diagnostico.webp")',
  imagePosition: 'center center',
  gradient: 'linear-gradient(to bottom, #D4A017 0%, #1A0E00 100%)',
  title: 'Código da Abundância',
  subtitle: '7 sessões para destravar a prosperidade',
  kind: 'programa',
  to: '/assinar?plan=monthly&from=library_abundancia',
  from: 'library_abundancia',
};

const PROGRAM_CALEIDOSCOPIO: LibraryCard = {
  key: 'lib-prog-caleidoscopio',
  image: 'url("/images/caleidoscopio-mind-movie.webp")',
  imagePosition: 'center center',
  gradient: 'linear-gradient(to bottom, #B494D4 0%, #542B88 100%)',
  title: 'Caleidoscópio & Mind Movie',
  subtitle: 'Visualize e crie novas realidades internas',
  kind: 'programa',
  to: '/assinar?plan=monthly&from=library_caleidoscopio',
  from: 'library_caleidoscopio',
};

const ARTICLE_GOOD_NIGHT: LibraryCard = {
  key: 'lib-art-goodnight',
  image: 'url("/images/good-night-sleep.webp")',
  imagePosition: 'center center',
  gradient: 'linear-gradient(to bottom, #2A1D5B 0%, #0E0A2C 100%)',
  title: 'Como ter uma boa noite de sono',
  subtitle: 'Leitura de 6 min',
  kind: 'artigo',
  to: '/app/articles/good-night-sleep',
  from: 'library_article_goodnight',
};

const ARTICLE_SLEEP_STAGES: LibraryCard = {
  key: 'lib-art-sleepstages',
  image: 'url("/images/sleep-stages-intro.webp")',
  imagePosition: 'center center',
  gradient: 'linear-gradient(to bottom, #3F2378 0%, #15094A 100%)',
  title: 'Os estágios do sono profundo',
  subtitle: 'Leitura de 4 min',
  kind: 'artigo',
  to: '/app/articles/sleep',
  from: 'library_article_sleep',
};

// Meditações avulsas (fora do conjunto Dr. Joe) — mesmas imagens do app
const MED_INTRODUCAO: LibraryCard = {
  key: 'lib-med-introducao',
  image: 'url("/images/meditacao-introducao.webp")',
  imagePosition: 'center 32%',
  gradient: 'linear-gradient(to bottom, #6EC1E4 0%, #1F7BAD 100%)',
  title: 'Introdução à Meditação',
  subtitle: '8 min · Seus primeiros passos na prática',
  kind: 'meditacao',
  to: '/assinar?plan=monthly&from=library_introducao',
  from: 'library_introducao',
};

const MED_ACOLHENDO: LibraryCard = {
  key: 'lib-med-acolhendo',
  image: 'url("/images/acolhendo-respiracao.webp")',
  imagePosition: 'center center',
  gradient: 'linear-gradient(to bottom, #7BBFB5 0%, #084D42 100%)',
  title: 'Acolhendo sua respiração',
  subtitle: '7 min · Presença e calma pela respiração',
  kind: 'meditacao',
  to: '/assinar?plan=monthly&from=library_acolhendo',
  from: 'library_acolhendo',
};

const MED_ESTRESSE: LibraryCard = {
  key: 'lib-med-estresse',
  image: 'url("/images/liberando-estresse.webp")',
  imagePosition: 'center center',
  gradient: 'linear-gradient(to bottom, #C4A0E8 0%, #341870 100%)',
  title: 'Liberando o Estresse',
  subtitle: '5 min · Solte as tensões do dia',
  kind: 'meditacao',
  to: '/assinar?plan=monthly&from=library_estresse',
  from: 'library_estresse',
};

const MED_SONO: LibraryCard = {
  key: 'lib-med-sono',
  image: 'url("/images/meditacoes-sono-hero.webp")',
  imagePosition: 'center 32%',
  gradient: 'linear-gradient(to bottom, #4A4E8A 0%, #14172E 100%)',
  title: 'Meditação do Sono',
  subtitle: '15 min · Relaxe e durma profundamente',
  kind: 'meditacao',
  to: '/assinar?plan=monthly&from=library_meditacao_sono',
  from: 'library_meditacao_sono',
};

// ── Adapters ──────────────────────────────────────────────────────────
function fromDrJoe(m: DrJoeMeditation, tag?: string): LibraryCard {
  return {
    key: `lib-${m.id}`,
    image: m.image,
    imagePosition: m.imagePosition,
    gradient: m.gradient,
    title: m.title,
    subtitle: `${m.duration} · Dr. Joe Dispenza`,
    kind: 'meditacao',
    tag,
    to: `/assinar?plan=monthly&from=library_${m.id}`,
    from: `library_${m.id}`,
  };
}

function fromNight(n: ProtocolNight, tag?: string): LibraryCard {
  return {
    key: `lib-${n.id}`,
    image: n.imageUrl ? `url("${n.imageUrl}")` : '',
    imagePosition: 'center',
    gradient: n.gradient,
    title: n.title,
    subtitle: `${n.duration} · Protocolo do Sono`,
    kind: 'sono',
    tag,
    to: `/assinar?plan=monthly&from=library_${n.id}`,
    from: `library_${n.id}`,
  };
}

export default function BibliotecaSection() {
  const { variant } = useHeadlineVariant();
  const [activeTab, setActiveTab] = useState<TabId>('destaques');
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);
  const railRef = useRef<HTMLDivElement>(null);

  const cards = useMemo<LibraryCard[]>(() => {
    switch (activeTab) {
      case 'destaques':
        return [
          { ...PROGRAM_ANEIS, tag: 'Em alta' },
          fromDrJoe(DR_JOE_MEDITATIONS[0]),
          PROGRAM_ABUNDANCIA,
          { ...MED_INTRODUCAO, tag: 'Comece aqui' },
          PROGRAM_ESTOICO,
          PROGRAM_RIQUEZA,
          ARTICLE_GOOD_NIGHT,
        ];
      case 'populares':
        return [
          { ...PROGRAM_RIQUEZA, tag: 'Top' },
          PROGRAM_ABUNDANCIA,
          fromDrJoe(DR_JOE_MEDITATIONS[0]),
          PROGRAM_ANEIS,
          fromDrJoe(DR_JOE_MEDITATIONS[2]),
          PROGRAM_CALEIDOSCOPIO,
          fromNight(PROTOCOL_NIGHTS[0]),
          PROGRAM_ESTOICO,
        ];
      case 'meditacao':
        return [
          { ...MED_INTRODUCAO, tag: 'Comece aqui' },
          ...DR_JOE_MEDITATIONS.map((m, i) =>
            fromDrJoe(m, i === 0 ? 'Em alta' : undefined),
          ),
          MED_ACOLHENDO,
          MED_ESTRESSE,
          MED_SONO,
        ];
      case 'programas':
        return [
          { ...PROGRAM_ANEIS, tag: 'Em alta' },
          PROGRAM_RIQUEZA,
          PROGRAM_ABUNDANCIA,
          PROGRAM_CALEIDOSCOPIO,
          PROGRAM_ESTOICO,
          ARTICLE_GOOD_NIGHT,
          ARTICLE_SLEEP_STAGES,
        ];
      case 'sono':
        return [
          { ...MED_SONO, tag: 'Indicado' },
          ...PROTOCOL_NIGHTS.slice(0, 5).map((n) => fromNight(n)),
          ARTICLE_GOOD_NIGHT,
          ARTICLE_SLEEP_STAGES,
        ];
      case 'ansiedade':
        return [
          fromDrJoe(DR_JOE_MEDITATIONS[2], 'Recomendado'),
          MED_ACOLHENDO,
          fromNight(PROTOCOL_NIGHTS[1]),
          fromNight(PROTOCOL_NIGHTS[3]),
          PROGRAM_ANEIS,
          PROGRAM_ESTOICO,
          fromDrJoe(DR_JOE_MEDITATIONS[1]),
        ];
      default:
        return [];
    }
  }, [activeTab]);

  const scroll = (dir: 'prev' | 'next') => {
    if (!railRef.current) return;
    railRef.current.scrollBy({
      left: dir === 'next' ? 340 : -340,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const update = () => {
      const maxScroll = el.scrollWidth - el.clientWidth;
      setCanPrev(el.scrollLeft > 4);
      setCanNext(el.scrollLeft < maxScroll - 4);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [cards.length]);

  // Garante que a troca de aba sempre volte ao primeiro card, depois do re-render
  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    el.scrollLeft = 0;
    setCanPrev(false);
    setCanNext(el.scrollWidth > el.clientWidth);
  }, [activeTab]);

  return (
    <section id="biblioteca" className="lp-library">
      <h2 className="lp-library-title scroll-reveal">Explore nossa biblioteca</h2>

      <div className="lp-library-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            className={`lp-library-tab ${activeTab === t.id ? 'is-active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="lp-library-carousel">
        <div className="lp-library-cards" ref={railRef}>
          {cards.map((c) => (
            <Link
              key={c.key}
              to={c.to}
              className="lp-library-card"
              style={{
                backgroundImage: c.image || c.gradient,
                backgroundPosition: c.imagePosition || 'center',
              }}
              onClick={() =>
                trackLandingCta({
                  section: 'library',
                  plan: 'annual',
                  from: c.from,
                  headline_variant: variant,
                })
              }
            >
              {c.tag && <span className="lp-library-card-tag">{c.tag}</span>}
              <span className={`lp-library-card-kind lp-kind-${c.kind}`}>
                {KIND_LABEL[c.kind]}
              </span>
              <div className="lp-library-card-body">
                <h3>{c.title}</h3>
                <p>{c.subtitle}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="lp-library-controls">
          <button
            type="button"
            className="lp-library-arrow"
            onClick={() => scroll('prev')}
            aria-label="Anterior"
            disabled={!canPrev}
          >
            <ChevronLeft size={20} strokeWidth={2.4} />
          </button>
          <button
            type="button"
            className="lp-library-arrow"
            onClick={() => scroll('next')}
            aria-label="Próximo"
            disabled={!canNext}
          >
            <ChevronRight size={20} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </section>
  );
}

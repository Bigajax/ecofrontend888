import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useHeadlineVariant } from '@/hooks/useHeadlineVariant';
import { trackLandingCta } from './trackLandingCta';
import { DR_JOE_MEDITATIONS, type DrJoeMeditation } from '@/data/drJoeMeditations';
import { PROTOCOL_NIGHTS, type ProtocolNight } from '@/data/protocolNights';

type TabId = 'destaques' | 'populares' | 'sono' | 'ansiedade' | 'meditacao' | 'programas';

type LibraryCard = {
  key: string;
  image: string;            // CSS url() ou string vazia (cai pro gradient)
  imagePosition?: string;
  gradient: string;
  title: string;
  subtitle: string;
  tag?: string;
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
  subtitle: 'Programa · Construa hábitos que duram',
  to: '/register?plan=annual&from=library_aneis',
  from: 'library_aneis',
};

const PROGRAM_RIQUEZA: LibraryCard = {
  key: 'lib-prog-riqueza',
  image: 'url("/images/quem-pensa-enriquece.webp")',
  imagePosition: 'center center',
  gradient: 'linear-gradient(to bottom, #1E3A5F 0%, #6BB6FF 100%)',
  title: 'Quem Pensa Enriquece',
  subtitle: 'Programa · Reprograme sua mente financeira',
  to: '/register?plan=annual&from=library_riqueza',
  from: 'library_riqueza',
};

const PROGRAM_ESTOICO: LibraryCard = {
  key: 'lib-prog-estoico',
  image: 'url("/images/diario-estoico.webp")',
  imagePosition: 'center center',
  gradient: 'linear-gradient(to bottom, #1F3A5E 0%, #0D1F36 100%)',
  title: 'Diário Estoico',
  subtitle: 'Programa · 366 lições para a vida boa',
  to: '/register?plan=annual&from=library_estoico',
  from: 'library_estoico',
};

const ARTICLE_GOOD_NIGHT: LibraryCard = {
  key: 'lib-art-goodnight',
  image: 'url("/images/good-night-sleep.webp")',
  imagePosition: 'center center',
  gradient: 'linear-gradient(to bottom, #2A1D5B 0%, #0E0A2C 100%)',
  title: 'Como ter uma boa noite de sono',
  subtitle: 'Artigo · Leitura de 6 min',
  to: '/app/articles/good-night-sleep',
  from: 'library_article_goodnight',
};

const ARTICLE_SLEEP_STAGES: LibraryCard = {
  key: 'lib-art-sleepstages',
  image: 'url("/images/sleep-stages-intro.webp")',
  imagePosition: 'center center',
  gradient: 'linear-gradient(to bottom, #3F2378 0%, #15094A 100%)',
  title: 'Os estágios do sono profundo',
  subtitle: 'Artigo · Leitura de 4 min',
  to: '/app/articles/sleep',
  from: 'library_article_sleep',
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
    tag,
    to: `/register?plan=annual&from=library_${m.id}`,
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
    tag,
    to: `/register?plan=annual&from=library_${n.id}`,
    from: `library_${n.id}`,
  };
}

export default function BibliotecaSection() {
  const { variant } = useHeadlineVariant();
  const [activeTab, setActiveTab] = useState<TabId>('meditacao');
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);
  const railRef = useRef<HTMLDivElement>(null);

  const cards = useMemo<LibraryCard[]>(() => {
    switch (activeTab) {
      case 'destaques':
        return [
          { ...PROGRAM_ANEIS, tag: 'Em alta' },
          fromDrJoe(DR_JOE_MEDITATIONS[0]),
          PROGRAM_ESTOICO,
          PROGRAM_RIQUEZA,
          fromNight(PROTOCOL_NIGHTS[0]),
          ARTICLE_GOOD_NIGHT,
        ];
      case 'populares':
        return [
          { ...PROGRAM_RIQUEZA, tag: 'Top' },
          fromDrJoe(DR_JOE_MEDITATIONS[0]),
          PROGRAM_ANEIS,
          fromDrJoe(DR_JOE_MEDITATIONS[2]),
          fromNight(PROTOCOL_NIGHTS[0]),
          PROGRAM_ESTOICO,
        ];
      case 'meditacao':
        return DR_JOE_MEDITATIONS.map((m, i) =>
          fromDrJoe(m, i === 0 ? 'Em alta' : undefined),
        );
      case 'programas':
        return [
          { ...PROGRAM_ANEIS, tag: 'Programa' },
          { ...PROGRAM_RIQUEZA, tag: 'Programa' },
          { ...PROGRAM_ESTOICO, tag: 'Programa' },
          { ...ARTICLE_GOOD_NIGHT, tag: 'Artigo' },
          { ...ARTICLE_SLEEP_STAGES, tag: 'Artigo' },
        ];
      case 'sono':
        return [
          ...PROTOCOL_NIGHTS.slice(0, 5).map((n, i) =>
            fromNight(n, i === 0 ? 'Indicado' : undefined),
          ),
          ARTICLE_GOOD_NIGHT,
          ARTICLE_SLEEP_STAGES,
        ];
      case 'ansiedade':
        return [
          fromDrJoe(DR_JOE_MEDITATIONS[2], 'Recomendado'),
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
            onClick={() => {
              setActiveTab(t.id);
              if (railRef.current) railRef.current.scrollTo({ left: 0, behavior: 'smooth' });
            }}
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
              <div className="lp-library-card-body">
                <h3>{c.title}</h3>
                <p>{c.subtitle}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="lp-library-controls">
          <Link
            to="/register?plan=annual&from=library_view_all"
            className="lp-library-viewall"
            onClick={() =>
              trackLandingCta({
                section: 'library',
                plan: 'annual',
                from: 'library_view_all',
                headline_variant: variant,
              })
            }
          >
            Ver tudo
          </Link>
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

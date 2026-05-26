import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

type MenuKey = 'para-voce' | 'planos' | 'recursos' | 'sobre';

type MegaLink = { label: string; to: string; external?: boolean };
type MegaColumn = { heading: string; links: MegaLink[] };
type MegaCta = { eyebrow: string; title: string; body: string; ctaLabel: string; to: string; image?: string };

type MenuConfig = {
  key: MenuKey;
  label: string;
  columns: MegaColumn[];
  cta?: MegaCta;
};

const MENUS: MenuConfig[] = [
  {
    key: 'para-voce',
    label: 'Para você',
    columns: [
      {
        heading: 'O que oferecemos',
        links: [
          { label: 'Meditação', to: '/meditacao' },
          { label: 'Dormir', to: '/sono' },
          { label: 'Diário estoico', to: '/estoicismo' },
          { label: 'Disciplina · 5 anéis', to: '/disciplina' },
          { label: 'Eco · IA companheira', to: '/eco-ia' },
          { label: 'Dr. Joe Dispenza', to: '/dr-joe-dispenza' },
        ],
      },
      {
        heading: 'Como podemos ajudar',
        links: [
          { label: 'Ansiedade', to: '/ansiedade' },
          { label: 'Estresse', to: '/#categorias' },
          { label: 'Durma melhor', to: '/sono' },
          { label: 'Saúde mental', to: '/#categorias' },
        ],
      },
      {
        heading: 'Explore nossa biblioteca',
        links: [
          { label: 'Meditação · primeiros passos', to: '/meditacao' },
          { label: 'Música para dormir', to: '/sono' },
          { label: 'Sessões guiadas', to: '/#biblioteca' },
          { label: 'Programas estoicos', to: '/app/diario-estoico' },
        ],
      },
    ],
    cta: {
      eyebrow: 'Comece agora',
      title: 'Sete dias para sentir a diferença',
      body: 'Experimente o protocolo completo sem custo.',
      ctaLabel: 'Experimentar grátis →',
      to: '/register?plan=annual&from=mega-para-voce',
      image: '/images/mega-cta-eco.png',
    },
  },
  {
    key: 'planos',
    label: 'Nossos planos',
    columns: [
      {
        heading: 'Assinaturas Ecotopia',
        links: [
          { label: 'Anual · economize 40%', to: '/precos' },
          { label: 'Mensal', to: '/precos' },
        ],
      },
      {
        heading: 'Comunidade',
        links: [
          { label: 'Indique um amigo', to: '/precos' },
          { label: 'Resgate um código', to: '/precos' },
        ],
      },
    ],
    cta: {
      eyebrow: 'Plano anual',
      title: 'O melhor custo-benefício',
      body: 'Acesso completo ao app, do início ao avançado.',
      ctaLabel: 'Ver planos →',
      to: '/precos',
      image: '/images/mega-cta-eco.png',
    },
  },
  {
    key: 'recursos',
    label: 'Recursos',
    columns: [
      {
        heading: 'Artigos',
        links: [
          { label: 'Sono profundo · ciência por trás', to: '/#faq' },
          { label: 'Como dormir melhor', to: '/sono' },
          { label: 'Estoicismo prático no dia a dia', to: '/app/diario-estoico' },
          { label: 'Meditar quando a mente não para', to: '/#biblioteca' },
        ],
      },
      {
        heading: 'Ajuda',
        links: [
          { label: 'Perguntas frequentes', to: '/#faq' },
          { label: 'Suporte', to: '/#faq' },
        ],
      },
    ],
    cta: {
      eyebrow: 'Experimente',
      title: 'Diagnóstico em 60 segundos',
      body: 'Receba um caminho desenhado para o seu estado atual.',
      ctaLabel: 'Fazer diagnóstico →',
      to: '/#categorias',
      image: '/images/mega-cta-eco.png',
    },
  },
  {
    key: 'sobre',
    label: 'Sobre',
    columns: [
      {
        heading: 'Sobre Ecotopia',
        links: [
          { label: 'Nossa história', to: '/#pilares' },
          { label: 'Voz e tom', to: '/#hero' },
        ],
      },
      {
        heading: 'Nossa especialização',
        links: [
          { label: 'Ciência', to: '/#pilares' },
          { label: 'IA · arquitetura Eco', to: '/#hero' },
        ],
      },
      {
        heading: 'Junte-se a nós',
        links: [
          { label: 'Carreiras', to: '/#faq' },
        ],
      },
    ],
  },
];

export default function EcotopiaTopbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedItem, setExpandedItem] = useState<MenuKey | null>(null);

  // ESC + body scroll lock for the drawer
  useEffect(() => {
    if (!drawerOpen) return;
    document.body.classList.add('eco-no-scroll');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('eco-no-scroll');
      window.removeEventListener('keydown', onKey);
    };
  }, [drawerOpen]);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setExpandedItem(null);
  }, []);

  const toggleAccordion = useCallback((key: MenuKey) => {
    setExpandedItem((prev) => (prev === key ? null : key));
  }, []);

  return (
    <>
      <div className="top-banner">
        <Link to="/precos">7 dias grátis · Autoconhecimento prático</Link>
      </div>

      <nav className={`lp-nav ${isScrolled ? 'is-scrolled' : ''}`} aria-label="Navegação principal">
        <div className="lp-nav-left">
          <Link to="/" aria-label="Ecotopia" className="lp-nav-brand">
            <img
              src="/images/ecotopia-logo-horizontal.png"
              alt="Ecotopia"
              width={180}
              height={44}
              className="lp-nav-brand-img"
            />
          </Link>

          <ul className="lp-mega-list">
            {MENUS.map((menu) => (
              <li key={menu.key} className="lp-mega-item">
                <button
                  type="button"
                  className="lp-mega-trigger"
                  aria-haspopup="true"
                  aria-expanded="false"
                >
                  {menu.label}
                  <ChevronDown />
                </button>

                <MegaPanel menu={menu} />
              </li>
            ))}
          </ul>
        </div>

        <div className="lp-nav-right">
          <Link to="/login" className="lp-nav-link-text">
            Entrar
          </Link>
          <Link to="/register?plan=annual&from=topbar" className="cta-primary">
            Experimente grátis
          </Link>

          <button
            type="button"
            className="lp-hamburger"
            aria-label={drawerOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-controls="ecotopia-mobile-drawer"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen((v) => !v)}
          >
            <span className={`lp-hamburger-bars ${drawerOpen ? 'is-open' : ''}`} aria-hidden>
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>
      </nav>

      <MobileDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        expandedItem={expandedItem}
        onToggle={toggleAccordion}
      />
    </>
  );
}

function MegaPanel({ menu }: { menu: MenuConfig }) {
  return (
    <div className="lp-mega-panel" role="menu" aria-label={`${menu.label} menu`}>
      <div className="lp-mega-grid">
        {menu.columns.map((col) => (
          <div key={col.heading} className="lp-mega-col">
            <h6 className="lp-mega-heading">{col.heading}</h6>
            <ul className="lp-mega-links">
              {col.links.map((link) => (
                <li key={link.label}>
                  <MegaLinkRender link={link} />
                </li>
              ))}
            </ul>
          </div>
        ))}

        {menu.cta && (
          menu.cta.image ? (
            <Link to={menu.cta.to} className="lp-mega-cta lp-mega-cta--image">
              <span
                className="lp-mega-cta-img"
                style={{ backgroundImage: `url("${menu.cta.image}")` }}
                aria-hidden
              />
              <span className="lp-mega-cta-bar">{menu.cta.ctaLabel}</span>
            </Link>
          ) : (
            <aside className="lp-mega-cta">
              <span className="lp-mega-cta-eyebrow">{menu.cta.eyebrow}</span>
              <p className="lp-mega-cta-title">{menu.cta.title}</p>
              <p className="lp-mega-cta-body">{menu.cta.body}</p>
              <Link to={menu.cta.to} className="lp-mega-cta-link">
                {menu.cta.ctaLabel}
              </Link>
            </aside>
          )
        )}
      </div>
    </div>
  );
}

function MegaLinkRender({ link }: { link: MegaLink }) {
  if (link.external) {
    return (
      <a href={link.to} className="lp-mega-link" target="_blank" rel="noreferrer">
        {link.label}
      </a>
    );
  }
  return (
    <Link to={link.to} className="lp-mega-link">
      {link.label}
    </Link>
  );
}

function MobileDrawer({
  open,
  onClose,
  expandedItem,
  onToggle,
}: {
  open: boolean;
  onClose: () => void;
  expandedItem: MenuKey | null;
  onToggle: (key: MenuKey) => void;
}) {
  const panelRefs = useRef<Record<string, HTMLDivElement | null>>({});

  return (
    <>
      <div
        className={`lp-drawer-backdrop ${open ? 'is-open' : ''}`}
        onClick={onClose}
        aria-hidden
      />

      <aside
        id="ecotopia-mobile-drawer"
        className={`lp-drawer ${open ? 'is-open' : ''}`}
        aria-hidden={!open}
        aria-label="Menu"
      >
        <div className="lp-drawer-head">
          <span className="lp-drawer-title">Menu</span>
          <button
            type="button"
            className="lp-drawer-close"
            aria-label="Fechar menu"
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </div>

        <nav className="lp-drawer-nav">
          {MENUS.map((menu) => {
            const isOpen = expandedItem === menu.key;
            const panel = panelRefs.current[menu.key];
            const maxHeight = isOpen && panel ? `${panel.scrollHeight}px` : '0px';

            return (
              <div key={menu.key} className={`lp-acc-item ${isOpen ? 'is-open' : ''}`}>
                <button
                  type="button"
                  className="lp-acc-trigger"
                  aria-expanded={isOpen}
                  aria-controls={`lp-acc-${menu.key}`}
                  onClick={() => onToggle(menu.key)}
                >
                  <span>{menu.label}</span>
                  <span className="lp-acc-chev" aria-hidden>
                    <ChevronDown />
                  </span>
                </button>

                <div
                  id={`lp-acc-${menu.key}`}
                  className="lp-acc-panel"
                  style={{ maxHeight }}
                  ref={(el) => {
                    panelRefs.current[menu.key] = el;
                  }}
                >
                  <div className="lp-acc-inner">
                    {menu.columns.map((col) => (
                      <div key={col.heading} className="lp-acc-group">
                        <h6 className="lp-acc-heading">{col.heading}</h6>
                        <ul>
                          {col.links.map((link) => (
                            <li key={link.label}>
                              <Link
                                to={link.to}
                                onClick={onClose}
                                className="lp-acc-link"
                              >
                                {link.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}

                    {menu.cta && (
                      <div className="lp-acc-cta">
                        <span className="lp-mega-cta-eyebrow">{menu.cta.eyebrow}</span>
                        <p className="lp-mega-cta-title">{menu.cta.title}</p>
                        <Link to={menu.cta.to} onClick={onClose} className="lp-mega-cta-link">
                          {menu.cta.ctaLabel}
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <Link to="/login" onClick={onClose} className="lp-acc-flat">
            Entrar
          </Link>
        </nav>

        <div className="lp-drawer-foot">
          <Link
            to="/register?plan=annual&from=mobile-drawer"
            onClick={onClose}
            className="cta-primary lp-drawer-cta"
          >
            Experimente grátis
          </Link>
        </div>
      </aside>
    </>
  );
}

function ChevronDown() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

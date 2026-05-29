import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

type MenuKey = 'para-voce' | 'planos' | 'recursos' | 'sobre';

type MegaLink = { label: string; to: string; external?: boolean };
type MegaColumn = { heading: string; links: MegaLink[] };
type MegaCta = { eyebrow: string; title: string; body: string; ctaLabel: string; to: string; image?: string };

type MenuConfig = {
  key: MenuKey;
  label: string;
  lead?: { label: string; to?: string };
  columns: MegaColumn[];
  cta?: MegaCta;
};

const MENUS: MenuConfig[] = [
  {
    key: 'para-voce',
    label: 'Para você',
    lead: { label: 'Aplicativo Ecotopia' },
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
      to: '/assinar?plan=monthly&from=mega-para-voce',
      image: '/images/mega-cta-eco.webp',
    },
  },
  {
    key: 'planos',
    label: 'Nossos planos',
    lead: { label: 'Ver todos os planos' },
    columns: [
      {
        heading: 'Assinaturas Ecotopia',
        links: [
          { label: 'Anual · economize 25%', to: '/precos' },
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
      image: '/images/mega-cta-eco.webp',
    },
  },
  {
    key: 'recursos',
    label: 'Recursos',
    lead: { label: 'Ver todos os recursos' },
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
      image: '/images/mega-cta-eco.webp',
    },
  },
  {
    key: 'sobre',
    label: 'Sobre',
    lead: { label: 'Sobre nós' },
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

// Reúne todos os candidatos a container de scroll: ancestrais da logo +
// elementos globais (o scroll pode estar em #root/body por overflow-y:auto).
function collectScrollCandidates(fromEl: HTMLElement | null): HTMLElement[] {
  const list: HTMLElement[] = [];
  let node: HTMLElement | null = fromEl;
  while (node) {
    list.push(node);
    node = node.parentElement;
  }
  [
    document.getElementById('root'),
    document.scrollingElement as HTMLElement | null,
    document.documentElement,
    document.body,
  ].forEach((el) => {
    if (el && !list.includes(el)) list.push(el);
  });
  return list;
}

// Scroll suave até o topo, animado por JS (duração/easing controlados).
// Anima TODOS os elementos atualmente rolados — assim acerta o container real.
function animateScrollToTop(fromEl: HTMLElement | null, duration = 1400) {
  const scrolled = collectScrollCandidates(fromEl).filter((el) => el.scrollTop > 0);

  if (scrolled.length === 0) {
    console.warn('[logo-scroll] nenhum container com scrollTop>0 encontrado');
    return;
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    scrolled.forEach((el) => (el.scrollTop = 0));
    return;
  }

  const starts = scrolled.map((el) => el.scrollTop);
  const startTime = performance.now();
  const easeInOutCubic = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const step = (now: number) => {
    const t = Math.min((now - startTime) / duration, 1);
    const factor = 1 - easeInOutCubic(t);
    scrolled.forEach((el, i) => {
      el.scrollTop = starts[i] * factor;
    });
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export default function EcotopiaTopbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === '/';

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
  }, []);

  return (
    <>
      <div className="top-banner">
        <Link to="/precos">7 dias grátis · Autoconhecimento prático</Link>
      </div>

      <nav className={`lp-nav ${isScrolled ? 'is-scrolled' : ''}`} aria-label="Navegação principal">
        <div className="lp-nav-left">
          <Link
            to="/"
            aria-label={isHome ? 'Ecotopia — voltar ao topo' : 'Ecotopia — página inicial'}
            className="lp-nav-brand"
            onClick={(e) => {
              // Na home: sobe suavemente até o topo (hero).
              // Em outras páginas: deixa o Link navegar para a página inicial.
              if (isHome) {
                e.preventDefault();
                animateScrollToTop(e.currentTarget as HTMLElement);
              }
            }}
          >
            <img
              src="/images/ecotopia-logo-horizontal.webp"
              alt="Ecotopia"
              width={180}
              height={44}
              className="lp-nav-brand-img lp-nav-brand-img--full"
            />
            <img
              src="/images/ecotopia-logo-mark.webp"
              alt="Ecotopia"
              width={44}
              height={44}
              className="lp-nav-brand-img lp-nav-brand-img--mark"
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
          <Link to="/assinar?plan=monthly&from=topbar" className="cta-primary">
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

      <MobileDrawer open={drawerOpen} onClose={closeDrawer} />
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

function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [drill, setDrill] = useState<MenuKey | null>(null);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Reseta a navegação interna após o drawer fechar (espera o slide-out)
  useEffect(() => {
    if (open) return;
    const t = window.setTimeout(() => {
      setDrill(null);
      setOpenSection(null);
    }, 1150);
    return () => window.clearTimeout(t);
  }, [open]);

  const activeMenu = MENUS.find((m) => m.key === drill) ?? null;

  const goBack = () => {
    setDrill(null);
    setOpenSection(null);
  };

  const footCtaPrimary = (
    <div className="lp-drawer-foot">
      <Link
        to="/assinar?plan=monthly&from=mobile-drawer"
        onClick={onClose}
        className="cta-primary lp-drawer-cta"
      >
        Começar agora
      </Link>
    </div>
  );

  const footCtaBlue = (
    <div className="lp-drawer-foot">
      <Link
        to="/assinar?plan=monthly&from=mobile-drawer-sub"
        onClick={onClose}
        className="cta-primary lp-drawer-cta lp-drawer-cta--blue"
      >
        Experimente grátis
      </Link>
    </div>
  );

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
        {/* ── Nível 1 — categorias ── */}
        <div className={`lp-drawer-view ${drill ? 'is-pushed' : ''}`}>
          <div className="lp-drawer-head">
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
            {MENUS.map((menu) => (
              <button
                key={menu.key}
                type="button"
                className="lp-drawer-row"
                onClick={() => {
                  setDrill(menu.key);
                  setOpenSection(null);
                }}
              >
                <span>{menu.label}</span>
                <span className="lp-drawer-row-chev" aria-hidden>
                  <ChevronRight />
                </span>
              </button>
            ))}

            <div className="lp-drawer-sep" />

            <Link to="/login" onClick={onClose} className="lp-drawer-row lp-drawer-row--icon">
              <UserIcon />
              <span>Entrar</span>
            </Link>
            <Link to="/#faq" onClick={onClose} className="lp-drawer-row lp-drawer-row--icon">
              <HelpIcon />
              <span>Ajuda</span>
            </Link>
          </nav>

          {footCtaPrimary}
        </div>

        {/* ── Nível 2 — subpágina da categoria ── */}
        <div
          className={`lp-drawer-view lp-drawer-view--sub ${drill ? 'is-active' : ''}`}
          aria-hidden={!drill}
        >
          <div className="lp-drawer-head lp-drawer-head--sub">
            <button
              type="button"
              className="lp-drawer-close"
              aria-label="Voltar"
              onClick={goBack}
            >
              <ChevronLeft />
            </button>
            <span className="lp-drawer-subtitle">{activeMenu?.label}</span>
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
            {activeMenu?.lead &&
              (activeMenu.lead.to ? (
                <Link
                  to={activeMenu.lead.to}
                  onClick={onClose}
                  className="lp-drawer-lead"
                >
                  {activeMenu.lead.label}
                </Link>
              ) : (
                <span className="lp-drawer-lead lp-drawer-lead--static">
                  {activeMenu.lead.label}
                </span>
              ))}

            {activeMenu?.columns.map((col) => {
              const isOpen = openSection === col.heading;
              const panel = sectionRefs.current[col.heading];
              const maxHeight = isOpen && panel ? `${panel.scrollHeight}px` : '0px';

              return (
                <div key={col.heading} className={`lp-acc-item ${isOpen ? 'is-open' : ''}`}>
                  <button
                    type="button"
                    className="lp-acc-trigger"
                    aria-expanded={isOpen}
                    onClick={() =>
                      setOpenSection((p) => (p === col.heading ? null : col.heading))
                    }
                  >
                    <span>{col.heading}</span>
                    <span className="lp-acc-chev" aria-hidden>
                      <ChevronDown />
                    </span>
                  </button>

                  <div
                    className="lp-acc-panel"
                    style={{ maxHeight }}
                    ref={(el) => {
                      sectionRefs.current[col.heading] = el;
                    }}
                  >
                    <div className="lp-acc-inner">
                      <ul>
                        {col.links.map((link) => (
                          <li key={link.label}>
                            <Link to={link.to} onClick={onClose} className="lp-acc-link">
                              {link.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </nav>

          {footCtaBlue}
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

function ChevronRight() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
}

function ChevronLeft() {
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
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M9.2 9a2.8 2.8 0 0 1 5.4 1c0 1.8-2.6 2.2-2.6 4" />
      <line x1="12" y1="17" x2="12" y2="17" />
    </svg>
  );
}

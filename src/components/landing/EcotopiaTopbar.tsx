import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function EcotopiaTopbar() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <div className="top-banner">
        <Link to="/precos">
          7 dias grátis · Autoconhecimento prático
        </Link>
      </div>

      <nav className={`lp-nav ${isScrolled ? 'is-scrolled' : ''}`}>
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

          <div className="lp-nav-links">
            <a href="#categorias">Para você</a>
            <a href="#biblioteca">Biblioteca</a>
            <Link to="/precos">Planos</Link>
            <a href="#faq">Recursos</a>
          </div>
        </div>

        <div className="lp-nav-right">
          <Link to="/login" className="lp-nav-link-text">
            Entrar
          </Link>
          <Link to="/register?plan=annual&from=topbar" className="cta-primary">
            Experimente grátis
          </Link>
        </div>
      </nav>
    </>
  );
}

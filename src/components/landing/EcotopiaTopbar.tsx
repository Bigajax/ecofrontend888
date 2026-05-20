import { Link } from 'react-router-dom';

export default function EcotopiaTopbar() {
  return (
    <>
      <div className="top-banner">
        <Link to="/precos">
          7 dias gratuitos · autoconhecimento prático em português
        </Link>
      </div>

      <nav className="lp-nav">
        <div className="lp-nav-left">
          <Link
            to="/"
            aria-label="Ecotopia"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              textDecoration: 'none',
            }}
          >
            <img
              src="/images/ECOTOPIA.webp"
              alt=""
              width={44}
              height={44}
              style={{
                width: '44px',
                height: '44px',
                objectFit: 'contain',
                display: 'block',
              }}
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

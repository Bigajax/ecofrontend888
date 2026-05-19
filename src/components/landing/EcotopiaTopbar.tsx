import { Link } from 'react-router-dom';

export default function EcotopiaTopbar() {
  return (
    <>
      {/* Banner amarelo no topo */}
      <div className="top-banner">
        <Link to="/precos">
          7 dias gratuitos no Ecotopia — autoconhecimento prático em português
        </Link>
      </div>

      {/* Nav branca sticky */}
      <nav className="lp-nav">
        <div className="lp-nav-left">
          <Link to="/" aria-label="Ecotopia">
            <img
              src="/images/ECOTOPIA.webp"
              alt="Ecotopia"
              width={64}
              height={64}
              style={{
                width: '64px',
                height: '64px',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </Link>
          <div className="lp-nav-links" style={{ display: 'flex', gap: '24px' }}>
            <a href="#categorias">Para Você</a>
            <a href="#biblioteca" className="is-active">A Biblioteca</a>
            <Link to="/precos">Nossos Planos</Link>
            <a href="#faq">Recursos</a>
          </div>
        </div>
        <div className="lp-nav-right">
          <Link
            to="/login"
            style={{
              display: 'none',
            }}
            className="lp-nav-links"
          >
            Entrar
          </Link>
          <Link to="/register?plan=annual&from=topbar" className="cta-primary">
            Teste grátis
          </Link>
        </div>
      </nav>
    </>
  );
}

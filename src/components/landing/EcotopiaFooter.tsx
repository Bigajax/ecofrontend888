import { Link } from 'react-router-dom';

export default function EcotopiaFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="lp-footer">
      <h2 className="lp-footer-title">
        Encontre seu silêncio
      </h2>

      <div className="lp-footer-top">
        <div className="lp-footer-newsletter">
          <h4>Fique por dentro</h4>
          <p>
            Seja o primeiro a saber sobre novos conteúdos, práticas e atualizações do método.
          </p>
          <input type="email" placeholder="Seu e-mail" />
          <button className="cta-primary" type="button" style={{ width: '100%' }}>
            Inscrever-se
          </button>
          <p
            style={{
              fontSize: '12px',
              opacity: 0.55,
              marginTop: '10px',
              lineHeight: 1.6,
            }}
          >
            Ao se inscrever, você concorda em receber e-mails do Ecotopia. Cancele a qualquer
            momento.
          </p>
        </div>

        <div>
          <h4>Minha Conta</h4>
          <ul>
            <li><Link to="/login">Entrar</Link></li>
            <li><Link to="/register">Criar conta</Link></li>
            <li><Link to="/precos">Planos</Link></li>
          </ul>
        </div>

        <div>
          <h4>Biblioteca</h4>
          <ul>
            <li><a href="#biblioteca">Eco AI</a></li>
            <li><a href="#biblioteca">Diário Estoico</a></li>
            <li><a href="#biblioteca">Protocolo do Sono</a></li>
            <li><a href="#biblioteca">Cinco Anéis</a></li>
            <li><a href="#biblioteca">Jornadas Dispenza</a></li>
          </ul>
        </div>

        <div>
          <h4>Sobre</h4>
          <ul>
            <li><a href="#categorias">O método</a></li>
            <li><a href="#faq">Perguntas frequentes</a></li>
            <li><Link to="/precos">Preços</Link></li>
          </ul>
        </div>

        <div>
          <h4>Em caso de crise</h4>
          <ul>
            <li>
              <strong style={{ color: 'var(--lp-accent-strong)' }}>CVV 188</strong>
            </li>
            <li style={{ opacity: 0.72 }}>24h, gratuito</li>
            <li style={{ opacity: 0.72 }}>Não substitui acompanhamento clínico</li>
          </ul>
        </div>
      </div>

      <div className="lp-footer-bottom">
        <span>© {year} Ecotopia · Todos os direitos reservados</span>
        <span>Termos · Privacidade · Cookies</span>
        <span>Português · Brasil</span>
      </div>
    </footer>
  );
}

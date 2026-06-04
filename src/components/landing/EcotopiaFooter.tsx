import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Minus, Globe, ChevronDown, Instagram } from 'lucide-react';
import { subscribeNewsletter } from '@/api/newsletterApi';

type FooterLink = { label: string; to?: string; href?: string; strong?: boolean; muted?: boolean };
type FooterGroup = { id: string; title: string; items: FooterLink[] };

const GROUPS: FooterGroup[] = [
  {
    id: 'conta',
    title: 'Conta',
    items: [
      { label: 'Criar conta', to: '/assinar?step=plan&from=footer_criar_conta' },
      { label: 'Planos', to: '/assinar?step=plan&from=footer_planos' },
    ],
  },
  {
    id: 'biblioteca',
    title: 'Biblioteca',
    items: [
      { label: 'Eco AI', to: '/eco-ia' },
      { label: 'Diário Estoico', to: '/estoicismo' },
      { label: 'Protocolo do Sono', to: '/sono' },
      { label: 'Cinco Anéis', to: '/disciplina' },
      { label: 'Jornadas Dispenza', to: '/dr-joe-dispenza' },
    ],
  },
  {
    id: 'sobre',
    title: 'Sobre',
    items: [
      { label: 'O método' },
      { label: 'Perguntas frequentes', to: '/cancelar-assinatura' },
      { label: 'Preços', to: '/assinar?step=plan&from=footer_precos' },
    ],
  },
  {
    id: 'crise',
    title: 'Em caso de crise',
    items: [
      { label: 'CVV 188', href: 'tel:188', strong: true },
      { label: '24h, gratuito', muted: true },
      { label: 'Não substitui acompanhamento clínico', muted: true },
    ],
  },
];

function FooterGroupItem({ group }: { group: FooterGroup }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`lp-footer-acc ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        className="lp-footer-acc-head"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{group.title}</span>
        <span className="lp-footer-acc-icon" aria-hidden="true">
          {open ? <Minus size={18} /> : <Plus size={18} />}
        </span>
      </button>

      <ul className="lp-footer-acc-body">
        {group.items.map((item) => (
          <li
            key={item.label}
            className={`${item.strong ? 'is-strong' : ''} ${item.muted ? 'is-muted' : ''}`}
          >
            {item.to ? (
              <Link to={item.to}>{item.label}</Link>
            ) : item.href ? (
              <a href={item.href}>{item.label}</a>
            ) : (
              <span>{item.label}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

type NewsletterStatus = 'idle' | 'loading' | 'success' | 'error';

export default function EcotopiaFooter() {
  const year = new Date().getFullYear();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<NewsletterStatus>('idle');
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubscribe = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === 'loading') return;

    const trimmed = email.trim();
    if (!trimmed) {
      setStatus('error');
      setFeedback('Digite seu e-mail para se inscrever.');
      return;
    }

    setStatus('loading');
    setFeedback(null);

    const result = await subscribeNewsletter({ email: trimmed });

    if (result.ok) {
      setStatus('success');
      setFeedback(
        result.already
          ? 'Você já está inscrito. Fique de olho na caixa de entrada!'
          : 'Inscrição confirmada. Em breve novidades chegam ao seu e-mail.',
      );
      setEmail('');
    } else {
      setStatus('error');
      setFeedback(result.message);
    }
  };

  return (
    <footer className="lp-footer">
      <div className="lp-footer-inner">
        {/* ── Newsletter ── */}
        <section className="lp-footer-news">
          <h2 className="lp-footer-news-title">Fique por dentro</h2>
          <p className="lp-footer-news-sub">
            Seja o primeiro a saber sobre novos conteúdos, práticas e
            atualizações do método.
          </p>
          <p className="lp-footer-news-fine">
            Ao se inscrever, você concorda em receber e-mails do Ecotopia. Cancele
            a qualquer momento. Veja nossa{' '}
            <Link to="/privacidade">Política de Privacidade</Link>.
          </p>

          <form className="lp-footer-form" onSubmit={handleSubscribe} noValidate>
            <input
              type="email"
              placeholder="Seu e-mail"
              aria-label="Seu e-mail"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status === 'error' || status === 'success') {
                  setStatus('idle');
                  setFeedback(null);
                }
              }}
              disabled={status === 'loading'}
              required
            />
            <button
              type="submit"
              className="lp-footer-subscribe"
              disabled={status === 'loading'}
            >
              {status === 'loading' ? 'Enviando…' : 'Inscrever-se'}
            </button>
          </form>

          {feedback && (
            <p
              className={`lp-footer-news-feedback is-${status}`}
              role={status === 'error' ? 'alert' : 'status'}
              aria-live="polite"
            >
              {feedback}
            </p>
          )}
        </section>

        <hr className="lp-footer-divider" />

        {/* ── Minha Ecotopia ── */}
        <section className="lp-footer-account">
          <h3 className="lp-footer-account-title">Minha Ecotopia</h3>
          <Link to="/login" className="lp-footer-login">
            Entrar
          </Link>
        </section>

        {/* ── Link groups (accordion no mobile, colunas no desktop) ── */}
        <nav className="lp-footer-links" aria-label="Links do rodapé">
          {GROUPS.map((group) => (
            <FooterGroupItem key={group.id} group={group} />
          ))}
        </nav>

        {/* ── Seletor de idioma ── */}
        <div className="lp-footer-lang">
          <button type="button" className="lp-footer-lang-pill">
            <Globe size={17} strokeWidth={2} />
            <span>Português</span>
            <ChevronDown size={16} strokeWidth={2.4} />
          </button>
        </div>
      </div>

      {/* ── Barra escura final ── */}
      <div className="lp-footer-dark">
        <div className="lp-footer-dark-inner">
          <div className="lp-footer-social">
            <a
              href="https://www.instagram.com/ecotopia"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram do Ecotopia"
            >
              <Instagram size={18} strokeWidth={2} />
            </a>
          </div>
          <p className="lp-footer-copy">
            © {year} Ecotopia · Todos os direitos reservados
          </p>
          <p className="lp-footer-legal">Termos · Privacidade · Cookies</p>
        </div>
      </div>
    </footer>
  );
}

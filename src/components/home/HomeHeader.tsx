import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import FeedbackModal from '@/components/FeedbackModal';
import { Astro } from '@/components/reino/ReinoScene';
import '@/components/reino/reino.css';

const NAV = [
  { label: 'Hoje', to: '/app', end: true },
  { label: 'Mapa', to: '/app/mapa', end: false },
];

export default function HomeHeader() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const inicial =
    user?.user_metadata?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '·';

  return (
    <>
      <header className="reino-corpo reino-cabecalho">
        <div className="reino-cabecalho__linha">
          <button type="button" className="reino-cabecalho__marca" onClick={() => navigate('/app')}>
            <Astro className="reino-cabecalho__astro" />
            Ecotopia
          </button>

          <nav className="reino-cabecalho__nav" aria-label="Principal">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className="reino-cabecalho__link">
                {({ isActive }) => (
                  <>
                    <Astro className={`reino-cabecalho__marcador${isActive ? ' is-ativo' : ''}`} />
                    <span aria-current={isActive ? 'page' : undefined}>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="reino-cabecalho__direita">
            <button type="button" className="reino-cabecalho__feedback" onClick={() => setFeedbackOpen(true)}>
              Feedback
            </button>
            {user && (
              <button
                type="button"
                className="reino-cabecalho__avatar"
                onClick={() => navigate('/app/configuracoes')}
                aria-label="Perfil e configurações"
              >
                {user.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="" />
                ) : (
                  <span aria-hidden="true">{inicial}</span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      <FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  );
}

import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import FeedbackModal from '@/components/FeedbackModal';
import { Astro } from '@/components/reino/ReinoScene';
import { GlifoHoje, GlifoMapa } from '@/components/reino/ReinoGlifos';
import { formatHojeLabel, getReinoMood } from '@/components/reino/reinoMood';
import '@/components/reino/reino.css';

/**
 * Cabeçalho corrente, como em livro e atlas: diz em que lugar do reino você está.
 * A faixa tem a cor do céu da hora (creme de manhã, vinho à tarde, anil à noite).
 */
function lugarDaRota(pathname: string): { codigo?: string; nome: string } {
  const p = pathname.replace(/\/$/, '');
  if (p === '/app' || p === '/app/home') return { nome: formatHojeLabel() };
  if (p.startsWith('/app/mapa')) return { nome: '5 regiões · 1 caminho' };
  if (p.startsWith('/app/meditacoes-sono')) return { codigo: 'SOM.02', nome: 'Vale do Sono' };
  if (p.startsWith('/app/sons')) return { codigo: 'SOM.02', nome: 'Sons do vale' };
  if (p.startsWith('/app/diario-estoico')) return { codigo: 'STO.05', nome: 'O Pórtico' };
  if (p.startsWith('/app/dream')) return { codigo: 'DRM.03', nome: 'Lago dos Sonhos' };
  if (p.startsWith('/app/articles')) return { nome: 'Biblioteca' };
  if (p.startsWith('/app/meditation-player')) return { nome: 'Ouvindo agora' };
  if (p.startsWith('/app/configuracoes')) return { nome: 'Sua conta' };
  if (
    ['/app/programas', '/app/rings', '/app/riqueza-mental', '/app/dr-joe-dispenza', '/app/introducao-meditacao', '/app/codigo-da-abundancia'].some(
      (r) => p.startsWith(r),
    )
  )
    return { codigo: 'TRI.04', nome: 'As Trilhas' };
  return { nome: 'Ecotopia' };
}

const NAV = [
  { label: 'Hoje', to: '/app', end: true },
  { label: 'Mapa', to: '/app/mapa', end: false },
];

function Pena({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={className} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22.6 4.6c-6.8.6-12.2 5.4-13.7 12.4l-.8 3.8 3.7-1.1c6.6-2 10.6-7.8 10.8-15.1Z" />
      <path d="M8.1 20.8 5 24" />
      <path d="M11.4 16.6c2.6-2.4 5.6-5.4 8.1-8.9" opacity={0.6} />
    </svg>
  );
}

export default function HomeHeader() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const mood = getReinoMood();
  const lugar = lugarDaRota(pathname);

  const inicial =
    user?.user_metadata?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '·';

  return (
    <>
      <header className="reino-corpo reino-cabecalho" data-mood={mood}>
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
                    {item.to === '/app' ? (
                      <GlifoHoje ativo={isActive} mood={mood} className="reino-cabecalho__glifo" />
                    ) : (
                      <GlifoMapa ativo={isActive} className="reino-cabecalho__glifo" />
                    )}
                    <span aria-current={isActive ? 'page' : undefined}>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="reino-cabecalho__direita">
            <p className="reino-cabecalho__lugar">
              {lugar.codigo && <span className="reino-cabecalho__codigo">{lugar.codigo}</span>}
              {lugar.nome}
            </p>
            <button
              type="button"
              className="reino-cabecalho__feedback"
              onClick={() => setFeedbackOpen(true)}
              aria-label="Enviar feedback"
            >
              <Pena className="reino-cabecalho__pena" />
              <span className="reino-cabecalho__feedback-texto">Feedback</span>
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

        {/* horizonte desenhado à mão fechando a faixa */}
        <svg className="reino-cabecalho__horizonte" viewBox="0 0 1200 10" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 6.2C90 3.1 170 7.8 260 5.4s190-3.6 300 .4 210 2.6 320-.8 220-1.6 320 1.9" />
        </svg>
      </header>

      <FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  );
}

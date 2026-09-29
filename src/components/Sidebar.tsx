import { useState, type ComponentType } from 'react';
import FeedbackModal from '@/components/FeedbackModal';
import { useNavigate, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import {
  GlifoEco,
  GlifoMemorias,
  GlifoEspelho,
  GlifoRelatorio,
  GlifoPena,
  GlifoPorta,
} from '@/components/reino/ReinoGlifos';
import '@/components/reino/reino.css';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  variant?: 'desktop' | 'mobile' | 'bottom';
  onLogout?: () => void;
  isGuest?: boolean;
}

type Glifo = ComponentType<{ ativo: boolean; className?: string }>;

/**
 * Os cômodos da Casa da Eco: a conversa e o que a Eco guarda de você.
 * Glifos a pincel no lugar dos ícones de linha; a aba ativa acende em ocre.
 */
const navItems: { id: string; label: string; curto: string; glifo: Glifo; path: string }[] = [
  { id: 'chat', label: 'Conversa', curto: 'Conversa', glifo: GlifoEco, path: '/app/chat' },
  { id: 'memories', label: 'Memórias', curto: 'Memórias', glifo: GlifoMemorias, path: '/app/memory' },
  { id: 'profile', label: 'Perfil emocional', curto: 'Perfil', glifo: GlifoEspelho, path: '/app/memory/profile' },
  { id: 'reports', label: 'Relatórios', curto: 'Relatórios', glifo: GlifoRelatorio, path: '/app/memory/report' },
];


export default function Sidebar({ isOpen = false, onClose, variant = 'desktop', onLogout }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Só o item mais específico fica ativo (/app/memory/profile não acende também /app/memory).
  const activePath = navItems
    .map((item) => item.path)
    .filter((path) => location.pathname === path || location.pathname.startsWith(`${path}/`))
    .sort((a, b) => b.length - a.length)[0];

  const handleNavigate = (path: string) => {
    navigate(path);
    if (variant === 'mobile' && onClose) {
      onClose();
    }
  };

  const handleBackToHome = () => {
    if (onClose) onClose();
    if (onLogout) onLogout();
  };

  // O recado abre aqui mesmo, num modal do reino (antes abria outro site numa aba nova).
  const [feedbackAberto, setFeedbackAberto] = useState(false);
  const handleFeedback = () => setFeedbackAberto(true);
  const recado = <FeedbackModal isOpen={feedbackAberto} onClose={() => setFeedbackAberto(false)} />;

  if (variant === 'mobile') {
    return (
      <>
        {isOpen && <div className="fixed inset-0 z-40 bg-[#10153a]/40 lg:hidden" onClick={onClose} aria-hidden="true" />}

        <aside
          className={clsx(
            'reino-corpo reino-casa-lateral is-gaveta lg:hidden',
            isOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="reino-casa-lateral__topo">
            <span className="reino-rotulo">ECO.01 · Casa da Eco</span>
            <button type="button" onClick={onClose} className="reino-chegada__voltar" aria-label="Fechar menu">
              Fechar
            </button>
          </div>

          <nav className="reino-casa-lateral__nav" aria-label="Casa da Eco">
            {navItems.map((item) => {
              const Glifo = item.glifo;
              const ativo = item.path === activePath;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.path)}
                  aria-current={ativo ? 'page' : undefined}
                  className={clsx('reino-casa-lateral__item is-linha', ativo && 'is-ativo')}
                >
                  <Glifo ativo={ativo} className="reino-casa-lateral__glifo" />
                  <span className="reino-casa-lateral__rotulo">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="reino-casa-lateral__pe">
            <button type="button" onClick={handleFeedback} className="reino-casa-lateral__item is-linha">
              <GlifoPena ativo={false} className="reino-casa-lateral__glifo" />
              <span className="reino-casa-lateral__rotulo">Feedback</span>
            </button>
            <button type="button" onClick={handleBackToHome} className="reino-casa-lateral__item is-linha">
              <GlifoPorta ativo={false} className="reino-casa-lateral__glifo" />
              <span className="reino-casa-lateral__rotulo">Sair</span>
            </button>
          </div>
        </aside>
        {recado}
      </>
    );
  }

  // Barra de cima no celular
  if (variant === 'bottom') {
    return (
      <nav className="reino-corpo reino-casa-topo lg:hidden" aria-label="Casa da Eco">
        <div className="reino-casa-topo__lista pt-safe">
          {navItems.map((item) => {
            const Glifo = item.glifo;
            const ativo = item.path === activePath;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.path)}
                aria-current={ativo ? 'page' : undefined}
                className={clsx('reino-casa-lateral__item', ativo && 'is-ativo')}
              >
                <Glifo ativo={ativo} className="reino-casa-lateral__glifo" />
                <span className="reino-casa-lateral__rotulo">{item.curto}</span>
              </button>
            );
          })}
          <button type="button" onClick={() => onLogout?.()} className="reino-casa-lateral__item">
            <GlifoPorta ativo={false} className="reino-casa-lateral__glifo" />
            <span className="reino-casa-lateral__rotulo">Sair</span>
          </button>
        </div>
      </nav>
    );
  }

  // Lateral no desktop
  return (
    <>
    <aside className="reino-corpo reino-casa-lateral hidden lg:flex" aria-label="Casa da Eco">
      <p className="reino-casa-lateral__codigo">ECO.01</p>
      <nav className="reino-casa-lateral__nav">
        {navItems.map((item) => {
          const Glifo = item.glifo;
          const ativo = item.path === activePath;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavigate(item.path)}
              aria-current={ativo ? 'page' : undefined}
              className={clsx('reino-casa-lateral__item', ativo && 'is-ativo')}
              title={item.label}
            >
              <Glifo ativo={ativo} className="reino-casa-lateral__glifo" />
              <span className="reino-casa-lateral__rotulo">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="reino-casa-lateral__pe">
        <button type="button" onClick={handleFeedback} className="reino-casa-lateral__item" title="Feedback">
          <GlifoPena ativo={false} className="reino-casa-lateral__glifo" />
          <span className="reino-casa-lateral__rotulo">Feedback</span>
        </button>
        <button type="button" onClick={handleBackToHome} className="reino-casa-lateral__item" title="Sair">
          <GlifoPorta ativo={false} className="reino-casa-lateral__glifo" />
          <span className="reino-casa-lateral__rotulo">Sair</span>
        </button>
      </div>
    </aside>
    {recado}
    </>
  );
}

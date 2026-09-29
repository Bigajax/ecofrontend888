import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Astro } from './reino/ReinoScene';
import { getReinoMood } from './reino/reinoMood';
import './reino/reino.css';

interface MeditacaoExitModalProps {
  open: boolean;
  onClose: () => void;
  onSignup: () => void;
  onLeaveAnyway: () => void;
}

/**
 * Quando o visitante vai sair da trilha Primeiros passos (set/2026): a folha do
 * reino, com o que ele leva se criar a conta. Antes: card branco, "conta
 * gratuita", "100% gratuito" e "chat ilimitado", que não são verdade.
 */
const MeditacaoExitModal: React.FC<MeditacaoExitModalProps> = ({ open, onClose, onSignup, onLeaveAnyway }) => {
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="reino-gate"
      role="dialog"
      aria-modal="true"
      aria-labelledby="saida-titulo"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="reino-gate__folha reino-corpo">
        <Astro className="reino-gate__astro" mood={getReinoMood()} />
        <h2 id="saida-titulo" className="reino-gate__titulo">
          Guarde a sua travessia.
        </h2>
        <p className="reino-gate__texto">
          Com a conta, a trilha lembra de onde você parou e as cinco pedras ficam abertas. Junto vem o reino inteiro:
          a Eco, o Protocolo do Sono, o Diário e os Cinco Anéis.
        </p>
        <p className="reino-gate__nota">Sete dias com tudo aberto. Nada é cobrado hoje.</p>
        <div className="reino-gate__acoes">
          <button type="button" className="reino-placa" onClick={onSignup}>
            Criar conta e seguir <span aria-hidden="true">→</span>
          </button>
          <button type="button" className="reino-gate__depois" onClick={onClose}>
            Continuar meditando
          </button>
        </div>
        <button type="button" className="reino-gate__depois reino-saida__sair" onClick={onLeaveAnyway}>
          Sair mesmo assim
        </button>
      </div>
    </div>,
    document.body
  );
};

export default MeditacaoExitModal;

import React from 'react';
import { createPortal } from 'react-dom';
import { type ConversionContext, getConversionCopy } from '../constants/conversionCopy';
import { Astro } from './reino/ReinoScene';
import { getReinoMood } from './reino/reinoMood';
import './reino/reino.css';

interface LoginGateModalProps {
  open: boolean;
  onClose: () => void;
  /** O que acontece no "criar conta": quem abre o modal decide o destino. */
  onSignup: () => void;
  count: number;
  limit: number;
  context?: ConversionContext;
  isSoftPrompt?: boolean;
}

/**
 * O convite para criar a conta, no reino (set/2026): uma folha de papel com o
 * astro da hora. Antes o botão chamava onSignup E navegava para /register ao
 * mesmo tempo; o onSignup do chat fazia window.location para a landing e
 * ganhava, então quem aceitava o convite caía de volta na landing. Agora o
 * botão faz uma coisa só: onSignup.
 */
const LoginGateModal: React.FC<LoginGateModalProps> = ({
  open,
  onClose,
  onSignup,
  count,
  limit,
  context = 'generic',
  isSoftPrompt = false,
}) => {
  if (!open || typeof document === 'undefined') return null;

  const copy = getConversionCopy(context);
  const restantes = Math.max(0, limit - count);

  return createPortal(
    <div
      className="reino-gate"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gate-title"
      onClick={(e) => {
        if (isSoftPrompt && e.target === e.currentTarget) onClose();
      }}
    >
      <div className="reino-gate__folha reino-corpo">
        <Astro className="reino-gate__astro" mood={getReinoMood()} />
        <h2 id="gate-title" className="reino-gate__titulo">
          {copy.title}
        </h2>
        <p className="reino-gate__texto">{copy.message}</p>
        {copy.subtitle && <p className="reino-gate__nota">{copy.subtitle}</p>}

        <div className="reino-gate__acoes">
          <button type="button" className="reino-placa" onClick={onSignup}>
            {copy.primaryCta} <span aria-hidden="true">→</span>
          </button>
          {isSoftPrompt && (
            <button type="button" className="reino-gate__depois" onClick={onClose}>
              {copy.secondaryCta || 'Agora não'}
            </button>
          )}
        </div>

        {context.startsWith('chat_') && isSoftPrompt && restantes > 0 && (
          <p className="reino-gate__miudo">
            {restantes === 1 ? 'Resta 1 mensagem sem conta.' : `Restam ${restantes} mensagens sem conta.`}
          </p>
        )}
        {copy.legalText && <p className="reino-gate__miudo">{copy.legalText}</p>}
      </div>
    </div>,
    document.body
  );
};

export default LoginGateModal;

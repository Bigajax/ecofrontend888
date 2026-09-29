/**
 * FeedbackModal: uma folha de papel no reino (set/2026). Abre no lugar, sem
 * levar a pessoa para outra página, tanto pelo "Feedback" do topo quanto pelo
 * da lateral da Casa da Eco. Envio pelo mesmo /api/user-feedback de antes.
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { submitUserFeedback } from '@/api/userFeedback';
import type { FeedbackFormData } from '@/types/feedback';
import { GlifoPena } from '@/components/reino/ReinoGlifos';
import { Astro } from '@/components/reino/ReinoScene';
import { getReinoMood } from '@/components/reino/reinoMood';
import '@/components/reino/reino.css';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Tipos em linguagem de gente (os valores são os mesmos que o backend espera).
const TIPOS: { value: FeedbackFormData['category']; label: string }[] = [
  { value: 'bug', label: 'Algo quebrou' },
  { value: 'feature', label: 'Tive uma ideia' },
  { value: 'improvement', label: 'Pode melhorar' },
  { value: 'other', label: 'Outra coisa' },
];

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<FeedbackFormData['category']>('other');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fechar = () => {
    if (isSubmitting) return;
    setMessage('');
    setCategory('other');
    setError(null);
    setEnviado(false);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fechar();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isSubmitting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Escreva algumas palavras antes de enviar.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await submitUserFeedback({ message: message.trim(), category, page: window.location.pathname });
      setEnviado(true);
      setMessage('');
    } catch {
      setError('Não deu para enviar agora. Tente de novo em instantes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="reino-gate reino-feedback"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-titulo"
      onClick={(e) => {
        if (e.target === e.currentTarget) fechar();
      }}
    >
      <div className="reino-gate__folha reino-corpo reino-feedback__folha">
        <button type="button" className="reino-feedback__fechar" onClick={fechar} disabled={isSubmitting}>
          Fechar
        </button>

        {enviado ? (
          <>
            <Astro className="reino-gate__astro" mood={getReinoMood()} />
            <h2 id="feedback-titulo" className="reino-gate__titulo">
              Recebido. Obrigado.
            </h2>
            <p className="reino-gate__texto">
              Cada recado lido ajuda a decidir o que muda no Ecotopia.
            </p>
            <div className="reino-gate__acoes">
              <button type="button" className="reino-placa" onClick={fechar}>
                Voltar <span aria-hidden="true">→</span>
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <GlifoPena ativo className="reino-feedback__pena" />
            <h2 id="feedback-titulo" className="reino-gate__titulo">
              Deixe um recado
            </h2>
            <p className="reino-gate__texto">O que você viu, o que faltou, o que gostaria que existisse.</p>

            <div className="reino-feedback__tipos" role="radiogroup" aria-label="Sobre o quê">
              {TIPOS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={category === t.value}
                  className={`reino-feedback__tipo${category === t.value ? ' is-ativo' : ''}`}
                  onClick={() => setCategory(t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <label className="reino-feedback__campo">
              <span className="reino-entrada__rotulo">Seu recado</span>
              <textarea
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setError(null);
                }}
                disabled={isSubmitting}
                placeholder="Escreva do seu jeito."
                rows={5}
              />
            </label>

            {error && (
              <p role="alert" className="reino-feedback__erro">
                {error}
              </p>
            )}

            <div className="reino-gate__acoes">
              <button type="submit" className="reino-placa" disabled={isSubmitting || !message.trim()}>
                {isSubmitting ? 'Enviando…' : 'Enviar recado'} <span aria-hidden="true">→</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
};

export default FeedbackModal;

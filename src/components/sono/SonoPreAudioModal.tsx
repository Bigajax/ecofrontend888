import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Play, X } from 'lucide-react';
import { trackSonoGuestPreAudioView } from '@/lib/mixpanelSonoGuestEvents';

/**
 * Modal de contexto que aparece ao clicar "Ouvir a Noite 1", ANTES do áudio.
 * Planta a noção de que a Noite 1 faz parte de um protocolo de 7 noites (as
 * próximas pagas) — assim a oferta no fim deixa de ser surpresa. Confirmar
 * inicia o áudio; fechar mantém o hero. Tema escuro/lilás do funil, reusa o
 * padrão framer-motion (AnimatePresence + motion.div) das outras telas.
 */
interface SonoPreAudioModalProps {
  open: boolean;
  /** Mesmo guest_id do funil — para o evento de analytics. */
  guestId: string;
  source?: string;
  /** Confirma e inicia o áudio da Noite 1. */
  onConfirm: () => void;
  /** Fecha o modal e mantém a tela do hero ("agora não" / X). */
  onClose: () => void;
}

export function SonoPreAudioModal({ open, guestId, source, onConfirm, onClose }: SonoPreAudioModalProps) {
  // Dispara "Contexto pré-áudio visto" 1× por abertura (ref-guard contra o
  // double-invoke do StrictMode e re-renders enquanto aberto).
  const trackedRef = useRef(false);
  useEffect(() => {
    if (!open) {
      trackedRef.current = false;
      return;
    }
    if (trackedRef.current) return;
    trackedRef.current = true;
    trackSonoGuestPreAudioView({ guestId, source });
  }, [open, guestId, source]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="sono-pre-audio"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9997] flex items-center justify-center px-6"
          style={{
            background: 'rgba(6,5,18,0.74)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Esta é a Noite 1 de 7"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            className="relative w-full max-w-[340px] rounded-3xl p-6 text-center"
            style={{
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              border: '1px solid rgba(196,181,253,0.28)',
              boxShadow: '0 22px 70px rgba(8,5,24,0.6), inset 0 1px 0 rgba(255,255,255,0.12)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fechar discreto */}
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full transition-colors"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}
            >
              <X className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.45)' }} />
            </button>

            {/* Eyebrow — Noite 1 de 7 */}
            <div
              className="mx-auto inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em]"
              style={{
                background: 'rgba(199,184,240,0.10)',
                border: '1px solid rgba(199,184,240,0.24)',
                color: '#C7B8F0',
              }}
            >
              <Moon className="h-3 w-3" style={{ color: '#F0C4E8' }} fill="currentColor" />
              Ritual Boa Noite · Noite 1 de 7
            </div>

            {/* Título = primeira linha do contexto */}
            <h2
              className="mt-4 font-display text-[23px] font-bold leading-snug text-white"
              style={{ textShadow: '0 2px 18px rgba(0,0,0,0.55)' }}
            >
              Esta é a <span style={{ color: '#C7B8F0' }}>Noite 1 de 7.</span>
            </h2>

            {/* Corpo — contexto do protocolo */}
            <p className="mt-3 text-[14.5px] leading-relaxed" style={{ color: 'rgba(214,203,250,0.78)' }}>
              Hoje você começa desligando o estado de alerta. As próximas noites continuam
              esse processo, uma por noite.
            </p>

            {/* CTA — inicia o áudio */}
            <button
              onClick={onConfirm}
              className="mt-7 flex w-full items-center justify-center gap-2.5 rounded-full py-4 text-[15px] font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.97]"
              style={{
                background: 'linear-gradient(135deg, #A78BFA 0%, #5A3DB0 100%)',
                boxShadow: '0 10px 36px rgba(124,58,237,0.5), inset 0 1px 0 rgba(255,255,255,0.22)',
              }}
            >
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full"
                style={{ background: 'rgba(255,255,255,0.22)', border: '1px solid rgba(255,255,255,0.3)' }}
              >
                <Play className="h-3.5 w-3.5 translate-x-px" fill="currentColor" />
              </span>
              Ouvir Noite 1 grátis
            </button>

            {/* Saída suave */}
            <button
              onClick={onClose}
              className="mx-auto mt-3 text-[12.5px] transition-colors hover:text-white/70"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              Agora não
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

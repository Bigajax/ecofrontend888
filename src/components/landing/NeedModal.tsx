import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import type { NeedModalData } from './needsModalData';

interface NeedModalProps {
  open: boolean;
  data: NeedModalData | null;
  onClose: () => void;
  /** TODO: ligar navegação do CTA depois (cadastro vs deep-link). */
  onCta?: (data: NeedModalData) => void;
}

// Fundo cósmico compartilhado por todos os modais.
const ORBS_BG = '/images/modal-orbs-bg.png';

// #RRGGBB → rgba(r,g,b,a)
function hexToRgba(hex: string, a: number) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// Paleta derivada do tom de texto sobre a cor do modal.
function tokensFor(tone: 'light' | 'dark') {
  if (tone === 'dark') {
    // Fundo claro → texto escuro.
    return {
      title: '#1E2A44',
      subtitle: 'rgba(30,42,68,0.72)',
      benefitTitle: '#1E2A44',
      benefitDesc: 'rgba(30,42,68,0.66)',
      chipBg: 'rgba(255,255,255,0.6)',
      chipIcon: '#1E2A44',
      closeBg: 'rgba(30,42,68,0.12)',
      closeIcon: '#1E2A44',
      ctaBg: '#1E2A44',
      ctaText: '#FFFFFF',
    };
  }
  // Fundo escuro → texto claro.
  return {
    title: '#FFFFFF',
    subtitle: 'rgba(255,255,255,0.82)',
    benefitTitle: '#FFFFFF',
    benefitDesc: 'rgba(255,255,255,0.78)',
    chipBg: 'rgba(255,255,255,0.15)',
    chipIcon: '#FFFFFF',
    closeBg: 'rgba(255,255,255,0.18)',
    closeIcon: '#FFFFFF',
    ctaBg: '#FFFFFF',
    ctaText: '#1E2A44',
  };
}

export default function NeedModal({ open, data, onClose, onCta }: NeedModalProps) {
  const reduceMotion = useReducedMotion();
  const [imgError, setImgError] = useState(false);

  // Reseta o estado da imagem ao trocar de modal.
  useEffect(() => {
    setImgError(false);
  }, [data?.key]);

  // ESC fecha.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Scroll lock no body enquanto aberto.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!data) return null;

  const t = tokensFor(data.textTone);
  const titleId = `need-modal-title-${data.key}`;
  const descId = `need-modal-desc-${data.key}`;

  // Fundo: imagem própria do modal (sem tint) OU o cósmico compartilhado + tint da cor.
  const bgStyle: React.CSSProperties = data.background
    ? {
        backgroundColor: data.color,
        backgroundImage: `url('${data.background}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    : {
        backgroundColor: data.color,
        // Empilhado (topo→base): glow branco · tint da cor (contraste) · fundo cósmico.
        backgroundImage: [
          'radial-gradient(120% 80% at 50% -10%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 55%)',
          data.textTone === 'dark'
            ? `linear-gradient(180deg, ${hexToRgba(data.color, 0.28)} 0%, ${hexToRgba(data.color, 0.42)} 48%, ${hexToRgba(data.color, 0.66)} 100%)`
            : `linear-gradient(180deg, ${hexToRgba(data.color, 0.12)} 0%, ${hexToRgba(data.color, 0.28)} 48%, ${hexToRgba(data.color, 0.6)} 100%)`,
          `url('${ORBS_BG}')`,
        ].join(', '),
        backgroundSize: 'auto, auto, cover',
        backgroundPosition: 'center top, center, center',
        backgroundRepeat: 'no-repeat',
      };

  const contentAnim = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { scale: 0.95, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        exit: { scale: 0.95, opacity: 0 },
      };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="need-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm md:p-6"
          onClick={onClose}
        >
          <motion.div
            key="need-modal-card"
            {...contentAnim}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            className="relative flex w-full max-w-[920px] flex-col items-center overflow-y-auto px-7 pb-10 pt-24 text-center md:px-14 md:pb-14 md:pt-28"
            style={{
              maxHeight: '92dvh',
              borderRadius: 32,
              boxShadow: '0 24px 70px rgba(0,0,0,0.28)',
              ...bgStyle,
            }}
          >
            {/* Botão fechar */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full transition-opacity hover:opacity-80 md:right-6 md:top-6"
              style={{ backgroundColor: t.closeBg, color: t.closeIcon }}
            >
              <X size={20} strokeWidth={2.25} />
            </button>

            {/* Ilustração — sobreposta à borda superior */}
            <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
              <div
                className="relative flex h-[140px] w-[140px] items-center justify-center rounded-full"
                style={{
                  background:
                    'radial-gradient(circle at 50% 42%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.16) 55%, rgba(255,255,255,0) 72%)',
                }}
              >
                {!imgError && (
                  <img
                    src={data.illustration}
                    alt=""
                    aria-hidden="true"
                    onError={() => setImgError(true)}
                    className="h-[136px] w-[136px] object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.18)]"
                  />
                )}
              </div>
            </div>

            {/* Título + subtítulo */}
            <h2
              id={titleId}
              className="font-sans text-[26px] font-bold leading-tight md:text-[30px]"
              style={{ color: t.title, letterSpacing: '-0.01em' }}
            >
              {data.title}
            </h2>
            <p
              id={descId}
              className="mx-auto mt-3 max-w-[440px] font-display text-[15px] leading-relaxed md:text-base"
              style={{ color: t.subtitle }}
            >
              {data.subtitle}
            </p>

            {/* Benefícios 2x2 */}
            <ul className="mx-auto mt-10 grid w-full max-w-[780px] grid-cols-1 gap-x-12 gap-y-7 text-left md:mt-12 md:grid-cols-2">
              {data.benefits.map(({ Icon, image, title, desc }) => (
                <li key={title} className="flex items-center gap-4">
                  {image ? (
                    <img
                      src={image}
                      alt=""
                      aria-hidden="true"
                      className="h-[72px] w-[72px] shrink-0 object-contain"
                    />
                  ) : (
                    <span
                      className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: t.chipBg, color: t.chipIcon }}
                    >
                      <Icon size={22} strokeWidth={1.75} />
                    </span>
                  )}
                  <span className="flex flex-col">
                    <span
                      className="text-[15px] font-semibold leading-snug md:text-base"
                      style={{ color: t.benefitTitle }}
                    >
                      {title}
                    </span>
                    {desc && (
                      <span
                        className="mt-0.5 text-[13px] leading-snug md:text-sm"
                        style={{ color: t.benefitDesc }}
                      >
                        {desc}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <button
              type="button"
              onClick={() => {
                // TODO: navegação do CTA (cadastro vs deep-link a definir).
                if (onCta) onCta(data);
                else onClose();
              }}
              className="mt-10 rounded-full px-8 py-3.5 text-[15px] font-semibold transition-transform hover:scale-[1.03] active:scale-100 md:text-base"
              style={{ backgroundColor: t.ctaBg, color: t.ctaText }}
            >
              {data.ctaLabel}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

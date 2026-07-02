import { useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * Modal explicativo do bônus EcoDream, aberto ao tocar na linha "BÔNUS · EcoDream"
 * do card da oferta (SonoInlineCheckout, passo `offer`). A linha sozinha é abstrata
 * ("Interprete seus sonhos com a Eco") — aqui a pessoa entende o que é em um relance:
 * um exemplo real de sonho → leitura da Eco.
 *
 * Identidade própria (lua dourada + Cormorant serif), distinta do checkout violeta,
 * pra deixar claro que é OUTRO produto incluído. Conteúdo fiel à EcoDreamSection da
 * landing (Freud/Jung, exemplo da perseguição).
 */
interface SonoEcoDreamBonusModalProps {
  open: boolean;
  onClose: () => void;
}

const SERIF = "'Cormorant Garamond', Georgia, serif";

/** Logo do EcoDream (mascote) — tile branco estilo ícone de app, moldura dourada. */
function MoonOrb() {
  return (
    <span
      aria-hidden="true"
      className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl"
      style={{
        background: '#FFFFFF',
        border: '1px solid rgba(238,192,121,0.4)',
        boxShadow: '0 6px 22px rgba(238,192,121,0.18)',
      }}
    >
      <img src="/images/eco-dream-icon.webp" alt="" className="h-full w-full object-cover" />
    </span>
  );
}

export function SonoEcoDreamBonusModal({ open, onClose }: SonoEcoDreamBonusModalProps) {
  const reduceMotion = useReducedMotion();
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Cormorant Garamond sob demanda (mesmo padrão da EcoDreamSection) — só carrega
  // quando o modal abre, pra não pesar no checkout.
  useEffect(() => {
    if (!open) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,400;1,500&display=swap';
    document.head.appendChild(link);
    return () => {
      if (document.head.contains(link)) document.head.removeChild(link);
    };
  }, [open]);

  // Esc fecha; foca o botão de fechar ao abrir (a11y).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    closeBtnRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center px-6 py-10"
          style={{ background: 'rgba(5,3,14,0.85)', backdropFilter: 'blur(9px)', WebkitBackdropFilter: 'blur(9px)' }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="ecodream-bonus-title"
        >
          {/* Glow dourado ambiente atrás do painel — o "clarão de lua" */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[28%] -translate-x-1/2"
            style={{
              width: '260px',
              height: '180px',
              borderRadius: '50%',
              background: 'radial-gradient(ellipse, rgba(238,192,121,0.22) 0%, transparent 70%)',
              filter: 'blur(50px)',
            }}
          />

          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 14 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: 'spring', stiffness: 240, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[360px] overflow-hidden rounded-[28px] p-6 text-center"
            style={{
              // Noite mais quente/profunda que o card violeta — pra ser outro mundo.
              background: 'linear-gradient(165deg, #150F2F 0%, #0B0820 100%)',
              // Hairline dourado = a assinatura que separa do checkout violeta.
              border: '1px solid rgba(238,192,121,0.22)',
              boxShadow:
                '0 30px 80px rgba(4,2,12,0.7), inset 0 1px 0 rgba(245,224,154,0.12)',
            }}
          >
            {/* Fechar */}
            <button
              ref={closeBtnRef}
              onClick={onClose}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
              aria-label="Fechar"
            >
              <X className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.45)' }} />
            </button>

            {/* Lua dourada */}
            <div className="mb-3 flex justify-center">
              <MoonOrb />
            </div>

            {/* Eyebrow */}
            <p
              className="text-[11px] font-bold uppercase tracking-[0.2em]"
              style={{ color: '#EEC079' }}
            >
              Bônus · EcoDream
            </p>

            {/* Título onírico — Cormorant itálico */}
            <h3
              id="ecodream-bonus-title"
              className="mt-2 text-[26px] leading-tight"
              style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 500, color: '#F6ECD6' }}
            >
              O que seu sonho está tentando te dizer?
            </h3>

            {/* Lead */}
            <p className="mx-auto mt-3 max-w-[300px] text-[13.5px] leading-relaxed" style={{ color: 'rgba(232,222,200,0.62)' }}>
              A Eco interpreta seus sonhos pelo olhar de Freud e Jung — em segundos.
            </p>

            {/* Exemplo real: sonho → leitura. O elemento que faz entender de imediato. */}
            <div className="mt-5 text-left">
              {/* Sonho (voz literária — serifa itálica) */}
              <div
                className="rounded-2xl p-3.5"
                style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'rgba(232,222,200,0.4)' }}>
                  Seu sonho
                </p>
                <p
                  className="mt-1.5 text-[16px] leading-snug"
                  style={{ fontFamily: SERIF, fontStyle: 'italic', color: 'rgba(246,236,214,0.92)' }}
                >
                  “Eu estava sendo perseguido e minhas pernas não respondiam.”
                </p>
              </div>

              {/* Leitura (voz do produto — Geist), card dourado */}
              <div
                className="mt-2 rounded-2xl p-3.5"
                style={{ background: 'rgba(238,192,121,0.07)', border: '1px solid rgba(238,192,121,0.20)' }}
              >
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: '#EEC079' }}>
                  <span style={{ fontSize: '11px', lineHeight: 1 }}>✦</span>
                  A leitura da Eco
                </p>
                <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: 'rgba(240,232,214,0.86)' }}>
                  A perseguição costuma falar de algo <strong style={{ color: '#F6ECD6', fontWeight: 600 }}>evitado na vida
                  desperta</strong>. As pernas que travam são o corpo dizendo: parte de você quer parar de fugir.
                </p>
              </div>
            </div>

            {/* Reassurance honesta — já vem incluído */}
            <p className="mx-auto mt-4 max-w-[300px] text-[12px] leading-relaxed" style={{ color: 'rgba(232,222,200,0.5)' }}>
              Já vem incluído com seu acesso. É só contar o sonho — a Eco lê em segundos.
            </p>

            {/* Fechar — vidro dourado discreto (não compete com o CTA de comprar) */}
            <button
              onClick={onClose}
              className="mt-5 w-full rounded-full py-3.5 text-[14px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, rgba(245,224,154,0.16), rgba(238,192,121,0.10))',
                border: '1px solid rgba(238,192,121,0.42)',
                color: '#F6ECD6',
              }}
            >
              Entendi
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

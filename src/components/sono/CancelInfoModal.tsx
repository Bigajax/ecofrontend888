import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ShieldCheck } from 'lucide-react';

/**
 * Modal de confiança aberto a partir do "cancele quando quiser" no rodapé do
 * checkout inline do sono (SonoInlineCard). Explica, no momento de maior atrito
 * (digitar o cartão), como o cancelamento realmente funciona — garantia de 7
 * dias + passos concretos em Configurações → Assinatura — para reduzir o medo de
 * ficar "preso".
 *
 * Usa portal para escapar do container do checkout; não remonta o SonoInlineCard,
 * então o brick do Mercado Pago (Secure Fields) não é afetado.
 */
interface CancelInfoModalProps {
  open: boolean;
  onClose: () => void;
}

const STEPS = [
  <>Abra <strong className="font-semibold text-white">Configurações → Assinatura</strong> no app.</>,
  <>Toque em <strong className="font-semibold text-white">Cancelar assinatura</strong> — leva 1 toque, sem ligação nem e-mail.</>,
  <>Pronto: você mantém o acesso até o fim do período já pago.</>,
];

export function CancelInfoModal({ open, onClose }: CancelInfoModalProps) {
  // Fecha com Esc enquanto aberto.
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            className="fixed inset-0 z-[9999] flex items-end justify-center p-4 sm:items-center"
            style={{ background: 'rgba(3,6,18,0.72)', backdropFilter: 'blur(12px)' }}
            role="dialog"
            aria-modal="true"
            aria-label="Como cancelar a assinatura"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 24 }}
              transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm overflow-hidden rounded-3xl px-6 pb-6 pt-7 sm:px-7"
              style={{
                background: 'linear-gradient(160deg, #070B1D 0%, #050817 58%, #101733 100%)',
                border: '1px solid rgba(196,181,253,0.22)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.68), 0 8px 42px rgba(124,58,237,0.18)',
              }}
            >
              <div className="mb-4 flex justify-center">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full"
                  style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.26)' }}
                >
                  <ShieldCheck className="h-6 w-6" style={{ color: '#C4B5FD' }} />
                </div>
              </div>

              <h2 className="font-display mb-2 text-center text-[22px] font-bold leading-tight text-white">
                Cancele quando quiser
              </h2>

              {/* Garantia de 7 dias */}
              <div
                className="mb-4 rounded-2xl px-4 py-3.5"
                style={{ background: 'rgba(134,239,172,0.06)', border: '1px solid rgba(134,239,172,0.18)' }}
              >
                <p className="mb-1 text-[13px] font-semibold" style={{ color: '#86EFAC' }}>
                  Garantia tranquila de 7 dias
                </p>
                <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  Você só é cobrado no 8º dia — e só se não cancelar antes. Enviamos um lembrete
                  por e-mail 2 dias antes da primeira cobrança.
                </p>
              </div>

              {/* Passos */}
              <ul className="mb-5 flex flex-col gap-3">
                {STEPS.map((text, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: '#C4B5FD' }} />
                    <span className="text-[13.5px] leading-snug" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      {text}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="mb-5 text-center text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.34)' }}>
                Sem fidelidade e sem multa. O controle é todo seu.
              </p>

              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-full py-3.5 text-[14px] font-semibold transition-colors"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.13)', color: 'rgba(255,255,255,0.85)' }}
              >
                Entendi
              </button>
            </motion.div>
          </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

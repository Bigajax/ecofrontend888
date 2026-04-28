import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Lock, Moon } from 'lucide-react';
import mixpanel from '@/lib/mixpanel';

interface SonoPostExperienceModalProps {
  open: boolean;
  onClose: () => void;
  onCheckout: () => void;
  checkoutLoading: boolean;
}

export function SonoPostExperienceModal({
  open,
  onClose,
  onCheckout,
  checkoutLoading,
}: SonoPostExperienceModalProps) {
  useEffect(() => {
    if (open) mixpanel.track('Offer Modal Viewed', { product: 'protocolo_sono_7_noites' });
  }, [open]);

  const handleCheckout = () => {
    mixpanel.track('Offer CTA Clicked', { product: 'protocolo_sono_7_noites' });
    onCheckout();
  };

  return (
    <AnimatePresence>
      {open &&
        createPortal(
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center p-4"
            style={{ background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)' }}
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 32 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 32 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="relative w-full max-w-sm rounded-3xl overflow-hidden text-center"
              style={{
                background: 'linear-gradient(160deg, #06091A 0%, #0C1226 50%, #0F1A38 100%)',
                border: '1px solid rgba(167,139,250,0.20)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.60), 0 8px 32px rgba(167,139,250,0.10)',
              }}
            >
              {/* Ambient glow */}
              <div
                className="pointer-events-none absolute"
                style={{
                  top: '-60px', left: '50%', transform: 'translateX(-50%)',
                  width: '280px', height: '280px', borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 65%)',
                }}
              />

              <div className="relative z-10 px-7 pt-8 pb-7">
                {/* Icon */}
                <div
                  className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{
                    background: 'rgba(167,139,250,0.12)',
                    border: '1px solid rgba(167,139,250,0.25)',
                  }}
                >
                  <Moon className="h-6 w-6 text-[#C4B5FD]" />
                </div>

                {/* Title */}
                <h2
                  className="font-display text-[22px] font-bold leading-snug text-white mb-4"
                  style={{ textShadow: '0 1px 12px rgba(0,0,0,0.4)' }}
                >
                  Você iniciou o desligamento do estado de alerta.
                </h2>

                {/* Body */}
                <p className="text-[14px] text-white/55 leading-relaxed mb-5">
                  A primeira noite é só o começo. As próximas 6 noites aprofundam esse processo
                  para seu corpo aprender a desacelerar antes de dormir.
                </p>

                {/* Offer pill */}
                <div
                  className="mx-auto mb-6 inline-block rounded-full px-4 py-2 text-[12px] font-semibold"
                  style={{
                    background: 'rgba(167,139,250,0.10)',
                    border: '1px solid rgba(167,139,250,0.22)',
                    color: '#C4B5FD',
                  }}
                >
                  Desbloqueie as 7 noites por R$37 · Pagamento único · Sem mensalidade
                </div>

                {/* Night badges */}
                <div className="flex justify-center gap-1.5 mb-7">
                  {[2, 3, 4, 5, 6, 7].map((n) => (
                    <div
                      key={n}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white/40"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <Lock className="h-3 w-3" />
                    </div>
                  ))}
                </div>

                {/* CTA principal */}
                <button
                  onClick={handleCheckout}
                  disabled={checkoutLoading}
                  className="w-full rounded-full py-4 text-[15px] font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mb-3"
                  style={{
                    background: 'linear-gradient(135deg, #7B5FD4 0%, #5A3DB0 100%)',
                    boxShadow: '0 8px 28px rgba(107,79,187,0.50)',
                  }}
                >
                  {checkoutLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Abrindo pagamento…
                    </span>
                  ) : (
                    'Desbloquear as 7 noites — R$37'
                  )}
                </button>

                {/* CTA secundário */}
                <button
                  onClick={onClose}
                  disabled={checkoutLoading}
                  className="w-full py-2.5 text-[13px] text-white/35 transition-colors hover:text-white/55 disabled:opacity-50"
                >
                  Agora não
                </button>
              </div>
            </motion.div>
          </motion.div>,
          document.body
        )}
    </AnimatePresence>
  );
}

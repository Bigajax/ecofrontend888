import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Lock } from 'lucide-react';
import mixpanel from '@/lib/mixpanel';

interface SonoPostExperienceModalProps {
  open: boolean;
  onClose: () => void;
  onCheckout: () => void;
  checkoutLoading: boolean;
}

const NIGHTS = [2, 3, 4, 5, 6, 7] as const;

const TESTIMONIALS = [
  { text: '"Finalmente consigo dormir antes da meia-noite. Minha cabeça para de girar assim que o áudio começa."', author: 'Ana P., São Paulo' },
  { text: '"Eram 2h da manhã todo dia. Depois da Noite 3, isso parou completamente."', author: 'Lucas M., Belo Horizonte' },
  { text: '"Não acreditei até tentar. Na semana 2 já não precisava mais do áudio."', author: 'Carla R., Curitiba' },
];

export function SonoPostExperienceModal({
  open,
  onClose,
  onCheckout,
  checkoutLoading,
}: SonoPostExperienceModalProps) {
  const testimonial = TESTIMONIALS[0];

  const [timeLeft, setTimeLeft] = useState<number>(() => {
    const stored = sessionStorage.getItem('eco.sono.offer_expires');
    if (stored) return Math.max(0, parseInt(stored) - Date.now());
    const expires = Date.now() + 15 * 60 * 1000;
    sessionStorage.setItem('eco.sono.offer_expires', String(expires));
    return 15 * 60 * 1000;
  });

  useEffect(() => {
    if (!open) return;
    mixpanel.track('Offer Modal Viewed', { product: 'protocolo_sono_7_noites' });
    const id = setInterval(() => {
      const stored = sessionStorage.getItem('eco.sono.offer_expires');
      setTimeLeft(stored ? Math.max(0, parseInt(stored) - Date.now()) : 0);
    }, 1000);
    return () => clearInterval(id);
  }, [open]);

  const formatCountdown = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };

  const handleCheckout = () => {
    mixpanel.track('Offer CTA Clicked', { product: 'protocolo_sono_7_noites', source: 'post_experience_modal' });
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
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center p-4"
            style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(10px)' }}
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 40 }}
              transition={{ duration: 0.30, ease: [0.4, 0, 0.2, 1] }}
              className="relative w-full max-w-sm overflow-hidden rounded-3xl"
              style={{
                background: 'linear-gradient(160deg, #0A0D1F 0%, #06091A 60%, #0D1530 100%)',
                border: '1px solid rgba(167,139,250,0.22)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.70), 0 8px 40px rgba(124,58,237,0.18)',
              }}
            >
              {/* Top glow */}
              <div
                className="pointer-events-none absolute"
                style={{ top: '-60px', left: '50%', transform: 'translateX(-50%)', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.22) 0%, transparent 65%)' }}
              />

              <div className="relative z-10 px-7 pt-8 pb-7">

                {/* Night 1 completion badge */}
                <div className="flex justify-center mb-5">
                  <div
                    className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em]"
                    style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.28)', color: '#C4B5FD' }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#A78BFA', boxShadow: '0 0 4px rgba(167,139,250,0.9)' }} />
                    Noite 1 concluída
                  </div>
                </div>

                {/* Headline */}
                <h2
                  className="font-display text-[22px] font-bold text-white leading-snug text-center mb-3"
                  style={{ textShadow: '0 1px 16px rgba(0,0,0,0.5)' }}
                >
                  Esta noite foi diferente,<br />
                  <em style={{ color: '#C4B5FD', fontStyle: 'italic' }}>não foi?</em>
                </h2>

                {/* Body */}
                <p className="text-[13px] text-center leading-relaxed mb-5" style={{ color: 'rgba(255,255,255,0.50)' }}>
                  O que você sentiu é apenas a Noite 1. Cada uma das próximas 6 resolve uma camada diferente — até seu corpo não precisar mais do áudio.
                </p>

                {/* 7 nights visual */}
                <div className="flex justify-center gap-2 mb-5">
                  {/* Night 1 done */}
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #C4B5FD 0%, #7C3AED 100%)', boxShadow: '0 0 14px rgba(124,58,237,0.60)' }}
                  >
                    ✓
                  </div>
                  {/* Nights 2-7 locked */}
                  {NIGHTS.map((n, idx) => (
                    <div
                      key={n}
                      className="flex h-9 w-9 items-center justify-center rounded-full"
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.09)',
                        opacity: Math.max(0.35, 0.95 - idx * 0.09),
                      }}
                    >
                      <Lock className="h-3 w-3 text-white/30" />
                    </div>
                  ))}
                </div>

                {/* Price row */}
                <div className="flex items-baseline justify-center gap-3 mb-2">
                  <span className="text-[14px] line-through" style={{ color: 'rgba(255,255,255,0.25)' }}>R$97</span>
                  <span className="font-display text-[34px] font-bold text-white leading-none">R$37</span>
                  <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.38)' }}>único</span>
                </div>

                {/* Countdown */}
                {timeLeft > 0 && (
                  <div className="flex items-center justify-center gap-1.5 mb-5">
                    <span style={{ color: '#FBBF24', fontSize: '13px' }}>⏱</span>
                    <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.50)' }}>
                      Oferta expira em{' '}
                      <span className="font-mono font-bold" style={{ color: '#FCD34D' }}>{formatCountdown(timeLeft)}</span>
                    </span>
                  </div>
                )}

                {/* Social proof */}
                <div className="flex items-center justify-center gap-2 mb-5">
                  <span style={{ color: '#FBBF24', fontSize: '11px', letterSpacing: '1px' }}>★★★★★</span>
                  <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.38)' }}>12.400+ pessoas dormem melhor</span>
                </div>

                {/* CTA */}
                <button
                  onClick={handleCheckout}
                  disabled={checkoutLoading}
                  className="w-full rounded-full py-[1.05rem] text-[15px] font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mb-3"
                  style={{
                    background: 'linear-gradient(135deg, #A78BFA 0%, #5A3DB0 100%)',
                    boxShadow: '0 10px 36px rgba(124,58,237,0.65)',
                  }}
                >
                  {checkoutLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Abrindo pagamento…
                    </span>
                  ) : (
                    'Garantir as 7 noites — R$37 →'
                  )}
                </button>

                {/* Micro-copy */}
                <p className="text-center text-[11px] mb-5" style={{ color: 'rgba(255,255,255,0.28)' }}>
                  Acesso imediato · Sem assinatura · Sem risco
                </p>

                {/* Testimonial */}
                <div
                  className="rounded-2xl p-4 mb-4"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <p className="text-[12px] italic leading-relaxed" style={{ color: 'rgba(255,255,255,0.58)' }}>
                    {testimonial.text}
                  </p>
                  <p className="mt-1.5 text-[10px]" style={{ color: 'rgba(255,255,255,0.28)' }}>— {testimonial.author} · verificado</p>
                </div>

                {/* Dismiss */}
                <button
                  onClick={onClose}
                  disabled={checkoutLoading}
                  className="w-full py-2 text-[12px] transition-colors disabled:opacity-50"
                  style={{ color: 'rgba(255,255,255,0.28)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.50)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.28)')}
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

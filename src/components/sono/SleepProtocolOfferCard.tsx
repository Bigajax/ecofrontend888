import { Play, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const T = {
  amber:      '#C9922A',
  amberLight: '#D4A847',
  amberGlow:  'rgba(212,168,71,',
};

interface SleepProtocolOfferCardProps {
  onStart: () => void;
  onCheckout: () => void;
  checkoutLoading?: boolean;
}

export function SleepProtocolOfferCard({
  onStart,
  onCheckout,
  checkoutLoading = false,
}: SleepProtocolOfferCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ type: 'spring', stiffness: 65, damping: 18 }}
      className="relative overflow-hidden rounded-3xl px-6 py-7 text-center"
      style={{
        background: 'linear-gradient(160deg, rgba(14,12,9,0.97) 0%, rgba(8,8,11,0.99) 100%)',
        border: `1px solid ${T.amberGlow}0.18)`,
        boxShadow: `0 8px 40px rgba(0,0,0,0.30), inset 0 1px 0 ${T.amberGlow}0.06)`,
      }}
    >
      <div
        className="pointer-events-none absolute"
        style={{
          top: '-50px', right: '-40px',
          width: '180px', height: '180px', borderRadius: '50%',
          background: `radial-gradient(circle, ${T.amberGlow}0.08) 0%, transparent 70%)`,
        }}
      />

      <div className="relative z-10">
        <p
          className="text-[11px] uppercase tracking-[0.2em] font-bold mb-3"
          style={{ color: 'rgba(251,191,36,0.75)' }}
        >
          Protocolo Sono Profundo — 7 noites guiadas
        </p>

        <h3 className="font-display text-[20px] font-bold text-white mb-3 leading-tight">
          Experimente a primeira noite gratuitamente.
        </h3>

        <p
          className="text-[13px] leading-relaxed mb-5"
          style={{ color: 'rgba(255,255,255,0.46)' }}
        >
          Em 8 minutos, você vai conduzir seu corpo para fora do estado de alerta e iniciar um ritual de desaceleração profunda. Ao final da experiência, você poderá liberar o protocolo completo de 7 noites.
        </p>

        <div className="flex items-baseline justify-center gap-3 mb-1">
          <span className="font-display text-[38px] font-bold text-white leading-none">R$97</span>
        </div>
        <p className="text-[12px] mb-5" style={{ color: 'rgba(255,255,255,0.28)' }}>
          7 noites completas · Pagamento único
        </p>

        <button
          onClick={onStart}
          className="w-full inline-flex items-center justify-center gap-2 rounded-full px-6 py-4 text-[15px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98] mb-3"
          style={{
            background: `linear-gradient(135deg, ${T.amberLight} 0%, ${T.amber} 100%)`,
            color: '#0D1120',
            boxShadow: `0 10px 32px ${T.amberGlow}0.32)`,
          }}
        >
          <Play className="h-4 w-4" fill="currentColor" />
          Começar experiência gratuita →
        </button>

        <button
          onClick={onCheckout}
          disabled={checkoutLoading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[14px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 mb-3"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.13)',
            color: 'rgba(255,255,255,0.70)',
          }}
        >
          {checkoutLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Abrindo...
            </>
          ) : (
            'Liberar protocolo completo'
          )}
        </button>

        <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.24)' }}>
          Pagamento seguro via Pix/cartão.
        </p>
      </div>
    </motion.div>
  );
}

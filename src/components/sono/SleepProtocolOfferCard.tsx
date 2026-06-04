import { Play, Loader2, ShieldCheck } from 'lucide-react';
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
          Protocolo Completo — 7 Noites
        </p>

        <h3 className="font-display text-[22px] font-bold text-white mb-3 leading-[1.15]">
          A Noite 1 abre a porta.<br />
          <span style={{ color: 'rgba(255,255,255,0.55)' }}>As próximas seis fixam o caminho.</span>
        </h3>

        <p
          className="text-[13.5px] leading-relaxed mb-6"
          style={{ color: 'rgba(255,255,255,0.50)' }}
        >
          Em sete noites, seu corpo aprende a encontrar o sono sem ajuda.<br />
          O protocolo sai. A capacidade fica.
        </p>

        {/* Price block */}
        <div className="flex items-center justify-center gap-2.5 mb-1">
          <span className="font-display text-[44px] font-bold text-white leading-none tracking-tight">
            7 dias gratuitos
          </span>
        </div>
        <p className="text-[12px] mb-3" style={{ color: 'rgba(255,255,255,0.32)' }}>
          Depois R$ 15,90/mês · cancele quando quiser
        </p>

        {/* Benefício */}
        <p
          className="text-[12px] italic mb-6"
          style={{ color: 'rgba(251,191,36,0.65)' }}
        >
          Inclui o Ecotopia completo: Eco IA, meditações e mais.
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
          Ouvir a Noite 1
        </button>

        <button
          onClick={onCheckout}
          disabled={checkoutLoading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[14px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 mb-4"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.13)',
            color: 'rgba(255,255,255,0.78)',
          }}
        >
          {checkoutLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Abrindo...
            </>
          ) : (
            'Começar 7 dias gratuitos'
          )}
        </button>

        {/* Guarantee badge — matches landing tone */}
        <div className="flex items-start justify-center gap-2 text-left">
          <ShieldCheck className="mt-[2px] h-3.5 w-3.5 shrink-0" style={{ color: T.amberLight }} strokeWidth={2} />
          <p className="text-[11.5px] leading-[1.5]" style={{ color: 'rgba(255,255,255,0.42)' }}>
            <span className="font-semibold text-white/70">Garantia de 7 dias.</span>{' '}
            Não funcionou? Devolvemos. Email basta.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

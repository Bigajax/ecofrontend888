import { Lock } from 'lucide-react';

interface PromoSectionProps {
  onUpgradeClick?: () => void;
}

export default function PromoSection({ onUpgradeClick }: PromoSectionProps) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-12 md:px-8 text-center">
      <h2 className="font-display text-[26px] font-bold text-[var(--eco-text)] md:text-3xl">
        Você começou uma jornada. Não pare agora.
      </h2>
      <p className="mt-3 text-[15px] text-[var(--eco-muted)] max-w-xs mx-auto leading-relaxed">
        50% OFF por tempo limitado. Sua continuação vale isso.
      </p>
      <button
        onClick={onUpgradeClick}
        className="mt-8 inline-flex items-center gap-3 rounded-full px-10 py-4 text-[15px] font-bold uppercase tracking-widest text-white transition-all duration-200 hover:scale-105 active:scale-95"
        style={{ background: 'linear-gradient(135deg, #6EC8FF, #4BAEE8)', boxShadow: '0 4px 20px rgba(110,200,255,0.45)' }}
      >
        <Lock size={17} />
        Quero continuar →
      </button>
    </section>
  );
}

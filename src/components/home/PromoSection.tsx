import { Lock } from 'lucide-react';

interface PromoSectionProps {
  onUpgradeClick?: () => void;
}

export default function PromoSection({ onUpgradeClick }: PromoSectionProps) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-12 md:px-8 text-center bg-white">
      <h2 className="font-display text-[26px] font-bold text-[var(--eco-text)] md:text-3xl">
        Você começou uma jornada. Não pare agora.
      </h2>
      <p className="mt-3 text-[15px] text-[var(--eco-muted)] max-w-xs mx-auto leading-relaxed">
        Volte com 50% de desconto — por tempo limitado.
      </p>
      <button
        onClick={onUpgradeClick}
        className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#6EC8FF] px-10 py-4 text-[15px] font-bold uppercase tracking-widest text-white shadow-[0_4px_20px_rgba(110,200,255,0.45)] transition-all duration-200 hover:opacity-90 active:scale-95"
      >
        <Lock size={17} />
        Retomar minha jornada →
      </button>
    </section>
  );
}

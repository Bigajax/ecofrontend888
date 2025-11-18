import type { Ring } from '@/types/rings';
import RingIcon from './RingIcon';

interface RingCardProps {
  ring: Ring;
  onViewMore: () => void;
}

export default function RingCard({ ring, onViewMore }: RingCardProps) {
  return (
    <button
      onClick={onViewMore}
      className="group relative overflow-hidden rounded-2xl border border-[var(--eco-line)] bg-white/60 backdrop-blur-md p-6 text-left transition-all duration-300 hover:shadow-[0_8px_40px_rgba(0,0,0,0.08)] hover:-translate-y-1 active:translate-y-0 md:p-8"
    >
      {/* Background accent (subtle) */}
      <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="absolute right-0 top-0 -mr-12 -mt-12 h-32 w-32 rounded-full bg-gradient-to-br from-[var(--eco-user)]/5 to-transparent blur-2xl" />
      </div>

      {/* Content */}
      <div className="relative">
        {/* Icon */}
        <div className="mb-4 text-[var(--eco-text)]">
          <RingIcon ringId={ring.id as any} size={48} />
        </div>

        {/* Title */}
        <h3 className="mb-1 text-[17px] font-semibold text-[var(--eco-text)]">{ring.titlePt}</h3>

        {/* Subtitle */}
        <p className="mb-4 text-[14px] font-medium text-[var(--eco-user)]">{ring.subtitlePt}</p>

        {/* Impact Phrase */}
        <p className="mb-6 text-[13px] leading-relaxed text-[var(--eco-muted)] italic">
          "{ring.impactPhrase}"
        </p>

        {/* Arrow indicator */}
        <div className="inline-flex items-center gap-2 text-[13px] font-medium text-[var(--eco-user)] transition-all group-hover:gap-3">
          <span>Ver mais</span>
          <span className="transition-transform group-hover:translate-x-1">→</span>
        </div>
      </div>
    </button>
  );
}

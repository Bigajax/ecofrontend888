import { ChevronRight } from 'lucide-react';
import type { Ring } from '@/types/rings';
import RingIcon from './RingIcon';

interface RingCardProps {
  ring: Ring;
  onViewMore: () => void;
}

export default function RingCard({ ring, onViewMore }: RingCardProps) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--eco-line)] shadow-[0_4px_30px_rgba(0,0,0,0.04)] text-left transition-all duration-300 md:hover:shadow-[0_12px_50px_rgba(0,0,0,0.2)]"
    >
      {/* Image Section (top) */}
      <div className="relative h-40 overflow-hidden rounded-t-2xl">
        {ring.backgroundImage ? (
          <img
            src={ring.backgroundImage}
            alt={ring.titlePt}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 scale-100"
            loading="lazy"
          />
        ) : (
          // Fallback with icon if no background image
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-amber-100 to-orange-100">
            <RingIcon ringId={ring.id as any} size={60} />
          </div>
        )}
      </div>

      {/* Content Section (bottom) */}
      <div className="flex flex-1 flex-col bg-white p-4">
        {/* Title */}
        <h3 className="font-display text-base font-normal text-[var(--eco-text)]">
          {ring.titlePt}
        </h3>

        {/* Subtitle */}
        <p className="mt-1 text-[13px] font-medium text-[#C17D3A]">
          {ring.subtitlePt}
        </p>

        {/* Impact Phrase - with min height to ensure alignment */}
        <p className="mt-2 min-h-[40px] text-[13px] text-[var(--eco-text)]/70 leading-relaxed italic">
          "{ring.impactPhrase}"
        </p>

        {/* Spacer to push button to bottom */}
        <div className="flex-1" />

        {/* Ver mais button - Apple style */}
        <button
          onClick={onViewMore}
          className="mt-4 flex items-center justify-center gap-1.5 rounded-lg border border-[var(--eco-line)] bg-white px-4 py-2 text-[13px] font-medium text-[var(--eco-user)] transition-all duration-200 hover:bg-gray-50 active:scale-95"
        >
          <span>Ver mais</span>
          <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}

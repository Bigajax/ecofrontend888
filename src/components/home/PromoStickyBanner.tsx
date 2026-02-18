import { useState } from 'react';
import { X } from 'lucide-react';

interface PromoStickyBannerProps {
  onUpgradeClick?: () => void;
}

export default function PromoStickyBanner({ onUpgradeClick }: PromoStickyBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-50 md:hidden">
      <button
        onClick={onUpgradeClick}
        className="flex w-full items-center gap-3 bg-[#6EC8FF] px-4 py-3 text-left"
      >
        {/* Pill badge */}
        <span className="flex-shrink-0 rounded-full bg-[#36B3FF] px-3 py-1.5 text-[12px] font-bold uppercase tracking-wide text-white">
          Economize 50%
        </span>

        {/* Text */}
        <p className="flex-1 text-[12px] leading-snug text-white line-clamp-2">
          Aproveite o seu desconto agora! Assine o Premium e aprofunde sua jornada de bem-estar.
        </p>
      </button>

      {/* Dismiss button — fora do botão principal para não propagar o clique */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full text-white/80 hover:text-white active:scale-90 transition-all"
      >
        <X size={16} />
      </button>
    </div>
  );
}

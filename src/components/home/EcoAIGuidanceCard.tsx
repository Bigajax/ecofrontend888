import { ChevronRight } from 'lucide-react';
import EcoBubbleOneEye from '@/components/EcoBubbleOneEye';

interface EcoAIGuidanceCardProps {
  userName: string;
  onStartChat: () => void;
}

export default function EcoAIGuidanceCard({
  userName,
  onStartChat,
}: EcoAIGuidanceCardProps) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      {/* Title */}
      <div className="mb-8 pb-6 border-b border-[var(--eco-line)]">
        <h2 className="font-display text-xl font-bold text-[var(--eco-text)]">
          Receber orientação individual
        </h2>
      </div>

      {/* Card */}
      <button
        onClick={onStartChat}
        className="group w-full max-w-xs overflow-hidden rounded-2xl border border-[var(--eco-line)] bg-transparent p-4 transition-all duration-300 hover:shadow-[0_8px_48px_rgba(138,43,226,0.15)] hover:-translate-y-1 active:translate-y-0 md:p-5"
      >
        <div className="flex items-start justify-between gap-3">
          {/* Left: Avatar + Text */}
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/60 shadow-[0_4px_15px_rgba(138,43,226,0.2)] backdrop-blur-sm transition-all duration-300 group-hover:scale-110">
              <EcoBubbleOneEye variant="icon" size={24} />
            </div>

            {/* Text Content */}
            <div className="text-left">
              <h3 className="font-display text-lg font-normal text-[var(--eco-text)]">
                ECO AI
              </h3>
              <p className="mt-1 text-[12px] leading-relaxed text-[var(--eco-muted)]">
                Bom tarde, {userName}! Se precisar fazer uma pausa, estou aqui para conversar.
              </p>
            </div>
          </div>

          {/* Right: Arrow Icon */}
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/60 backdrop-blur-sm transition-all duration-300 group-hover:bg-white">
            <ChevronRight
              size={16}
              strokeWidth={2}
              className="text-[var(--eco-user)] transition-transform duration-300 group-hover:translate-x-0.5"
            />
          </div>
        </div>
      </button>
    </section>
  );
}

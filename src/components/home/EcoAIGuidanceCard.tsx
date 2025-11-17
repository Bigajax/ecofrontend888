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
      <h2 className="mb-8 font-display text-2xl font-normal text-[var(--eco-text)]">
        Receber orientação individual
      </h2>

      {/* Card */}
      <button
        onClick={onStartChat}
        className="group w-full overflow-hidden rounded-3xl border border-[var(--eco-line)] bg-gradient-to-br from-purple-100 via-blue-50 to-pink-50 p-8 shadow-[0_4px_30px_rgba(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_8px_48px_rgba(138,43,226,0.15)] hover:-translate-y-1 active:translate-y-0 md:p-10"
      >
        <div className="flex items-start justify-between">
          {/* Left: Avatar + Text */}
          <div className="flex flex-col items-start gap-6">
            {/* Avatar */}
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/60 shadow-[0_4px_15px_rgba(138,43,226,0.2)] backdrop-blur-sm transition-all duration-300 group-hover:scale-110">
              <EcoBubbleOneEye variant="icon" size={36} />
            </div>

            {/* Text Content */}
            <div className="text-left">
              <h3 className="font-display text-2xl font-normal text-[var(--eco-text)]">
                ECO AI
              </h3>
              <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-[var(--eco-muted)]">
                Bom dia, {userName}! Estou aqui se precisar de uma conversa para começar seu dia.
              </p>
            </div>
          </div>

          {/* Right: Arrow Icon */}
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white/60 backdrop-blur-sm transition-all duration-300 group-hover:bg-white">
            <ChevronRight
              size={24}
              strokeWidth={2}
              className="text-[var(--eco-user)] transition-transform duration-300 group-hover:translate-x-1"
            />
          </div>
        </div>
      </button>
    </section>
  );
}

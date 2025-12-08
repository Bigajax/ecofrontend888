import { ChevronRight, Sparkles } from 'lucide-react';

interface AIGuidanceCardProps {
  onStartChat: () => void;
  userName: string;
}

export default function AIGuidanceCard({
  onStartChat,
  userName,
}: AIGuidanceCardProps) {
  return (
    <section className="px-4 py-8 md:px-6 md:py-12">
      {/* Title */}
      <h2 className="mb-6 font-display text-2xl font-normal text-[var(--eco-text)]">
        Receber orientação individual
      </h2>

      {/* Main Card - Desktop & Mobile */}
      <div className="group relative overflow-hidden rounded-3xl border border-[var(--eco-line)] bg-gradient-to-br from-[#E3F5FF] via-[#F5FBFF] to-[#E3F5FF] shadow-[0_4px_30px_rgba(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_12px_48px_rgba(110,200,255,0.15)]">
        {/* Decorative gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/0 to-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="relative p-6 md:p-10">
          {/* Grid layout for desktop */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:items-center">
            {/* Left side - Avatar & Text */}
            <div className="flex flex-col items-start">
              {/* Avatar */}
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white/60 backdrop-blur-sm transition-all duration-300 group-hover:scale-110 group-hover:bg-[#89CFF0]/20">
                <Sparkles size={32} className="text-[#89CFF0] transition-colors duration-300" strokeWidth={1.5} />
              </div>

              {/* Text content */}
              <h3 className="font-display text-3xl font-normal text-[var(--eco-text)]">
                ECO AI
              </h3>
              <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-[var(--eco-text)]/80">
                {userName}, estou aqui para uma conversa que te ajude a entender melhor
                seus sentimentos e encontrar clarity.
              </p>

              {/* CTA Button */}
              <button
                onClick={onStartChat}
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--eco-user)] px-6 py-3 font-medium text-white shadow-[0_4px_20px_rgba(167,132,108,0.3)] transition-all duration-300 hover:bg-gradient-to-r hover:from-[var(--eco-user)] hover:to-[var(--eco-accent)] hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(167,132,108,0.4)] active:translate-y-0"
              >
                Começar Conversa
                <ChevronRight size={18} strokeWidth={2} />
              </button>
            </div>

            {/* Right side - Decorative element or info */}
            <div className="hidden md:block">
              <div className="relative rounded-2xl border border-white/40 bg-white/20 p-6 backdrop-blur-sm">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-[var(--eco-accent)]" />
                    <span className="text-[14px] text-[var(--eco-text)]/70">
                      Conversas personalizadas
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-[var(--eco-accent)]" />
                    <span className="text-[14px] text-[var(--eco-text)]/70">
                      Insights emocionais profundos
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-[var(--eco-accent)]" />
                    <span className="text-[14px] text-[var(--eco-text)]/70">
                      Memória emocional contínua
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

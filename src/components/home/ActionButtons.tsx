import { Play, Compass, Zap } from 'lucide-react';

interface ActionButtonsProps {
  onContinue?: () => void;
  onStart?: () => void;
  onExplore?: () => void;
}

export default function ActionButtons({
  onContinue,
  onStart,
  onExplore,
}: ActionButtonsProps) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-10">
      <div className="flex flex-col gap-4 md:flex-row md:gap-6">
        {/* Continue Button */}
        <button
          onClick={onContinue}
          className="flex flex-1 items-center justify-center gap-3 rounded-xl border-2 border-[#6EC8FF] bg-[#F5FBFF] px-6 py-4 text-[14px] font-medium text-[#6EC8FF] transition-all duration-300 hover:bg-[#E3F5FF] hover:shadow-[0_4px_20px_rgba(110,200,255,0.15)]"
        >
          <Play size={18} strokeWidth={2} />
          Continuar Programa
        </button>

        {/* Start New Button */}
        <button
          onClick={onStart}
          className="flex flex-1 items-center justify-center gap-3 rounded-xl border-2 border-gray-300 bg-white px-6 py-4 text-[14px] font-medium text-[var(--eco-text)] transition-all duration-300 hover:border-[#6EC8FF] hover:bg-[#F5FBFF]"
        >
          <Zap size={18} strokeWidth={2} />
          Iniciar Novo
        </button>

        {/* Explore Button */}
        <button
          onClick={onExplore}
          className="flex flex-1 items-center justify-center gap-3 rounded-xl border-2 border-gray-300 bg-white px-6 py-4 text-[14px] font-medium text-[var(--eco-text)] transition-all duration-300 hover:border-[#6EC8FF] hover:bg-[#F5FBFF]"
        >
          <Compass size={18} strokeWidth={2} />
          Explorar Mais
        </button>
      </div>
    </section>
  );
}

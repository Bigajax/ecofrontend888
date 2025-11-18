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
          className="flex flex-1 items-center justify-center gap-3 rounded-xl border-2 border-purple-600 bg-purple-50 px-6 py-4 text-[14px] font-medium text-purple-600 transition-all duration-300 hover:bg-purple-100 hover:shadow-[0_4px_20px_rgba(147,51,234,0.15)]"
        >
          <Play size={18} strokeWidth={2} />
          Continuar Programa
        </button>

        {/* Start New Button */}
        <button
          onClick={onStart}
          className="flex flex-1 items-center justify-center gap-3 rounded-xl border-2 border-gray-300 bg-white px-6 py-4 text-[14px] font-medium text-[var(--eco-text)] transition-all duration-300 hover:border-purple-600 hover:bg-purple-50"
        >
          <Zap size={18} strokeWidth={2} />
          Iniciar Novo
        </button>

        {/* Explore Button */}
        <button
          onClick={onExplore}
          className="flex flex-1 items-center justify-center gap-3 rounded-xl border-2 border-gray-300 bg-white px-6 py-4 text-[14px] font-medium text-[var(--eco-text)] transition-all duration-300 hover:border-purple-600 hover:bg-purple-50"
        >
          <Compass size={18} strokeWidth={2} />
          Explorar Mais
        </button>
      </div>
    </section>
  );
}

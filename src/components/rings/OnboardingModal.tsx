import { RINGS_ARRAY } from '@/constants/rings';
import RingIcon from './RingIcon';

interface OnboardingModalProps {
  onComplete: () => void;
  onDismiss: () => void;
}

export default function OnboardingModal({ onComplete, onDismiss }: OnboardingModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onDismiss} />

      {/* Modal Container with scroll */}
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--eco-line)] bg-white/60 backdrop-blur-md p-4 sm:p-6 shadow-[0_4px_30px_rgba(0,0,0,0.04)] transition-all duration-300">
        {/* Close button */}
        <button
          onClick={onDismiss}
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-lg text-[var(--eco-muted)] transition-all hover:bg-[var(--eco-line)] hover:text-[var(--eco-text)]"
          aria-label="Fechar"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Title */}
        <h1 className="font-display text-xl sm:text-2xl font-normal text-[var(--eco-text)] pr-8">
          Cinco Anéis da Disciplina
        </h1>

        {/* Subtitle */}
        <p className="mt-2 text-[12px] sm:text-[13px] leading-relaxed text-[var(--eco-muted)]">
          Um ritual diário inspirado em Miyamoto Musashi para fortalecer sua disciplina com clareza, pequenos ajustes e identidade.
        </p>

        {/* Rings List */}
        <div className="mt-4 sm:mt-5 space-y-2">
          {RINGS_ARRAY.map((ring) => (
            <div
              key={ring.id}
              className="group rounded-xl border border-[var(--eco-line)] bg-white/60 backdrop-blur-md p-2.5 sm:p-3 transition-all duration-300 md:hover:-translate-y-0.5 md:hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
            >
              <div className="flex items-start gap-2 sm:gap-2.5">
                <div className="mt-0.5 text-[var(--eco-text)] flex-shrink-0">
                  <RingIcon ringId={ring.id as any} size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[12px] sm:text-[13px] font-semibold text-[var(--eco-text)]">
                    {ring.titlePt}
                  </h3>
                  <p className="mt-0.5 text-[11px] sm:text-[12px] text-[var(--eco-muted)] leading-snug">{ring.descriptionPt}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Final Message */}
        <div className="mt-4 sm:mt-5 rounded-xl border border-[var(--eco-line)] bg-white/60 backdrop-blur-md p-3 sm:p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          <p className="text-center text-[11px] sm:text-[12px] font-medium text-[var(--eco-text)] leading-relaxed">
            "5 perguntas rápidas por dia. A Eco cuida do resto: padrões, gráficos e reflexões."
          </p>
        </div>

        {/* Buttons */}
        <div className="mt-4 sm:mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end pb-1">
          <button
            onClick={onDismiss}
            className="rounded-lg border border-[var(--eco-line)] bg-white/60 backdrop-blur-md px-4 py-2.5 sm:py-2 text-[13px] sm:text-[12px] font-medium text-[var(--eco-text)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)] active:translate-y-0"
          >
            Ver depois
          </button>
          <button
            onClick={onComplete}
            className="rounded-lg bg-[var(--eco-user)] px-4 py-2.5 sm:py-2 text-[13px] sm:text-[12px] font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(167,132,108,0.25)] active:translate-y-0"
          >
            Começar
          </button>
        </div>
      </div>
    </div>
  );
}

import { ChevronRight } from 'lucide-react';

interface ProgramProgress {
  id: string;
  title: string;
  description: string;
  currentLesson: string;
  progress: number; // 0-100
  duration: string;
  image?: string;
}

interface ContinueProgramProps {
  program: ProgramProgress;
  onContinue?: () => void;
}

export default function ContinueProgram({
  program,
  onContinue,
}: ContinueProgramProps) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-10">
      {/* Title */}
      <h2 className="mb-6 font-display text-2xl font-normal text-[var(--eco-text)]">
        Reproduzido recentemente
      </h2>

      {/* Program Card */}
      <button
        onClick={onContinue}
        className="group w-full overflow-hidden rounded-2xl border border-[var(--eco-line)] bg-transparent p-6 transition-all duration-300 hover:shadow-[0_8px_48px_rgba(147,51,234,0.12)] hover:-translate-y-1 active:translate-y-0 md:p-8"
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          {/* Left: Info */}
          <div className="flex flex-1 flex-col gap-4">
            {/* Program Title */}
            <div>
              <h3 className="font-display text-xl font-normal text-purple-600 md:text-2xl">
                {program.title}
              </h3>
              <p className="mt-2 text-[14px] text-[var(--eco-muted)]">
                {program.description}
              </p>
            </div>

            {/* Current Lesson */}
            <div>
              <p className="text-[13px] font-medium text-gray-500 uppercase tracking-wide">
                Próxima aula
              </p>
              <p className="mt-1 text-[15px] font-medium text-[var(--eco-text)]">
                {program.currentLesson}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="flex items-center gap-3">
              <div className="flex-1 overflow-hidden rounded-full bg-gray-200 h-2">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 to-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${program.progress}%` }}
                />
              </div>
              <span className="text-[13px] font-medium text-gray-500 whitespace-nowrap">
                {program.progress}%
              </span>
            </div>

            {/* Duration */}
            <p className="text-[13px] text-[var(--eco-muted)]">
              ⏱️ {program.duration} restante
            </p>
          </div>

          {/* Right: CTA */}
          <div className="flex flex-shrink-0 items-center gap-2">
            <span className="hidden text-[14px] font-medium text-purple-600 md:inline">
              Continuar
            </span>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 transition-all duration-300 group-hover:bg-purple-700">
              <ChevronRight
                size={24}
                strokeWidth={2}
                className="text-white transition-transform duration-300 group-hover:translate-x-1"
              />
            </div>
          </div>
        </div>
      </button>
    </section>
  );
}

import { Play } from 'lucide-react';

interface DrJoeMeditationCardProps {
  onClick?: () => void;
}

export default function DrJoeMeditationCard({ onClick }: DrJoeMeditationCardProps) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-[var(--eco-text)] md:text-3xl">
          Meditações do Dr. Joe Dispenza
        </h2>
        <p className="mt-2 text-sm text-[var(--eco-muted)] md:text-base">
          Técnicas avançadas para transformação pessoal
        </p>
      </div>

      <button
        onClick={onClick}
        className="group relative h-[200px] w-full overflow-hidden rounded-3xl shadow-[0_2px_20px_rgba(0,0,0,0.08)] transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.15)] hover:-translate-y-1"
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url("/images/caduceu-dourado.png")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(59, 30, 119, 0.6) 0%, rgba(59, 30, 119, 0.85) 100%)',
          }}
        />

        <div className="relative flex h-full flex-col justify-between p-6">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
              5 meditações
            </span>
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
              Fundamentos
            </span>
          </div>

          <div className="flex items-end justify-between">
            <div className="flex-1 text-left">
              <h3 className="text-2xl font-bold text-white md:text-3xl">
                Fundamentos
              </h3>
              <p className="mt-2 text-sm text-white/90 md:text-base">
                Meditações guiadas para iniciar sua jornada com atenção e consciência.
              </p>
            </div>

            <div className="ml-4 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm transition-all duration-300 group-hover:scale-110 group-hover:bg-white">
              <Play className="h-5 w-5 text-[#3B1E77]" fill="currentColor" />
            </div>
          </div>
        </div>
      </button>
    </section>
  );
}

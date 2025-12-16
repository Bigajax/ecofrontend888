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
          Recondicione sua mente e manifeste uma nova realidade
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <button
          onClick={onClick}
          className="group relative h-64 w-full overflow-hidden rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.06)] transition-all duration-300 md:hover:scale-[0.98] md:hover:shadow-[0_2px_15px_rgba(0,0,0,0.06)] md:hover:translate-y-1 active:scale-95 touch-manipulation"
        >
        {/* Background Image */}
        <img
          src="/images/caduceu-dourado.webp"
          alt="Desperte Seu Potencial"
          className="absolute inset-0 h-full w-full object-cover"
        />

        {/* Overlay base - very light for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* Hover overlay - darken on hover */}
        <div className="absolute inset-0 bg-black/0 md:group-hover:bg-black/20 transition-all duration-300" />

        {/* Content positioned with space-between */}
        <div className="relative flex h-full flex-col justify-between p-5">
          {/* Top: Badges */}
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
              5 meditações
            </span>
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
              Fundamentos
            </span>
          </div>

          {/* Bottom: Title, Description, and Button */}
          <div>
            <h3 className="text-xl font-bold text-white drop-shadow-lg md:text-2xl">
              Desperte Seu Potencial
            </h3>
            <p className="mt-1 text-[13px] text-white/90 drop-shadow-md md:text-sm">
              Acesse o campo quântico e crie a realidade que você deseja viver.
            </p>

            {/* Play Button */}
            <div className="mt-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:bg-white">
              <Play className="h-4 w-4 text-[#3B1E77]" fill="currentColor" />
            </div>
          </div>
        </div>
      </button>
      </div>
    </section>
  );
}

import { Fragment } from 'react';
import { ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ProgramProgressData } from '@/hooks/useProgramProgress';

type ProgramId = ProgramProgressData['programId'];

// Metadados de apresentação por programa (título, subtítulo e capa)
const PROGRAM_META: Record<ProgramId, { title: string; subtitle: string; image: string }> = {
  intro: {
    title: 'Introdução à Meditação',
    subtitle: 'Comece sua prática',
    image: '/images/introducao-meditacao-hero.webp',
  },
  caleidoscopio: {
    title: 'Caleidoscópio Mind Movie',
    subtitle: 'Visualize seus objetivos',
    image: '/images/caleidoscopio-mind-movie.webp',
  },
  riqueza: {
    title: 'Quem Pensa Enriquece',
    subtitle: 'Transforme seu mindset',
    image: '/images/quem-pensa-enriquece.webp',
  },
  sono_protocol: {
    title: 'Protocolo do Sono',
    subtitle: 'O sono começa no cérebro',
    image: '/images/meditacoes-sono-hero.webp',
  },
  drjoe: {
    title: 'Dr. Joe Dispenza',
    subtitle: 'Desperte seu potencial',
    image: '/images/capa-dr-joe-dispenza.webp',
  },
};

const rowVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 100, damping: 22 },
  },
};

interface ContinueProgramSectionProps {
  programs: ProgramProgressData[];
  onContinue: (programId: ProgramId) => void;
}

export default function ContinueProgramSection({
  programs,
  onContinue,
}: ContinueProgramSectionProps) {
  // Só programas iniciados e ainda não concluídos — mais avançados primeiro
  const ongoing = programs
    .filter((p) => p.status === 'in_progress')
    .sort((a, b) => b.progress - a.progress);

  // Sem ação do usuário → seção não aparece
  if (ongoing.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      {/* Barra azul + título */}
      <div className="mb-5 flex items-center gap-3">
        <span
          className="flex-shrink-0 rounded-full"
          style={{
            width: '5px',
            height: 'clamp(18px, 5.6vw, 30px)',
            background: 'linear-gradient(180deg, #6EC8FF, #4BAEE8)',
          }}
        />
        <h2 className="whitespace-nowrap font-display text-[clamp(17px,5.6vw,30px)] font-extrabold leading-tight tracking-tight text-[var(--eco-text)]">
          Continue o seu programa
        </h2>
      </div>

      <motion.div
        className="flex flex-col gap-3"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        variants={{ visible: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } } }}
      >
        {ongoing.map((p) => {
          const meta = PROGRAM_META[p.programId];
          return (
            <Fragment key={p.programId}>
              <motion.button
                variants={rowVariants}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.992 }}
                onClick={() => onContinue(p.programId)}
                className="group flex w-full max-w-md items-center gap-4 rounded-[26px] p-4 text-left"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid rgba(13, 27, 42, 0.07)',
                  boxShadow: '0 4px 18px rgba(13, 27, 42, 0.05)',
                }}
              >
                {/* Thumbnail */}
                <div className="relative flex-shrink-0 h-[84px] w-[84px] overflow-hidden rounded-xl shadow-sm">
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                    style={{ backgroundImage: `url("${meta.image}")` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                </div>

                {/* Conteúdo */}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-[17px] leading-snug text-[var(--eco-text)]">
                    {meta.title}
                  </p>
                  <p className="mt-0.5 truncate text-[14px] leading-snug text-[var(--eco-muted)]">
                    {meta.subtitle}
                  </p>

                  {/* Progresso: X/Y + barra */}
                  <div className="mt-2 flex items-center gap-2">
                    <span className="flex-shrink-0 text-[12px] font-semibold tabular-nums text-[var(--eco-muted)]">
                      {p.completedSessions}/{p.totalSessions}
                    </span>
                    <div className="h-1.5 w-full max-w-[140px] overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${p.progress}%`,
                          background: 'linear-gradient(90deg, #6EC8FF, #4BAEE8)',
                        }}
                      />
                    </div>
                  </div>

                  {/* Badge PROGRAMA */}
                  <div className="mt-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F4FF] px-3 py-1.5">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#2E7FB8"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                      <span className="text-[12px] font-bold uppercase tracking-wide text-[#2E7FB8]">
                        Programa
                      </span>
                    </span>
                  </div>
                </div>

                {/* Chevron */}
                <ChevronRight
                  size={22}
                  strokeWidth={2}
                  className="flex-shrink-0 self-center transition-transform duration-200 group-hover:translate-x-0.5"
                  style={{ color: 'rgba(13, 27, 42, 0.3)' }}
                />
              </motion.button>
            </Fragment>
          );
        })}
      </motion.div>
    </section>
  );
}

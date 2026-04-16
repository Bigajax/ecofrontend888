import { useRef, useState } from 'react';
import { Lock, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface Program {
  id: string;
  label: string;
  title: string;
  image: string;
  imagePosition?: string;
  isPremium?: boolean;
}

const PROGRAMS: Program[] = [
  {
    id: 'prog_rings',
    label: 'Construa hábitos que duram',
    title: '5 Anéis da Disciplina',
    image: '/images/five-rings-visual.webp',
    imagePosition: 'center center',
    isPremium: false,
  },
  {
    id: 'prog_riqueza',
    label: 'Reprograme sua mente financeira',
    title: 'Quem Pensa Enriquece',
    image: '/images/quem-pensa-enriquece.webp',
    imagePosition: 'center center',
    isPremium: false,
  },
  {
    id: 'prog_diario',
    label: 'Sabedoria estoica diária',
    title: 'Diário Estoico',
    image: '/images/diario-estoico.webp',
    imagePosition: 'center center',
    isPremium: false,
  },
];

interface ProgramProgressEntry {
  progress: number;
  isInactive: boolean;
  isNearComplete: boolean;
}

interface SelfAssessmentSectionProps {
  onProgramClick?: (id: string) => void;
  programProgress?: Record<string, ProgramProgressEntry>;
}

export default function SelfAssessmentSection({ onProgramClick, programProgress = {} }: SelfAssessmentSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: direction === 'left' ? -320 : 320, behavior: 'smooth' });
      setTimeout(checkScroll, 100);
    }
  };

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      {/* Header */}
      <div className="mb-8 flex items-start gap-3">
        <div className="mt-1 w-1 h-7 rounded-full flex-shrink-0" style={{ background: 'linear-gradient(180deg, #6EC8FF, #4BAEE8)' }} />
        <div>
          <h2 className="font-display text-2xl font-bold text-[var(--eco-text)] md:text-3xl">
            Programas
          </h2>
          <p className="mt-1 text-[14px] text-[var(--eco-muted)]">
            Feitos para mudar algo real em você.
          </p>
        </div>
      </div>

      {/* Desktop scroll */}
      <div className="relative hidden md:block">
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-[45%] z-10 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white transition-all hover:scale-110 active:scale-95"
            style={{ border: '1px solid rgba(110,200,255,0.28)', boxShadow: '0 2px 16px rgba(110,200,255,0.18)' }}
          >
            <ChevronLeft size={20} className="text-[var(--eco-text)]" />
          </button>
        )}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-[45%] z-10 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white transition-all hover:scale-110 active:scale-95"
            style={{ border: '1px solid rgba(110,200,255,0.28)', boxShadow: '0 2px 16px rgba(110,200,255,0.18)' }}
          >
            <ChevronRight size={20} className="text-[var(--eco-text)]" />
          </button>
        )}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-5 overflow-x-auto pb-2 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {PROGRAMS.map((p, index) => (
            <motion.div
              key={p.id}
              className="flex-shrink-0"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ type: 'spring', stiffness: 80, damping: 20, delay: index * 0.08 }}
            >
              <ProgramCard
                program={p}
                onClick={() => onProgramClick?.(p.id)}
                progressEntry={programProgress[p.id]}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Mobile scroll */}
      <div className="block md:hidden">
        <div
          className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {PROGRAMS.map((p, index) => (
            <motion.div
              key={p.id}
              className="flex-shrink-0"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ type: 'spring', stiffness: 80, damping: 20, delay: index * 0.07 }}
            >
              <ProgramCard
                program={p}
                mobile
                onClick={() => onProgramClick?.(p.id)}
                progressEntry={programProgress[p.id]}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Card ───────────────────────────────────────────────────── */

interface ProgramCardProps {
  program: Program;
  mobile?: boolean;
  onClick?: () => void;
  progressEntry?: ProgramProgressEntry;
}

function ProgramCard({ program, mobile, onClick, progressEntry }: ProgramCardProps) {
  const progress = progressEntry?.progress ?? 0;
  const isInactive = progressEntry?.isInactive ?? false;
  const isNearComplete = progressEntry?.isNearComplete ?? false;
  const cardH = mobile ? '240px' : '280px';
  const cardW = mobile ? 'w-[62vw] max-w-[260px]' : 'w-[272px]';

  return (
    <button
      onClick={onClick}
      className={`group relative flex-shrink-0 overflow-hidden rounded-3xl text-left active:scale-[0.97] transition-all duration-200 ${cardW}`}
      style={{
        height: cardH,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)',
      }}
    >
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover transition-transform duration-500 group-hover:scale-105"
        style={{
          backgroundImage: `url("${program.image}")`,
          backgroundPosition: program.imagePosition || 'center',
        }}
      />

      {/* Multi-stop gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/05" />

      {/* Top row */}
      <div className="absolute top-0 left-0 right-0 flex items-start justify-between p-4">
        <span
          className="inline-flex items-center rounded-full px-2.5 py-1 backdrop-blur-md"
          style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.22)' }}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/90">
            Programa
          </span>
        </span>
        {program.isPremium && (
          <div
            className="flex items-center justify-center rounded-xl p-1.5 backdrop-blur-md"
            style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.18)' }}
          >
            <Lock size={12} className="text-white" />
          </div>
        )}
      </div>

      {/* Inactivity badge */}
      {isInactive && progress > 0 && (
        <div className="absolute top-12 left-4">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 backdrop-blur-sm"
            style={{ background: 'rgba(0,0,0,0.55)' }}
          >
            <span className="text-[10px] font-semibold text-amber-300">Jornada esperando</span>
          </span>
        </div>
      )}

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <p className="text-[12px] font-medium text-white/65 mb-1 uppercase tracking-wide">
          {program.label}
        </p>
        <h3 className="font-display text-[18px] font-bold leading-snug text-white mb-3">
          {program.title}
        </h3>

        {/* Progress */}
        {progress > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-white/70">
                {progress >= 100 ? 'Concluído' : isNearComplete ? 'Quase lá' : 'Em andamento'}
              </span>
              <span className="text-[11px] font-bold text-white/80">
                {progress >= 100 ? '✓' : `${progress}%`}
              </span>
            </div>
            <div className="h-1 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${progress}%`,
                  background: progress >= 100
                    ? '#34d399'
                    : 'linear-gradient(90deg, #a78bfa, #7c3aed)',
                }}
              />
            </div>
          </div>
        )}

        {/* CTA pill */}
        <div
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all duration-200 group-hover:scale-105"
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.25)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span className="text-[12px] font-semibold text-white">
            {progress > 0 && progress < 100 ? 'Continuar' : progress >= 100 ? 'Rever' : 'Começar'}
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  );
}

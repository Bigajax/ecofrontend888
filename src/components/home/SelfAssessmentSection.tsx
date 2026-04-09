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
    label: 'Disciplina que dura',
    title: '5 Anéis da Disciplina',
    image: '/images/five-rings-visual.webp',
    imagePosition: 'center center',
    isPremium: false,
  },
  {
    id: 'prog_riqueza',
    label: 'Pense diferente sobre dinheiro',
    title: 'Quem Pensa Enriquece',
    image: '/images/quem-pensa-enriquece.webp',
    imagePosition: 'center center',
    isPremium: false,
  },
  {
    id: 'prog_diario',
    label: 'Sabedoria estoica, todo dia',
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

  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 text-left active:scale-[0.98] transition-transform duration-150 ${
        mobile ? 'w-[62vw] max-w-[260px]' : 'w-[272px]'
      }`}
    >
      {/* Card */}
      <div className="rounded-2xl bg-white overflow-hidden mb-3"
        style={{ border: '1px solid rgba(110,200,255,0.20)', boxShadow: '0 4px 28px rgba(110,200,255,0.12)' }}>
        {/* Label area */}
        <div className="relative px-4 pt-4 pb-3">
          <p className="font-display text-[18px] font-bold leading-snug pr-10" style={{ color: '#1A5C8A' }}>
            {program.label}
          </p>
          {program.isPremium && (
            <div className="absolute top-3.5 right-3.5 flex h-9 w-9 items-center justify-center rounded-full bg-gray-200/90">
              <Lock size={15} className="text-gray-500" />
            </div>
          )}
        </div>

        {/* Image area */}
        <div className="relative h-[178px] overflow-hidden">
          <div
            className="absolute inset-0 bg-cover"
            style={{
              backgroundImage: `url("${program.image}")`,
              backgroundPosition: program.imagePosition || 'center',
            }}
          />
          {/* Bottom fade */}
          <div className="absolute bottom-0 left-0 right-0 h-14 pointer-events-none"
            style={{ background: 'linear-gradient(to top, rgba(232,244,255,0.55), transparent)' }} />

          {/* Badge de inatividade */}
          {isInactive && progress > 0 && (
            <div className="absolute top-3 left-3 right-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 backdrop-blur-sm">
                <span className="text-[10px] font-semibold text-amber-300">Sua jornada está esperando</span>
              </span>
            </div>
          )}

          {/* % + barra na base da imagem */}
          {progress > 0 && (
            <>
              <div className="absolute bottom-4 left-3">
                <span className="text-[13px] font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]">
                  {progress >= 100 ? '✓' : `${progress}%`}
                </span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/25">
                <div
                  className="h-full transition-all duration-700"
                  style={{
                    width: `${progress}%`,
                    background:
                      progress >= 100
                        ? '#34d399'
                        : 'linear-gradient(to right, #a78bfa, #7c3aed)',
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Title below card */}
      <p className="text-[15px] font-semibold text-[var(--eco-text)]">{program.title}</p>

      {/* Micro copy */}
      {progress > 0 && progress < 100 && (
        <p className="mt-0.5 text-[12px] text-[var(--eco-muted)]">
          {isNearComplete ? 'Você está quase lá' : 'Continue sua jornada'}
        </p>
      )}
      {progress >= 100 && (
        <p className="mt-0.5 text-[12px] text-emerald-600 font-medium">Programa concluído</p>
      )}
    </button>
  );
}

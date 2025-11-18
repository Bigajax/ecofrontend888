import { useEffect, useState } from 'react';
import { RINGS_ARRAY } from '@/constants/rings';
import RingIcon from './RingIcon';

interface RitualCompletionProps {
  onBackHome: () => void;
}

export default function RitualCompletion({ onBackHome }: RitualCompletionProps) {
  const [animatedRings, setAnimatedRings] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Animate rings one by one
    RINGS_ARRAY.forEach((ring, index) => {
      setTimeout(() => {
        setAnimatedRings((prev) => new Set([...prev, ring.id]));
      }, index * 150);
    });
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--eco-bg)] px-4">
      {/* Main message */}
      <div className="mb-12 text-center">
        <h1 className="font-display text-4xl font-normal text-[var(--eco-text)] md:text-5xl">
          Ritual Concluído ✅
        </h1>
        <p className="mt-4 text-lg text-[var(--eco-muted)]">
          A disciplina de amanhã começou agora.
        </p>
      </div>

      {/* Animated rings */}
      <div className="mb-12 flex justify-center gap-4">
        {RINGS_ARRAY.map((ring) => (
          <div
            key={ring.id}
            className={`transition-all duration-500 ${
              animatedRings.has(ring.id) ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
            }`}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--eco-line)] bg-white/60 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.04)] text-[var(--eco-text)]">
              <RingIcon ringId={ring.id as any} size={40} />
            </div>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="mb-12 rounded-2xl border border-[var(--eco-line)] bg-white/60 backdrop-blur-md p-8 text-center shadow-[0_4px_30px_rgba(0,0,0,0.04)] transition-all duration-300">
        <p className="text-sm text-[var(--eco-muted)]">Você completou os 5 anéis</p>
        <p className="mt-3 font-display text-3xl font-normal text-[var(--eco-user)]">
          5 de 5
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={onBackHome}
          className="rounded-lg bg-[var(--eco-user)] px-8 py-3 font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(167,132,108,0.25)] active:translate-y-0"
        >
          Voltar para os Cinco Anéis
        </button>
      </div>
    </div>
  );
}

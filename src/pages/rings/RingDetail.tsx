import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { RINGS, RINGS_ARRAY } from '@/constants/rings';
import RingIcon from '@/components/rings/RingIcon';
import HomeHeader from '@/components/home/HomeHeader';

export default function RingDetail() {
  const { ringId } = useParams<{ ringId: string }>();
  const navigate = useNavigate();

  const ring = ringId ? RINGS[ringId] : null;

  // Scroll to top when page loads or ringId changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [ringId]);

  // Get current index and navigation
  const currentIndex = RINGS_ARRAY.findIndex(r => r.id === ringId);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < RINGS_ARRAY.length - 1;

  const goToPrevious = () => {
    if (hasPrevious) {
      navigate(`/app/rings/detail/${RINGS_ARRAY[currentIndex - 1].id}`);
    }
  };

  const goToNext = () => {
    if (hasNext) {
      navigate(`/app/rings/detail/${RINGS_ARRAY[currentIndex + 1].id}`);
    }
  };

  if (!ring) {
    return (
      <div className="min-h-screen bg-white">
        <HomeHeader />
        <div className="mx-auto max-w-3xl px-4 py-8 text-center">
          <p className="text-[var(--eco-muted)]">Anel não encontrado</p>
          <button
            onClick={() => navigate('/app/rings')}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--eco-user)] px-6 py-2 font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(167,132,108,0.25)]"
          >
            Voltar para os Cinco Anéis
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-white font-primary">
      <HomeHeader />

      <div className="mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-12">
        {/* Navigation buttons */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={goToPrevious}
            disabled={!hasPrevious}
            className={`flex items-center gap-2 rounded-lg border border-[var(--eco-line)] px-4 py-2 text-[13px] font-medium transition-all duration-200 ${
              hasPrevious
                ? 'bg-white text-[var(--eco-text)] hover:bg-gray-50 active:scale-95'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <ChevronLeft size={16} />
            <span>Anterior</span>
          </button>

          <button
            onClick={() => navigate('/app/rings')}
            className="text-[13px] font-medium text-[var(--eco-user)] hover:underline"
          >
            Ver todos os anéis
          </button>

          <button
            onClick={goToNext}
            disabled={!hasNext}
            className={`flex items-center gap-2 rounded-lg border border-[var(--eco-line)] px-4 py-2 text-[13px] font-medium transition-all duration-200 ${
              hasNext
                ? 'bg-white text-[var(--eco-text)] hover:bg-gray-50 active:scale-95'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <span>Próximo</span>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Ring hero section */}
        <div className="mb-12 rounded-2xl border border-[var(--eco-line)] bg-white p-8 shadow-[0_4px_30px_rgba(0,0,0,0.04)]">
          <div className="flex items-start gap-6 md:gap-8">
            <div className="text-[var(--eco-text)]">
              <RingIcon ringId={ring.id as any} size={80} />
            </div>
            <div>
              <h1 className="font-display text-3xl font-normal text-[var(--eco-text)]">
                {ring.titlePt}
              </h1>
              <p className="mt-2 text-lg font-medium text-[var(--eco-user)]">{ring.subtitlePt}</p>
              <p className="mt-4 text-[var(--eco-muted)]">{ring.descriptionPt}</p>
              <p className="mt-4 italic text-[var(--eco-muted)]">"{ring.impactPhrase}"</p>
            </div>
          </div>
        </div>

        {/* Why it matters */}
        <div className="mb-8">
          <h2 className="mb-4 font-display text-2xl font-normal text-[var(--eco-text)]">
            Por que importa para disciplina?
          </h2>
          <div className="rounded-xl border border-[var(--eco-line)] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <p className="text-[var(--eco-muted)]">
              {ring.descriptionPt} O {ring.titlePt.toLowerCase()} é fundamental porque ajuda você a
              desenvolver consistência em todos os aspectos da vida.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRings } from '@/contexts/RingsContext';
import { RINGS } from '@/constants/rings';
import TimelineDay from '@/components/rings/TimelineDay';

type DateRange = '7' | '30' | 'all';

export default function Timeline() {
  const navigate = useNavigate();
  const { allRituals } = useRings();
  const [dateRange, setDateRange] = useState<DateRange>('7');

  const filteredRituals = useMemo(() => {
    let filtered = [...allRituals].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (dateRange === '7') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      filtered = filtered.filter((r) => new Date(r.date) >= sevenDaysAgo);
    } else if (dateRange === '30') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filtered = filtered.filter((r) => new Date(r.date) >= thirtyDaysAgo);
    }

    return filtered;
  }, [allRituals, dateRange]);

  const getFormatDatePt = (dateStr: string): string => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateStr === today.toISOString().split('T')[0]) {
      return 'Hoje';
    } else if (dateStr === yesterday.toISOString().split('T')[0]) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  };

  return (
    <div className="min-h-screen bg-[var(--eco-bg)] font-primary">
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-normal text-[var(--eco-text)]">Linha do Tempo</h1>
            <p className="mt-2 text-[var(--eco-muted)]">Releia suas reflexões e veja padrões</p>
          </div>
          <button
            onClick={() => navigate('/app/rings')}
            className="rounded-lg border border-[var(--eco-line)] bg-white/60 backdrop-blur-md px-4 py-2 text-sm font-medium text-[var(--eco-text)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
          >
            ← Voltar
          </button>
        </div>

        {/* Date filter */}
        <div className="mb-8 flex gap-2">
          {(['7', '30', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`rounded-lg px-4 py-2 font-medium transition-all duration-300 ${
                dateRange === range
                  ? 'bg-[var(--eco-user)] text-white shadow-[0_4px_20px_rgba(167,132,108,0.25)]'
                  : 'border border-[var(--eco-line)] bg-white/60 backdrop-blur-md text-[var(--eco-text)] shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)]'
              }`}
            >
              {range === '7' ? 'Últimos 7 dias' : range === '30' ? 'Últimos 30 dias' : 'Tudo'}
            </button>
          ))}
        </div>

        {/* Timeline */}
        <div className="space-y-4">
          {filteredRituals.length > 0 ? (
            filteredRituals.map((ritual) => (
              <TimelineDay
                key={ritual.id}
                ritual={ritual}
                dateFormatted={getFormatDatePt(ritual.date)}
                rings={RINGS}
              />
            ))
          ) : (
            <div className="rounded-xl border border-[var(--eco-line)] bg-white/50 p-8 text-center">
              <p className="text-[var(--eco-muted)]">Nenhum ritual encontrado neste período</p>
              <button
                onClick={() => navigate('/app/rings/ritual')}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--eco-user)] px-6 py-2 font-medium text-white transition-all hover:scale-105"
              >
                <span>Começar seu primeiro ritual</span>
                <span>→</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

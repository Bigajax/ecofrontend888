/**
 * RingsHistory - Historical view of completed rituals
 * Similar to RiquezaMentalHistory.tsx
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import * as ringsApi from '@/api/ringsApi';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DailyRitual } from '@/types/rings';
import RitualHistoryCard from './RitualHistoryCard';
import RitualDetailModal from './RitualDetailModal';

type DateRange = '7' | '30' | 'all';

export default function RingsHistory() {
  const { user } = useAuth();
  const [rituals, setRituals] = useState<DailyRitual[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRitual, setSelectedRitual] = useState<DailyRitual | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('30');

  useEffect(() => {
    async function loadHistory() {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const days = dateRange === '7' ? 7 : dateRange === '30' ? 30 : undefined;
        const startDate = days
          ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          : undefined;

        const response = await ringsApi.getRitualHistory({
          startDate,
          status: 'completed',
          includeAnswers: true,
        });

        setRituals(response.rituals);
      } catch (error) {
        console.error('Erro ao carregar histórico:', error);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [user, dateRange]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-eco-user" size={32} />
      </div>
    );
  }

  if (rituals.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-eco-muted text-lg mb-2">Nenhum ritual completado neste período</p>
        <p className="text-eco-muted text-sm">
          Complete seu primeiro ritual para ver seu histórico aqui
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date range filter */}
      <div className="flex gap-2">
        {(['7', '30', 'all'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setDateRange(range)}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
              dateRange === range
                ? 'bg-eco-user text-white shadow-[0_4px_20px_rgba(167,132,108,0.25)]'
                : 'border border-eco-line bg-white/60 backdrop-blur-md text-eco-text shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)]'
            }`}
          >
            {range === '7' ? 'Últimos 7 dias' : range === '30' ? 'Últimos 30 dias' : 'Tudo'}
          </button>
        ))}
      </div>

      {/* Ritual list */}
      <div className="space-y-3">
        {rituals.map((ritual) => (
          <RitualHistoryCard
            key={ritual.id}
            ritual={ritual}
            onViewDetails={() => setSelectedRitual(ritual)}
          />
        ))}
      </div>

      {/* Detail modal */}
      {selectedRitual && (
        <RitualDetailModal
          ritual={selectedRitual}
          onClose={() => setSelectedRitual(null)}
        />
      )}
    </div>
  );
}

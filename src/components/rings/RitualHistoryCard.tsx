/**
 * RitualHistoryCard - Compact card showing a completed ritual
 */

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronRight } from 'lucide-react';
import { RINGS_ARRAY } from '@/constants/rings';
import type { DailyRitual } from '@/types/rings';

interface RitualHistoryCardProps {
  ritual: DailyRitual;
  onViewDetails: () => void;
}

export default function RitualHistoryCard({ ritual, onViewDetails }: RitualHistoryCardProps) {
  const dateFormatted = format(new Date(ritual.date), "d 'de' MMMM, yyyy", { locale: ptBR });

  // Count answered rings
  const answeredCount = ritual.answers?.length || 0;

  return (
    <div
      onClick={onViewDetails}
      className="glass-shell rounded-xl p-4 cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="font-medium text-eco-text mb-2">{dateFormatted}</p>
          <div className="flex gap-2">
            {RINGS_ARRAY.map((ring) => {
              const isAnswered = ritual.answers?.some((a) => a.ringId === ring.id);
              return (
                <span
                  key={ring.id}
                  className={`text-xl ${isAnswered ? 'opacity-100' : 'opacity-20'}`}
                  title={ring.titlePt}
                >
                  {ring.icon}
                </span>
              );
            })}
          </div>
          {ritual.notes && (
            <p className="text-sm text-eco-muted mt-2 line-clamp-1">{ritual.notes}</p>
          )}
        </div>
        <div className="flex items-center gap-2 ml-4">
          <span className="text-xs text-eco-muted">{answeredCount}/5</span>
          <ChevronRight className="text-eco-muted" size={20} />
        </div>
      </div>
    </div>
  );
}

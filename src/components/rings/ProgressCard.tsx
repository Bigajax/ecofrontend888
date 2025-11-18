import type { Ring, DailyRitual } from '@/types/rings';
import { RINGS } from '@/constants/rings';
import RingIcon from './RingIcon';

interface ProgressCardProps {
  ring: Ring;
  allRituals: DailyRitual[];
}

export default function ProgressCard({ ring, allRituals }: ProgressCardProps) {
  const ringAnswers = allRituals
    .filter((r) => r.status === 'completed')
    .flatMap((r) => r.answers.filter((a) => a.ringId === ring.id));

  const totalResponses = ringAnswers.length;

  // Get insights based on ring type
  let insight = '';
  let metricLabel = '';
  let metricValue = '';
  let topTheme: string | null = null;

  if (ring.id === 'earth') {
    // Count focus reasons
    const focusReasons = new Map<string, number>();
    ringAnswers.forEach((a) => {
      if (a.metadata.focusReasons && a.metadata.focusReasons.length > 0) {
        const key = a.metadata.focusReasons[0];
        focusReasons.set(key, (focusReasons.get(key) || 0) + 1);
      }
    });

    const sorted = Array.from(focusReasons.entries()).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      topTheme = sorted[0][0];
      const percentage = ((sorted[0][1] / totalResponses) * 100).toFixed(0);
      insight = `"${topTheme}" apareceu em ${percentage}% dos seus dias de distração.`;
    }
    metricLabel = 'Respostas';
    metricValue = String(totalResponses);
  } else if (ring.id === 'water') {
    const adjustmentTypes = new Map<string, number>();
    ringAnswers.forEach((a) => {
      if (a.metadata.adjustmentType && a.metadata.adjustmentType.length > 0) {
        const key = a.metadata.adjustmentType[0];
        adjustmentTypes.set(key, (adjustmentTypes.get(key) || 0) + 1);
      }
    });

    const sorted = Array.from(adjustmentTypes.entries()).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      topTheme = sorted[0][0];
      insight = `Você planejou ${totalResponses} ajustes. O mais comum foi: "${topTheme}".`;
    }
    metricLabel = 'Ajustes';
    metricValue = String(totalResponses);
  } else if (ring.id === 'fire') {
    // Average intensity
    const intensities = ringAnswers
      .map((a) => a.metadata.emotionIntensity || 0)
      .filter((i) => i > 0);
    const avgIntensity = intensities.length > 0 ? (intensities.reduce((a, b) => a + b) / intensities.length).toFixed(1) : 0;

    const emotions = new Map<string, number>();
    ringAnswers.forEach((a) => {
      if (a.metadata.emotionType && a.metadata.emotionType.length > 0) {
        const key = a.metadata.emotionType[0];
        emotions.set(key, (emotions.get(key) || 0) + 1);
      }
    });

    const sorted = Array.from(emotions.entries()).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      topTheme = sorted[0][0];
      insight = `"${topTheme}" foi a emoção mais frequente. Intensidade média: ${avgIntensity}/10.`;
    }
    metricLabel = 'Emoções Processadas';
    metricValue = String(totalResponses);
  } else if (ring.id === 'wind') {
    const sources = new Map<string, number>();
    ringAnswers.forEach((a) => {
      if (a.metadata.learningSource && a.metadata.learningSource.length > 0) {
        const key = a.metadata.learningSource[0];
        sources.set(key, (sources.get(key) || 0) + 1);
      }
    });

    const sorted = Array.from(sources.entries()).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      topTheme = sorted[0][0];
      insight = `Você registrou aprendizado em ${totalResponses} dias. Origem mais comum: "${topTheme}".`;
    }
    metricLabel = 'Aprendizados';
    metricValue = String(totalResponses);
  } else if (ring.id === 'void') {
    const keywords = new Map<string, number>();
    ringAnswers.forEach((a) => {
      if (a.metadata.identityKeyword && a.metadata.identityKeyword.length > 0) {
        const key = a.metadata.identityKeyword[0];
        keywords.set(key, (keywords.get(key) || 0) + 1);
      }
    });

    const sorted = Array.from(keywords.entries()).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      topTheme = sorted[0][0];
      insight = `Identidade mais reforçada: "${topTheme}" (${sorted[0][1]} vezes).`;
    }
    metricLabel = 'Reflexões';
    metricValue = String(totalResponses);
  }

  return (
    <div className="rounded-xl border border-[var(--eco-line)] bg-white/60 backdrop-blur-md p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-[var(--eco-text)]">
            <span className="text-[var(--eco-text)]">
              <RingIcon ringId={ring.id as any} size={28} />
            </span>
            <span>{ring.titlePt}</span>
          </h3>
        </div>
        <div className="text-right">
          <p className="text-sm text-[var(--eco-muted)]">{metricLabel}</p>
          <p className="font-display text-2xl font-normal text-[var(--eco-user)]">
            {metricValue}
          </p>
        </div>
      </div>

      {insight && (
        <p className="mt-4 rounded-lg border border-[var(--eco-line)] bg-white/60 backdrop-blur-md p-3 text-sm text-[var(--eco-text)] shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
          {insight}
        </p>
      )}

      {totalResponses === 0 && (
        <p className="mt-4 text-sm text-[var(--eco-muted)]">Comece a fazer rituais para ver seu progresso neste anel.</p>
      )}
    </div>
  );
}

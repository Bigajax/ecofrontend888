import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProgram } from '@/contexts/ProgramContext';

export interface ProgramProgressData {
  programId: 'intro' | 'caleidoscopio' | 'riqueza' | 'sono_protocol';
  completedSessions: number;
  totalSessions: number;
  progress: number;        // 0–100 rounded
  status: 'not_started' | 'in_progress' | 'completed';
  isInactive: boolean;     // true if 2+ days without activity AND progress > 0
  isNearComplete: boolean; // true if progress >= 80
}

function getDaysSince(isoString: string | null): number {
  if (!isoString) return Infinity;
  const ms = Date.now() - new Date(isoString).getTime();
  return ms / (1000 * 60 * 60 * 24);
}

export function useProgramProgress(): ProgramProgressData[] {
  const { user } = useAuth();
  const { ongoingProgram } = useProgram();
  const uid = user?.id || 'guest';

  return useMemo(() => {
    const results: ProgramProgressData[] = [];

    // ── Introdução à Meditação ─────────────────────────────────────────────
    const introTotal = 5;
    let introCompleted = 0;
    try {
      const raw = localStorage.getItem(`eco.introducao.meditations.v2.${uid}`);
      if (raw) {
        const arr: { completed: boolean }[] = JSON.parse(raw);
        introCompleted = arr.filter(m => m.completed).length;
      }
    } catch {/* ignore parse errors */}
    const introPct = Math.round((introCompleted / introTotal) * 100);
    const introLastActive = localStorage.getItem(`eco.program.lastActive.intro.${uid}`);
    results.push({
      programId: 'intro',
      completedSessions: introCompleted,
      totalSessions: introTotal,
      progress: introPct,
      status: introPct === 0 ? 'not_started' : introPct === 100 ? 'completed' : 'in_progress',
      isInactive: introPct > 0 && getDaysSince(introLastActive) >= 2,
      isNearComplete: introPct >= 80,
    });

    // ── Caleidoscópio Mind Movie ───────────────────────────────────────────
    const calTotal = 2;
    let calCompleted = 0;
    try {
      const raw = localStorage.getItem(`eco.caleidoscopio.completed.v1.${uid}`);
      if (raw) {
        const arr: string[] = JSON.parse(raw);
        calCompleted = arr.length;
      }
    } catch {/* ignore parse errors */}
    const calPct = Math.round((calCompleted / calTotal) * 100);
    const calLastActive = localStorage.getItem(`eco.program.lastActive.caleidoscopio.${uid}`);
    results.push({
      programId: 'caleidoscopio',
      completedSessions: calCompleted,
      totalSessions: calTotal,
      progress: calPct,
      status: calPct === 0 ? 'not_started' : calPct === 100 ? 'completed' : 'in_progress',
      isInactive: calPct > 0 && getDaysSince(calLastActive) >= 2,
      isNearComplete: calPct >= 80,
    });

    // ── Quem Pensa Enriquece (via ProgramContext) ──────────────────────────
    const riquezaTotal = 6;
    let riquezaPct = 0;
    let riquezaLastActive: string | null = null;
    if (ongoingProgram && (ongoingProgram.id === 'rec_2' || ongoingProgram.id === 'blessing_9')) {
      riquezaPct = Math.min(100, Math.max(0, Math.round(ongoingProgram.progress)));
      riquezaLastActive = ongoingProgram.lastAccessedAt;
    }
    const riquezaCompleted = Math.round((riquezaPct / 100) * riquezaTotal);
    results.push({
      programId: 'riqueza',
      completedSessions: riquezaCompleted,
      totalSessions: riquezaTotal,
      progress: riquezaPct,
      status: riquezaPct === 0 ? 'not_started' : riquezaPct === 100 ? 'completed' : 'in_progress',
      isInactive: riquezaPct > 0 && getDaysSince(riquezaLastActive) >= 2,
      isNearComplete: riquezaPct >= 80,
    });

    // ── Protocolo Sono Profundo ────────────────────────────────────────────
    const sonoTotal = 7;
    let sonoCompleted = 0;
    try {
      const raw = localStorage.getItem(`eco.sono.protocol.v1.${uid}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        sonoCompleted = (parsed.completedNights as number[])?.length || 0;
      }
    } catch {/* ignore */}
    const sonoPct = Math.round((sonoCompleted / sonoTotal) * 100);
    const sonoLastActive = (() => {
      try {
        const raw = localStorage.getItem(`eco.sono.protocol.v1.${uid}`);
        return raw ? JSON.parse(raw).lastActive : null;
      } catch { return null; }
    })();
    results.push({
      programId: 'sono_protocol',
      completedSessions: sonoCompleted,
      totalSessions: sonoTotal,
      progress: sonoPct,
      status: sonoPct === 0 ? 'not_started' : sonoPct === 100 ? 'completed' : 'in_progress',
      isInactive: sonoPct > 0 && getDaysSince(sonoLastActive) >= 2,
      isNearComplete: sonoPct >= 80,
    });

    return results;
  }, [uid, ongoingProgram]);
}

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { RitualProgressStatus } from '@/lib/mixpanelRitualEvents';

/**
 * Estado do "Ritual Boa Noite" (app logado) — camada diária sobre a sequência de
 * 7 noites. Reaproveita o mesmo store de progresso do módulo
 * (`eco.sono.protocol.v1.${uid}` = { completedNights: number[] }) e adiciona um
 * marcador diário (`eco.ritual.lastCompletedDate.${uid}` = YYYY-MM-DD) para os
 * estados "concluído por hoje".
 *
 * localStorage é a fonte rápida/offline; `user_ritual_progress` (Supabase) guarda
 * o progresso cross-device (escrita direta, protegida por RLS). Tudo non-fatal:
 * se a tabela ainda não existir, o módulo segue funcionando só com localStorage.
 */

const RITUAL_ID = 'ritual_boa_noite';
const TOTAL_NIGHTS = 7;

const protocolKey = (uid: string) => `eco.sono.protocol.v1.${uid}`;
const dailyKey = (uid: string) => `eco.ritual.lastCompletedDate.${uid}`;

function todayStr(): string {
  // YYYY-MM-DD em horário local (o "hoje" do usuário)
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isRealUser(uid: string | null | undefined): uid is string {
  return Boolean(uid) && uid !== 'guest';
}

export function getCompletedCount(uid: string): number {
  try {
    const raw = localStorage.getItem(protocolKey(uid));
    if (!raw) return 0;
    const arr = JSON.parse(raw).completedNights;
    return Array.isArray(arr) ? new Set<number>(arr).size : 0;
  } catch {
    return 0;
  }
}

function getLastCompletedDate(uid: string): string | null {
  try {
    return localStorage.getItem(dailyKey(uid));
  } catch {
    return null;
  }
}

/** Concluiu alguma noite hoje? (marcador diário) */
export function isRitualCompletedToday(uid: string): boolean {
  return getLastCompletedDate(uid) === todayStr();
}

export interface RitualProgress {
  completedCount: number;
  nextNight: number;
  completedToday: boolean;
  status: RitualProgressStatus;
}

export function computeRitualProgress(uid: string): RitualProgress {
  const completedCount = getCompletedCount(uid);
  const completedToday = getLastCompletedDate(uid) === todayStr();
  const nextNight = Math.min(completedCount + 1, TOTAL_NIGHTS);
  let status: RitualProgressStatus;
  if (completedCount >= TOTAL_NIGHTS) status = 'all_done';
  else if (completedCount === 0) status = 'new';
  else if (completedToday) status = 'completed_today';
  else status = 'in_progress';
  return { completedCount, nextNight, completedToday, status };
}

/** Upsert direto no Supabase (cross-device). Non-fatal; só p/ usuário real. */
async function pushServerProgress(uid: string, completedCount: number, firstEver: boolean): Promise<void> {
  if (!isRealUser(uid)) return;
  const nowIso = new Date().toISOString();
  try {
    await supabase.from('user_ritual_progress').upsert(
      {
        user_id: uid,
        ritual_id: RITUAL_ID,
        current_step: completedCount,
        current_night: Math.min(completedCount + 1, TOTAL_NIGHTS),
        status: completedCount >= TOTAL_NIGHTS ? 'completed' : 'in_progress',
        completed_at: nowIso,
        last_accessed_at: nowIso,
        ...(firstEver ? { started_at: nowIso } : {}),
      },
      { onConflict: 'user_id,ritual_id' },
    );
  } catch {
    // tabela pode não existir ainda / offline — segue com localStorage
  }
}

/** Lê o progresso do servidor; usado p/ hidratar cross-device. */
async function fetchServerProgress(uid: string): Promise<number | null> {
  if (!isRealUser(uid)) return null;
  try {
    const { data, error } = await supabase
      .from('user_ritual_progress')
      .select('current_step')
      .eq('user_id', uid)
      .eq('ritual_id', RITUAL_ID)
      .maybeSingle();
    if (error || !data) return null;
    return typeof data.current_step === 'number' ? data.current_step : null;
  } catch {
    return null;
  }
}

/**
 * Marca uma noite como concluída: grava o set local, o marcador diário e faz
 * upsert no Supabase. Retorna o novo total. Idempotente por noite.
 */
export function markRitualNightCompleted(uid: string, night: number): number {
  let next = new Set<number>();
  let prevCount = 0;
  try {
    const raw = localStorage.getItem(protocolKey(uid));
    const arr = raw ? JSON.parse(raw).completedNights : [];
    next = new Set<number>(Array.isArray(arr) ? arr : []);
    prevCount = next.size;
    next.add(night);
    localStorage.setItem(
      protocolKey(uid),
      JSON.stringify({ completedNights: [...next], lastActive: new Date().toISOString() }),
    );
    localStorage.setItem(dailyKey(uid), todayStr());
  } catch {
    // localStorage indisponível — ainda tenta o servidor
  }
  void pushServerProgress(uid, next.size, prevCount === 0);
  return next.size;
}

/**
 * Hook de leitura (home/card). Lê o localStorage na montagem, hidrata do servidor
 * (cross-device) e re-lê em foco/visibilitychange. Não possui o store — apenas
 * reflete o que `markRitualNightCompleted` grava.
 */
export function useRitualProgress(uid: string): RitualProgress {
  const [progress, setProgress] = useState<RitualProgress>(() => computeRitualProgress(uid));

  const refresh = useCallback(() => setProgress(computeRitualProgress(uid)), [uid]);

  useEffect(() => {
    refresh();
    let cancelled = false;
    // hidrata cross-device: se o servidor tem mais progresso que o local, sobe o set local
    void fetchServerProgress(uid).then((serverStep) => {
      if (cancelled || serverStep == null) return;
      const localCount = getCompletedCount(uid);
      if (serverStep > localCount) {
        try {
          const merged = Array.from({ length: serverStep }, (_, i) => i + 1);
          localStorage.setItem(
            protocolKey(uid),
            JSON.stringify({ completedNights: merged, lastActive: new Date().toISOString() }),
          );
        } catch {
          /* ignore */
        }
        refresh();
      }
    });

    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [uid, refresh]);

  return progress;
}

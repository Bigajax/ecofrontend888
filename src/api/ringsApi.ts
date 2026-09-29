/**
 * Cinco Anéis no servidor (set/2026): o dia inteiro num POST só.
 * O servidor fecha o dia por (usuário, data) e guarda a resposta por anel;
 * repetir não duplica. Antes eram oito rotas, um id gerado no aparelho que o
 * servidor não conhecia e a exigência das 5 respostas: nada salvava.
 */

import { supabase } from '@/lib/supabaseClient';
import type { DailyRitual, RingType } from '@/types/rings';

function base(): string {
  return import.meta.env.PROD ? '' : import.meta.env.VITE_API_URL || 'https://ecobackend888.onrender.com';
}

async function chamar<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Não autenticado');
  const r = await fetch(`${base()}/api/rings${caminho}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init.headers },
  });
  if (!r.ok) {
    const erro = await r.json().catch(() => ({}));
    throw new Error(erro.message || erro.error || `Erro ${r.status}`);
  }
  return r.json();
}

export function salvarDia(dia: { date: string; ringId: RingType; answer: string; metadata?: unknown }) {
  return chamar<{ success: boolean; ritual: DailyRitual }>('/dia', { method: 'POST', body: JSON.stringify(dia) });
}

export function historico(limit = 100) {
  return chamar<{ rituals: DailyRitual[] }>(`/history?limit=${limit}`);
}

export function migrar(rituals: DailyRitual[]) {
  return chamar<{ success: boolean; migratedCount: number }>('/migrate', {
    method: 'POST',
    body: JSON.stringify({ rituals }),
  });
}

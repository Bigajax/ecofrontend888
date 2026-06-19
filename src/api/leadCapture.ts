import { apiUrl } from '@/config/apiBase';

// Captura de lead do gate do /sono (antes de provisionar a conta). Persiste o
// e-mail no backend (`POST /api/leads/sono-gate`, tabela `sono_leads`, escrita
// via service role) ANTES do register()/OAuth — assim o lead não se perde mesmo
// quando a criação de conta falha. Fire-and-forget: nunca lança. Em falha de
// rede, enfileira para replay no próximo boot (replayPendingLeads).

const ENDPOINT = '/api/leads/sono-gate';
export const PENDING_LEADS_KEY = 'eco.lead.pending';

export interface LeadInput {
  email: string;
  source: string;
  provider: 'email' | 'google';
}

function resolveGuestId(): string {
  try {
    return (
      sessionStorage.getItem('eco.sono.guest_id') ||
      localStorage.getItem('eco_guest_id') ||
      ''
    );
  } catch {
    return '';
  }
}

function readQueue(): LeadInput[] {
  try {
    const raw = localStorage.getItem(PENDING_LEADS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: LeadInput[]): void {
  try {
    if (queue.length === 0) localStorage.removeItem(PENDING_LEADS_KEY);
    else localStorage.setItem(PENDING_LEADS_KEY, JSON.stringify(queue));
  } catch {
    // localStorage indisponível — desiste do backstop silenciosamente
  }
}

function enqueue(input: LeadInput): void {
  const queue = readQueue();
  queue.push(input);
  writeQueue(queue);
}

async function postLead(input: LeadInput): Promise<boolean> {
  const res = await fetch(apiUrl(ENDPOINT), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...input, guestId: resolveGuestId() }),
  });
  return res.ok;
}

/**
 * Salva o lead. Nunca lança. Em falha de REDE (não em 4xx, que não melhora com
 * retry), enfileira para reenvio no próximo carregamento.
 */
export async function captureLead(input: LeadInput): Promise<void> {
  try {
    await postLead(input);
  } catch {
    enqueue(input);
  }
}

/** Reenvia leads que ficaram pendentes (rede caiu no 1º envio). */
export async function replayPendingLeads(): Promise<void> {
  const queue = readQueue();
  if (queue.length === 0) return;

  const remaining: LeadInput[] = [];
  for (const item of queue) {
    try {
      const ok = await postLead(item);
      if (!ok) remaining.push(item);
    } catch {
      remaining.push(item);
    }
  }
  writeQueue(remaining);
}

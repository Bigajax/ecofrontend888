export interface GuestLeadData {
  contact: string;
  type: 'whatsapp' | 'email';
  preferredTime?: string;
  source: 'noite1_post_meditation';
}

const STORAGE_KEY = 'eco.sono.guest.lead';

/**
 * Submits a guest lead for the Noite 1 conversion flow.
 *
 * Strategy:
 * 1. Save to localStorage immediately — never blocks UX.
 * 2. POST to backend in the background (fire-and-forget).
 *    Backend endpoint `POST /api/guest/lead` stores in Supabase `guest_leads`
 *    and queues follow-up messages. If the endpoint is not yet deployed,
 *    the localStorage copy ensures the data is not lost.
 */
export async function submitGuestLead(data: GuestLeadData): Promise<void> {
  // 1. Persist locally first
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...data, savedAt: Date.now() })
    );
  } catch {
    // Storage unavailable — continue silently
  }

  // 2. Fire-and-forget to backend
  fetch('/api/guest/lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).catch(() => {
    // Backend not ready — localStorage has the data
  });
}

export function getStoredLead(): GuestLeadData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GuestLeadData) : null;
  } catch {
    return null;
  }
}

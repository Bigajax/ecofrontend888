/**
 * API client for Five Rings ritual management
 * Follows the same pattern as programsApi.ts
 */

import { supabase } from '@/lib/supabaseClient';
import type { DailyRitual, RingType, RingResponse } from '@/types/rings';

/**
 * Get API base URL
 * In production (Vercel), use proxy. In development, use direct backend URL.
 */
function getApiBaseUrl(): string {
  if (import.meta.env.PROD) {
    return ''; // Use Vercel proxy
  }
  return import.meta.env.VITE_API_URL || 'https://ecobackend888.onrender.com';
}

/**
 * Get access token from Supabase session
 */
async function getAccessToken(): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    throw new Error('Não autenticado');
  }

  return session.access_token;
}

/**
 * Make authenticated API request
 */
async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/rings${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(error.message || error.error || 'Erro na requisição');
  }

  return response.json();
}

// =================== API ENDPOINTS ===================

/**
 * POST /api/rings/start
 * Start a new daily ritual or resume existing one
 */
export async function startRitual(data?: { date?: string; notes?: string }) {
  return fetchAPI('/start', {
    method: 'POST',
    body: JSON.stringify(data || {}),
  });
}

/**
 * POST /api/rings/:ritualId/answer
 * Save or update a ring answer
 */
export async function saveRingAnswer(
  ritualId: string,
  data: { ringId: RingType; answer: string; metadata: RingResponse }
) {
  return fetchAPI(`/${ritualId}/answer`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * POST /api/rings/:ritualId/complete
 * Mark ritual as completed
 */
export async function completeRitual(ritualId: string, notes?: string) {
  return fetchAPI(`/${ritualId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
}

/**
 * GET /api/rings/history
 * Get ritual history with filters and pagination
 */
export async function getRitualHistory(params?: {
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  status?: string;
  includeAnswers?: boolean;
}) {
  const queryParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });
  }

  const queryString = queryParams.toString();
  const endpoint = queryString ? `/history?${queryString}` : '/history';

  return fetchAPI(endpoint, { method: 'GET' });
}

/**
 * GET /api/rings/ritual/:ritualId
 * Get ritual details with all answers
 */
export async function getRitualDetails(ritualId: string) {
  return fetchAPI(`/ritual/${ritualId}`, { method: 'GET' });
}

/**
 * GET /api/rings/progress
 * Get user progress and statistics
 */
export async function getProgress(forceRecalculate?: boolean) {
  const endpoint = forceRecalculate ? '/progress?forceRecalculate=true' : '/progress';
  return fetchAPI(endpoint, { method: 'GET' });
}

/**
 * POST /api/rings/:ritualId/abandon
 * Mark ritual as abandoned
 */
export async function abandonRitual(ritualId: string) {
  return fetchAPI(`/${ritualId}/abandon`, { method: 'POST' });
}

/**
 * POST /api/rings/migrate
 * Migrate rituals from localStorage to backend
 */
export async function migrateFromLocalStorage(data: { rituals: DailyRitual[] }) {
  return fetchAPI('/migrate', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

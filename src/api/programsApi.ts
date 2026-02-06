/**
 * API client for program enrollment and progress
 */

import { supabase } from '@/lib/supabaseClient';

/**
 * Get API base URL
 * In development, try proxy first. If proxy fails, fallback to direct backend URL
 */
function getApiBaseUrl(): string {
  // In production (Vercel), always use proxy
  if (import.meta.env.PROD) {
    return '';
  }

  // In development, use direct backend URL to bypass Vite proxy issues
  // The backend already has CORS configured for localhost:5173
  return import.meta.env.VITE_API_URL || 'https://ecobackend888.onrender.com';
}

interface StartProgramRequest {
  programId: string;
  title: string;
  description?: string;
  duration?: string;
  deviceInfo?: Record<string, any>;
}

interface StartProgramResponse {
  enrollmentId: string;
  programId: string;
  progress: number;
  currentStep: number;
  currentLesson: string;
  startedAt: string;
  lastAccessedAt?: string;
  status: string;
  resuming?: boolean;
}

interface EnrollmentData {
  enrollmentId: string;
  programId: string;
  progress: number;
  currentStep: number;
  currentLesson: string;
  answers: Record<string, any>;
  startedAt: string;
  lastAccessedAt: string;
  completedAt: string | null;
  status: string;
}

interface UpdateProgressRequest {
  progress: number;
  currentStep: number;
  currentLesson: string;
}

interface SaveAnswersRequest {
  stepNumber: number;
  answers: Record<string, any>;
}

/**
 * Get access token from Supabase
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
  const url = `${baseUrl}/api/programs${endpoint}`;

  console.log('[programsApi] Making request to:', url);

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
    console.error('[programsApi] Request failed:', { url, status: response.status, error });
    throw new Error(error.message || error.error || 'Erro na requisição');
  }

  console.log('[programsApi] Request successful:', url);
  return response.json();
}

/**
 * Start a new program or resume existing enrollment
 */
export async function startProgram(
  data: StartProgramRequest
): Promise<StartProgramResponse> {
  return fetchAPI<StartProgramResponse>('/start', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get enrollment details with answers
 */
export async function getEnrollment(
  enrollmentId: string
): Promise<EnrollmentData> {
  return fetchAPI<EnrollmentData>(`/${enrollmentId}`, {
    method: 'GET',
  });
}

/**
 * Update program progress
 */
export async function updateProgress(
  enrollmentId: string,
  data: UpdateProgressRequest
): Promise<{ success: boolean }> {
  return fetchAPI<{ success: boolean }>(`/${enrollmentId}/progress`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Save step answers (auto-save)
 */
export async function saveAnswers(
  enrollmentId: string,
  data: SaveAnswersRequest
): Promise<{ success: boolean; saved: boolean }> {
  return fetchAPI<{ success: boolean; saved: boolean }>(`/${enrollmentId}/answers`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Complete program
 */
export async function completeProgram(
  enrollmentId: string
): Promise<{ success: boolean; status: string }> {
  return fetchAPI<{ success: boolean; status: string }>(`/${enrollmentId}/complete`, {
    method: 'POST',
  });
}

/**
 * Abandon program
 */
export async function abandonProgram(
  enrollmentId: string
): Promise<{ success: boolean }> {
  return fetchAPI<{ success: boolean }>(`/${enrollmentId}/abandon`, {
    method: 'POST',
  });
}

/**
 * Get user enrollment history
 */
export async function getUserHistory(): Promise<{
  enrollments: Array<{
    enrollmentId: string;
    programId: string;
    status: string;
    progress: number;
    currentStep: number;
    startedAt: string;
    completedAt: string | null;
    lastAccessedAt: string;
  }>;
}> {
  return fetchAPI<any>('/user/history', {
    method: 'GET',
  });
}

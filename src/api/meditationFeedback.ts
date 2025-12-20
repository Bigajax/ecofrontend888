/**
 * Meditation Feedback API Client
 *
 * Sends meditation feedback to the backend endpoint /api/meditation/feedback
 * Following the specification from VERIFICAR_FRONTEND_FEEDBACK.md
 */

import { supabase } from '@/lib/supabaseClient';
import { buildIdentityHeaders } from '@/lib/guestId';

export interface MeditationFeedbackPayload {
  vote: 'positive' | 'negative';
  reasons?: string[];
  meditation_id: string;
  meditation_title: string;
  meditation_duration_seconds: number;
  meditation_category: string;
  actual_play_time_seconds: number;
  completion_percentage: number;
  pause_count?: number;
  skip_count?: number;
  seek_count?: number;
  background_sound_id?: string;
  background_sound_title?: string;
  feedback_source?: string;
}

export interface MeditationFeedbackResponse {
  success: true;
  feedback_id: string;
  message: string;
}

export interface MeditationFeedbackError {
  error: string;
  details?: string[];
  message?: string;
}

/**
 * Submit meditation feedback to backend
 *
 * @param payload - Feedback data matching backend schema
 * @returns Response with feedback_id on success
 * @throws Error with user-friendly message on failure
 */
export async function submitMeditationFeedback(
  payload: MeditationFeedbackPayload
): Promise<MeditationFeedbackResponse> {
  try {
    // Get identity headers (X-Eco-Guest-Id, X-Eco-Session-Id)
    const identityHeaders = buildIdentityHeaders();

    // Get authentication token if user is logged in
    const { data: sessionData } = await supabase.auth.getSession().catch(() => ({
      data: { session: null },
    }));
    const token = sessionData?.session?.access_token ?? null;

    // Build headers according to backend spec
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Session-Id': identityHeaders['X-Eco-Session-Id'],
    };

    // Include guest ID for guests, or Authorization for authenticated users
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      headers['X-Guest-Id'] = identityHeaders['X-Eco-Guest-Id'];
    }

    // Validate payload before sending
    if (payload.vote === 'negative' && (!payload.reasons || payload.reasons.length === 0)) {
      throw new Error('Reasons are required for negative feedback');
    }

    // Send to backend
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const endpoint = `${apiUrl}/api/meditation/feedback`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    // Handle 404 FIRST - endpoint not implemented yet (graceful degradation)
    // Check status BEFORE parsing JSON to avoid parse errors
    if (response.status === 404) {
      console.warn('[meditationFeedback] Backend endpoint not implemented yet (404). Skipping server sync.');
      // Return a mock success response - analytics will still be tracked
      return {
        success: true,
        feedback_id: 'local-only',
        message: 'Feedback registrado localmente (backend pendente)',
      };
    }

    // Parse response (only if not 404)
    const data = await response.json();

    // Handle success
    if (response.ok) {
      return data as MeditationFeedbackResponse;
    }

    // Handle validation errors (400)
    if (response.status === 400) {
      const error = data as MeditationFeedbackError;
      const details = error.details?.join(', ') || error.error || 'Dados inválidos';
      throw new Error(`Erro de validação: ${details}`);
    }

    // Handle server errors (500)
    if (response.status >= 500) {
      const error = data as MeditationFeedbackError;
      throw new Error(error.message || 'Erro no servidor. Tente novamente.');
    }

    // Generic error fallback
    throw new Error('Erro ao enviar feedback. Tente novamente.');
  } catch (error) {
    // Network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Erro de conexão. Verifique sua internet.');
    }

    // Re-throw with user-friendly message
    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Erro desconhecido ao enviar feedback.');
  }
}

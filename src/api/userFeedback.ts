/**
 * User Feedback API Client
 *
 * Handles sending general user feedback (suggestions, bugs, etc.) to the backend.
 * Different from interaction feedback (thumbs up/down on messages).
 */

import { apiFetchJson } from './apiFetch';
import type { FeedbackFormData, FeedbackResponse } from '@/types/feedback';
import { getOrCreateGuestId } from '@/utils/identity';

/**
 * Submit user feedback to the backend
 */
export async function submitUserFeedback(
  data: FeedbackFormData
): Promise<FeedbackResponse> {
  try {
    const guestId = getOrCreateGuestId();
    const sessionId = sessionStorage.getItem('eco.sessionId') || undefined;

    const payload = {
      ...data,
      guestId,
      sessionId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };

    const response = await apiFetchJson<FeedbackResponse>('/api/user-feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return response;
  } catch (error) {
    console.error('Failed to submit user feedback:', error);
    throw new Error('Falha ao enviar feedback. Por favor, tente novamente.');
  }
}

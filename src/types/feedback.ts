/**
 * Feedback Types
 *
 * Types for the user feedback system.
 * Feedback is collected from users and saved to the database.
 */

export interface FeedbackFormData {
  message: string;
  category?: 'bug' | 'feature' | 'improvement' | 'other';
  page?: string;
  userAgent?: string;
}

export interface FeedbackSubmission extends FeedbackFormData {
  userId?: string;
  guestId?: string;
  sessionId?: string;
  timestamp: string;
}

export interface FeedbackResponse {
  success: boolean;
  feedbackId?: string;
  message: string;
}

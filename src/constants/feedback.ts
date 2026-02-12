export const DEFAULT_FEEDBACK_PILLAR = "geral";

/**
 * Feedback reasons for negative feedback
 * Moved from FeedbackPrompt.tsx to allow lazy loading
 */
export const FEEDBACK_REASONS = [
  { key: "too_long", label: "Muito longo" },
  { key: "off_topic", label: "Fora do tema" },
  { key: "shallow", label: "Raso" },
  { key: "tone", label: "Tom inadequado" },
  { key: "other", label: "Outro" },
] as const;

export type FeedbackReasonKey = (typeof FEEDBACK_REASONS)[number]["key"];

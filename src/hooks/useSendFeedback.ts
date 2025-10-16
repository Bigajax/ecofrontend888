import { useCallback, useRef } from "react";

import { enviarFeedback } from "../api/feedbackApi";

export type SendFeedbackArgs = {
  interactionId: string;
  vote: "up" | "down";
  reason?: string | null;
  source?: string | null;
  userId?: string | null;
  sessionId?: string | null;
  meta?: Record<string, unknown>;
};

export function useSendFeedback() {
  const lockRef = useRef(false);

  const sendFeedback = useCallback(
    async (args: SendFeedbackArgs) => {
      if (lockRef.current) {
        return false;
      }
      lockRef.current = true;

      try {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            await enviarFeedback({
              interactionId: args.interactionId,
              vote: args.vote,
              reason: args.reason ?? null,
              source: args.source ?? "chat",
              userId: args.userId ?? null,
              sessionId: args.sessionId ?? null,
              meta: args.meta ?? {},
            });
            return true;
          } catch (error) {
            const isNetworkError = error instanceof TypeError;
            const canRetry = isNetworkError && attempt === 0;
            if (!canRetry) {
              throw error;
            }
          }
        }
        return false;
      } finally {
        lockRef.current = false;
      }
    },
    [],
  );

  return { sendFeedback };
}

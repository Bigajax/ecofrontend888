import { useCallback, useRef } from "react";

import {
  sendFeedback as requestFeedback,
  type SendFeedbackInput,
  type SendFeedbackResult,
} from "../api/feedback";
import { DEFAULT_FEEDBACK_PILLAR } from "../constants/feedback";

export type SendFeedbackArgs = {
  interactionId: string;
  vote: "up" | "down";
  reason?: string | null;
  source?: string | null;
  userId?: string | null;
  sessionId?: string | null;
  meta?: Record<string, unknown>;
  messageId?: string | null;
  pillar?: string | null;
  arm?: string | null;
};

const toPayload = (args: SendFeedbackArgs): SendFeedbackInput => ({
  interaction_id: args.interactionId,
  vote: args.vote,
  reason: args.reason ?? null,
  source: args.source ?? "api",
  user_id: args.userId ?? null,
  session_id: args.sessionId ?? null,
  meta: args.meta ?? {},
  message_id: args.messageId ?? null,
  pillar: args.pillar ?? DEFAULT_FEEDBACK_PILLAR,
  arm: args.arm ?? null,
});

export function useSendFeedback() {
  const lockRef = useRef(false);

  const sendFeedback = useCallback(
    async (args: SendFeedbackArgs): Promise<SendFeedbackResult | null> => {
      if (lockRef.current) {
        return null;
      }
      lockRef.current = true;

      try {
        const payload = toPayload(args);
        const result = await requestFeedback(payload);
        return result;
      } finally {
        lockRef.current = false;
      }
    },
    [],
  );

  return { sendFeedback };
}

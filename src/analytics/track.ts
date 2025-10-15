import mixpanelInstance from "../lib/mixpanel";
import { getSessionId, getUserIdFromStore } from "../utils/identity";

type TrackProps = Record<string, unknown> | undefined;

export function track(name: string, props?: TrackProps) {
  if (!name) return;
  try {
    const trackFn = (mixpanelInstance as unknown as { track?: typeof mixpanelInstance.track }).track;
    if (typeof trackFn === "function") {
      trackFn.call(mixpanelInstance, name, props);
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("Mixpanel track error", error);
    }
  }
}

export type FeedbackTrackingPayload = {
  message_id?: string;
  user_id?: string | null;
  session_id?: string | null;
  source?: string;
  reasons?: string[];
} & Record<string, unknown>;

const resolveIdentity = <T extends FeedbackTrackingPayload>(payload: T) => {
  const userId = payload.user_id ?? getUserIdFromStore();
  const sessionId = payload.session_id ?? getSessionId();
  return {
    ...payload,
    user_id: userId ?? undefined,
    session_id: sessionId ?? undefined,
  };
};

export function trackFeedbackEvent(name: string, payload: FeedbackTrackingPayload) {
  if (!payload) return;
  if (!payload.message_id && !payload.session_id && !payload.user_id) {
    return;
  }
  const enriched = resolveIdentity(payload);
  track(name, enriched);
}

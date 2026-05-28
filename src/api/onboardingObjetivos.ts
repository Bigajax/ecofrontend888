// src/api/onboardingObjetivos.ts

import { apiUrl } from "@/config/apiBase";
import { getOrCreateGuestId } from "@/utils/identity";
import type { GoalId } from "@/components/assinar/goalsData";

interface SaveInput {
  answers: GoalId[];
  skipped: boolean;
}

interface SaveResult {
  id: string;
}

const TIMEOUT_MS = 8000;

function withTimeout(signal?: AbortSignal): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  if (signal) {
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return { signal: controller.signal, cleanup: () => clearTimeout(t) };
}

export async function saveObjetivos(input: SaveInput): Promise<SaveResult | null> {
  const { signal, cleanup } = withTimeout();
  try {
    const res = await fetch(apiUrl("/api/quiz/response"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-eco-guest-id": getOrCreateGuestId(),
      },
      body: JSON.stringify({
        quiz_source: "onboarding_objetivos",
        answers: [{ question: "objetivos", answer: input.answers }],
        skipped: input.skipped,
      }),
      signal,
    });
    if (!res.ok) return null;
    const body = (await res.json()) as SaveResult;
    if (!body?.id) return null;
    return { id: body.id };
  } catch {
    return null;
  } finally {
    cleanup();
  }
}

export async function linkUserToObjetivos(responseId: string, jwt: string): Promise<boolean> {
  const { signal, cleanup } = withTimeout();
  try {
    const res = await fetch(apiUrl(`/api/quiz/response/${encodeURIComponent(responseId)}/link-user`), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    cleanup();
  }
}

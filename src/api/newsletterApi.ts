import { apiFetchJson } from "@/lib/apiFetch";

export type NewsletterSubscribeResult =
  | { ok: true; already?: boolean }
  | { ok: false; code: "INVALID_EMAIL" | "NETWORK"; message: string };

interface UtmParams {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

interface SubscribePayload {
  email: string;
  source?: string;
  utm?: UtmParams;
}

const readUtmFromUrl = (): UtmParams | undefined => {
  if (typeof window === "undefined") return undefined;
  const params = new URLSearchParams(window.location.search);
  const utm: UtmParams = {};
  const keys = ["source", "medium", "campaign", "term", "content"] as const;
  for (const k of keys) {
    const v = params.get(`utm_${k}`);
    if (v) utm[k] = v;
  }
  return Object.keys(utm).length ? utm : undefined;
};

export async function subscribeNewsletter(
  payload: SubscribePayload,
): Promise<NewsletterSubscribeResult> {
  const body = {
    email: payload.email,
    source: payload.source ?? "newsletter_footer",
    utm: payload.utm ?? readUtmFromUrl(),
    landing_path: typeof window !== "undefined" ? window.location.pathname : null,
    referrer: typeof document !== "undefined" ? document.referrer || null : null,
  };

  const result = await apiFetchJson<{ ok: boolean; already?: boolean; message?: string; error?: string }>(
    "/api/leads/newsletter",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );

  if (result.ok) {
    return { ok: true, already: result.data?.already };
  }

  if (result.status === 0) {
    return {
      ok: false,
      code: "NETWORK",
      message: "Sem conexão com o servidor. Tente novamente.",
    };
  }

  if (result.status === 400 && result.data?.error === "INVALID_EMAIL") {
    return {
      ok: false,
      code: "INVALID_EMAIL",
      message: result.data?.message ?? "E-mail inválido.",
    };
  }

  return {
    ok: false,
    code: "NETWORK",
    message: "Não foi possível concluir agora. Tente novamente.",
  };
}

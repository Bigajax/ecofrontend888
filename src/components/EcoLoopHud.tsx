import { useCallback, useEffect, useMemo, useState } from "react";

import type { SendFeedbackResult } from "../api/feedback";

type SnapshotData = {
  resposta_q?: {
    q?: string;
    estruturado_ok?: boolean;
    memoria_ok?: boolean;
  } | null;
  latency_samples?: {
    ttfb_ms?: number;
    ttlc_ms?: number;
  } | null;
  bandit_reward?: {
    recompensa?: number;
    arm?: string;
  } | null;
  arm?: {
    alpha?: number;
    beta?: number;
    pulls?: number;
  } | null;
} | null;

const formatNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toFixed(0);
  }
  return "—";
};

const METABASE_BASE = (import.meta.env.VITE_METABASE_URL ?? "").trim();

export function EcoLoopHud() {
  if (!import.meta.env.DEV) {
    return null;
  }

  const [visible, setVisible] = useState(false);
  const [feedback, setFeedback] = useState(() =>
    typeof window !== "undefined" ? window.__ecoLastFeedback ?? null : null,
  );
  const [result, setResult] = useState<SendFeedbackResult | null>(() =>
    typeof window !== "undefined" ? window.__ecoLastFeedbackResult ?? null : null,
  );
  const [snapshot, setSnapshot] = useState<SnapshotData>(null);
  const [snapshotStatus, setSnapshotStatus] = useState<"idle" | "loading" | "error" | "empty" | "ready">(
    "idle",
  );
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [lastSnapshotId, setLastSnapshotId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const interactionId = feedback?.interaction_id ?? "";

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (event: CustomEvent<{ feedback: typeof feedback; result: SendFeedbackResult }>) => {
      setFeedback(event.detail.feedback ?? null);
      setResult(event.detail.result ?? null);
    };

    window.addEventListener("eco-feedback-update", handler as EventListener);
    return () => window.removeEventListener("eco-feedback-update", handler as EventListener);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "F12") {
        setVisible((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!interactionId) {
      setSnapshot(null);
      setSnapshotStatus("idle");
      setLastSnapshotId(null);
      return;
    }

    if (lastSnapshotId && interactionId !== lastSnapshotId) {
      setSnapshot(null);
      setSnapshotStatus("idle");
      setLastSnapshotId(null);
    }
  }, [interactionId, lastSnapshotId]);

  const fetchSnapshot = useCallback(
    async (responseId: string) => {
      setSnapshotStatus("loading");
      setSnapshotError(null);
      try {
        const res = await fetch(`/api/diag/last?response_id=${encodeURIComponent(responseId)}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          mode: "cors",
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as SnapshotData;
        const isEmpty = !data || (typeof data === "object" && Object.keys(data ?? {}).length === 0);
        if (isEmpty) {
          setSnapshot(null);
          setSnapshotStatus("empty");
        } else {
          setSnapshot(data);
          setSnapshotStatus("ready");
        }
        setLastSnapshotId(responseId);
      } catch (error) {
        setSnapshot(null);
        setSnapshotStatus("error");
        setSnapshotError(error instanceof Error ? error.message : String(error));
        setLastSnapshotId(responseId);
      }
    },
    [],
  );

  useEffect(() => {
    if (!visible) return;
    if (!interactionId) return;
    if (!result) return;
    if (METABASE_BASE) return;
    if (snapshotStatus === "loading") return;
    if (lastSnapshotId === interactionId && (snapshotStatus === "ready" || snapshotStatus === "empty")) {
      return;
    }
    void fetchSnapshot(interactionId);
  }, [visible, interactionId, result, snapshotStatus, lastSnapshotId, fetchSnapshot]);

  const handleCopy = useCallback(async () => {
    if (!interactionId) return;
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(interactionId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (error) {
      console.warn("eco_loop_hud_copy_failed", error);
    }
  }, [interactionId]);

  const metabaseLink = useMemo(() => {
    if (!METABASE_BASE || !interactionId) return null;
    const base = METABASE_BASE.replace(/\/$/, "");
    return `${base}/?response_id=${encodeURIComponent(interactionId)}`;
  }, [interactionId]);

  if (!visible) {
    return null;
  }

  const feedbackTime = feedback?.t ? new Date(feedback.t).toLocaleTimeString() : "—";
  const statusIcon = result ? (result.ok ? "✅" : "❌") : "•";
  const statusLabel = result ? `${result.status}` : "sem status";
  const question = snapshot?.resposta_q?.q ?? null;
  const ttfb = snapshot?.latency_samples?.ttfb_ms;
  const ttlc = snapshot?.latency_samples?.ttlc_ms;
  const reward = snapshot?.bandit_reward?.recompensa;
  const armKey = snapshot?.bandit_reward?.arm ?? null;
  const alpha = snapshot?.arm?.alpha;
  const beta = snapshot?.arm?.beta;
  const pulls = snapshot?.arm?.pulls;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-[min(320px,90vw)] rounded-xl border border-slate-300 bg-white/95 p-4 text-sm shadow-xl">
      <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span>Eco Loop</span>
        <span className="text-[10px] text-slate-400">F12 para fechar</span>
      </div>

      <div className="space-y-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Último feedback</div>
          {interactionId ? (
            <button
              type="button"
              onClick={handleCopy}
              className="mt-1 w-full truncate rounded border border-slate-200 px-2 py-1 text-left font-mono text-[11px] text-slate-700 hover:bg-slate-50"
            >
              {interactionId}
            </button>
          ) : (
            <div className="mt-1 rounded border border-dashed border-slate-200 px-2 py-1 text-[11px] text-slate-400">
              Ainda sem feedback
            </div>
          )}
          {copied && <div className="mt-1 text-[10px] text-emerald-600">Copiado!</div>}
          <div className="mt-1 text-[11px] text-slate-500">{feedback?.vote ? `Voto: ${feedback.vote}` : ""}</div>
          <div className="text-[11px] text-slate-400">Horário: {feedbackTime}</div>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Último POST</div>
            <div className="text-sm font-medium text-slate-700">
              {statusIcon} {statusLabel}
            </div>
          </div>
          {result?.errorMessage && !result.ok && (
            <span className="max-w-[160px] text-right text-[11px] text-red-500">
              {result.errorMessage}
            </span>
          )}
        </div>

        {metabaseLink ? (
          <a
            href={metabaseLink}
            target="_blank"
            rel="noreferrer"
            className="block rounded-lg border border-slate-200 px-3 py-2 text-center text-[12px] font-medium text-sky-600 hover:bg-sky-50"
          >
            Abrir no Metabase
          </a>
        ) : (
          <button
            type="button"
            onClick={() => interactionId && fetchSnapshot(interactionId)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[12px] font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!interactionId || snapshotStatus === "loading"}
          >
            {snapshotStatus === "loading" ? "Carregando…" : "Atualizar snapshot"}
          </button>
        )}

        {interactionId && !metabaseLink && (
          <div className="rounded-lg border border-slate-200 bg-white/80 px-3 py-2">
            {snapshotStatus === "loading" && <div className="text-[11px] text-slate-500">Carregando…</div>}
            {snapshotStatus === "empty" && (
              <div className="text-[11px] text-slate-500">Snapshot ainda não persistiu.</div>
            )}
            {snapshotStatus === "error" && (
              <div className="text-[11px] text-red-500">Erro ao carregar: {snapshotError}</div>
            )}
            {snapshotStatus === "ready" && (
              <div className="space-y-1 text-[12px] text-slate-600">
                <div>
                  <span className="font-semibold">Pergunta:</span> {question ?? "—"}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="font-semibold">TTFB:</span> {formatNumber(ttfb)} ms
                  </div>
                  <div>
                    <span className="font-semibold">TTLC:</span> {formatNumber(ttlc)} ms
                  </div>
                  <div>
                    <span className="font-semibold">Reward:</span> {formatNumber(reward)}
                  </div>
                  <div>
                    <span className="font-semibold">Arm:</span> {armKey ?? "—"}
                  </div>
                </div>
                <div>
                  <span className="font-semibold">α/β/pulls:</span> {formatNumber(alpha)} / {formatNumber(beta)} / {formatNumber(pulls)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default EcoLoopHud;


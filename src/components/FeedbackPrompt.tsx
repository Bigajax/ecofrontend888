// src/components/FeedbackPrompt.tsx
import { useState } from "react";
import mixpanel from "../lib/mixpanel";

type Props = {
  sessaoId: string;
  usuarioId?: string;
  /** Envie somente se for o ID da mensagem no BANCO. Se ainda não salva a resposta da ECO, omita. */
  mensagemId?: string;
  /** Dados extras opcionais (ex.: { ui_message_id }) */
  extraMeta?: Record<string, any>;
  onSubmitted?: () => void;
};

const REASONS = [
  "Muito genérico",
  "Confuso",
  "Tom não combina",
  "Longo demais",
  "Faltou profundidade",
] as const;

export function FeedbackPrompt({
  sessaoId,
  usuarioId,
  mensagemId,
  extraMeta,
  onSubmitted,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"ask" | "reasons" | "done">("ask");

  async function send(rating: 1 | -1, reason?: string) {
    setLoading(true);
    try {
      // Se você usa o proxy do Vite, pode deixar vazio; em produção defina VITE_API_URL=/api
      const API = (import.meta as any).env?.VITE_API_URL ?? "";
      const res = await fetch(`${API}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessaoId,
          usuarioId,
          // só envie se for um ID real do banco
          ...(mensagemId ? { mensagemId } : {}),
          rating,
          reason,
          source: mode === "reasons" ? "options" : "thumb_prompt",
          meta: { screen: "ChatPage", ...(extraMeta || {}) },
        }),
      });
      if (!res.ok) throw new Error("fail");
      mixpanel.track("Front-end: Feedback Enviado", {
        rating,
        reason,
        sessaoId,
        usuarioId,
        mensagemId,
      });
      setMode("done");
      if (onSubmitted) {
        mixpanel.track("Front-end: Feedback Encerrado", {
          sessaoId,
          usuarioId,
          mensagemId,
        });
        onSubmitted();
      }
    } catch (err: unknown) {
      mixpanel.track("Front-end: Feedback Falhou", {
        error: err instanceof Error ? err.message : String(err),
        rating,
        reason,
      });
    } finally {
      setLoading(false);
    }
  }

  if (mode === "done") {
    return (
      <div className="text-xs text-gray-600 text-center">
        Obrigado pelo feedback 💛
      </div>
    );
  }

  if (mode === "reasons") {
    return (
      <div className="flex flex-wrap gap-2 justify-center">
        {REASONS.map((r) => (
          <button
            key={r}
            disabled={loading}
            onClick={() => send(-1, r)}
            className="
              px-3 py-1 text-xs rounded-full border
              bg-white/60 hover:bg-white/80
              border-gray-200/70 shadow-sm
              disabled:opacity-50
            "
          >
            {r}
          </button>
        ))}
        <button
          disabled={loading}
          onClick={() => send(-1, "Outro")}
          className="
            px-3 py-1 text-xs rounded-full border
            bg-white/60 hover:bg-white/80
            border-gray-200/70 shadow-sm
            disabled:opacity-50
          "
        >
          Outro
        </button>
        <button
          type="button"
          onClick={() => setMode("ask")}
          disabled={loading}
          className="
            px-3 py-1 text-xs rounded-full border
            bg-white/40 hover:bg-white/60
            border-gray-200/70 shadow-sm
            disabled:opacity-50
          "
        >
          Voltar
        </button>
      </div>
    );
  }

  // mode === "ask"
  return (
    <div className="flex items-center justify-center gap-3">
      <span className="text-xs text-gray-700">Essa resposta ajudou?</span>
      <div className="flex gap-2">
        <button
          aria-label="Gostei"
          disabled={loading}
          onClick={() => {
            mixpanel.track("Front-end: Feedback Interação", {
              rating: "positive",
              sessaoId,
              usuarioId,
              mensagemId,
            });
            send(1);
          }}
          className="
            inline-flex items-center justify-center
            px-2 py-1 text-sm rounded-xl border
            bg-white/60 hover:bg-white/80
            border-gray-200/70 shadow-sm
            disabled:opacity-50
          "
        >
          👍
        </button>
        <button
          aria-label="Não gostei"
          disabled={loading}
          onClick={() => {
            mixpanel.track("Front-end: Feedback Motivos Abertos", {
              sessaoId,
              usuarioId,
              mensagemId,
            });
            setMode("reasons");
          }}
          className="
            inline-flex items-center justify-center
            px-2 py-1 text-sm rounded-xl border
            bg-white/60 hover:bg-white/80
            border-gray-200/70 shadow-sm
            disabled:opacity-50
          "
        >
          👎
        </button>
      </div>
    </div>
  );
}

export default FeedbackPrompt;

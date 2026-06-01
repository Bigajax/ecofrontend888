// src/components/chat/AcaoRecomendadaCard.tsx
//
// Card de "próxima ação recomendada" exibido abaixo de uma resposta da Eco.
// O backend (Action Engine) decide a ação semântica (tipo/título/descrição/cta) e a envia no
// metadata do SSE; aqui mapeamos `tipo` → rota/ícone e renderizamos o botão.

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Wind, Moon, PencilLine, BookOpen, BarChart3, type LucideIcon } from "lucide-react";

import type { Message } from "../../contexts/ChatContext";
import { track } from "../../analytics/track";

export type TipoAcao = "meditacao" | "sono" | "diario" | "estoicismo" | "relatorio";

export interface AcaoRecomendada {
  tipo: TipoAcao;
  titulo: string;
  descricao: string;
  cta: string;
  prioridade?: number;
}

interface AcaoConfig {
  rota: string;
  Icon: LucideIcon;
  accent: string;
}

// Mapa tipo → rota (rotas autenticadas já existentes em App.tsx) + ícone.
export const ACTION_REGISTRY: Record<TipoAcao, AcaoConfig> = {
  meditacao: { rota: "/app/introducao-meditacao", Icon: Wind, accent: "#0D3461" },
  sono: { rota: "/app/meditacoes-sono", Icon: Moon, accent: "#3a2f6e" },
  diario: { rota: "/app/diario-estoico", Icon: PencilLine, accent: "#0D3461" },
  estoicismo: { rota: "/app/diario-estoico", Icon: BookOpen, accent: "#0D3461" },
  relatorio: { rota: "/app/memory/report", Icon: BarChart3, accent: "#0D3461" },
};

const TIPOS_VALIDOS = new Set<TipoAcao>([
  "meditacao",
  "sono",
  "diario",
  "estoicismo",
  "relatorio",
]);

function isAcaoRecomendada(value: unknown): value is AcaoRecomendada {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.tipo === "string" &&
    TIPOS_VALIDOS.has(v.tipo as TipoAcao) &&
    typeof v.titulo === "string" &&
    typeof v.cta === "string"
  );
}

/**
 * Extrai a ação recomendada de uma mensagem da Eco, checando os locais onde o metadata do SSE
 * pode aterrissar (metadata direto ou donePayload.meta).
 */
export function extractAcaoRecomendada(message: Message | undefined): AcaoRecomendada | null {
  if (!message) return null;
  const candidates: unknown[] = [
    (message.metadata as Record<string, unknown> | undefined)?.acao_recomendada,
    ((message.donePayload as Record<string, unknown> | undefined)?.meta as
      | Record<string, unknown>
      | undefined)?.acao_recomendada,
    (message.donePayload as Record<string, unknown> | undefined)?.acao_recomendada,
  ];
  for (const candidate of candidates) {
    if (isAcaoRecomendada(candidate)) return candidate;
  }
  return null;
}

interface AcaoRecomendadaCardProps {
  acao: AcaoRecomendada;
  /** Para analytics (mensagem/interação de origem). */
  messageId?: string;
}

export default function AcaoRecomendadaCard({ acao, messageId }: AcaoRecomendadaCardProps) {
  const navigate = useNavigate();
  const config = ACTION_REGISTRY[acao.tipo];

  useEffect(() => {
    track("Eco Action Shown", { action_type: acao.tipo, message_id: messageId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acao.tipo, messageId]);

  if (!config) return null;
  const { Icon, rota, accent } = config;

  const handleClick = () => {
    track("Eco Action Clicked", { action_type: acao.tipo, message_id: messageId, rota });
    navigate(rota);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="mt-2 ml-[58px] sm:ml-[62px] max-w-[min(65ch,85vw)]"
    >
      <div
        className="flex items-start gap-3 rounded-2xl border border-gray-200/70 bg-white px-3.5 py-3 shadow-sm"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
      >
        <span
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: "rgba(13,52,97,0.06)" }}
        >
          <Icon size={18} color={accent} strokeWidth={1.6} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium leading-snug text-[#0D3461]">{acao.titulo}</p>
          {acao.descricao && (
            <p className="mt-0.5 text-[13px] leading-snug text-gray-600">{acao.descricao}</p>
          )}
          <button
            type="button"
            onClick={handleClick}
            className="mt-2 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90 active:opacity-80"
            style={{ background: accent }}
          >
            {acao.cta}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

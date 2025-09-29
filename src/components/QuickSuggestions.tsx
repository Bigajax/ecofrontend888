import React from "react";
import RotatingPrompts from "./RotatingPrompts";

/* --------- Tipo público para usar no ChatPage --------- */
export type Suggestion = {
  id: string;
  label: string;          // texto visível
  icon?: string;          // emoji/ícone opcional
  modules?: string[];     // chaves dos módulos a ativar
  systemHint?: string;    // dica extra para a IA ajustar o tom
};

type QuickSuggestionsProps = {
  visible: boolean;
  className?: string;

  suggestions?: Suggestion[];
  onPickSuggestion?: (s: Suggestion) => void;

  /** Legado: compat com versão antiga (texto direto) */
  onPick?: (text: string) => void;

  /** Rotativas */
  showRotating?: boolean;          // default: true
  rotatingItems?: Suggestion[];    // opcional — se não vier, usa DEFAULT_ROTATING
  rotationMs?: number;             // default: 4500ms
};

/* --------- Pílulas fixas (as 5 que você definiu) --------- */
export const DEFAULT_SUGGESTIONS: Suggestion[] = [
  {
    id: "memories_review",
    icon: "🔄",
    label: "Revisitar um momento marcante",
    modules: ["eco_memoria_revisitar_passado", "eco_observador_presente", "eco_corpo_emocao"],
    systemHint:
      "Puxe 1–3 memórias relevantes (intensidade ≥ 7 e proximidade semântica). " +
      "Espelhe padrões e proponha 1 micro-ação integrada ao presente.",
  },
  {
    id: "bias_today",
    icon: "🧩",
    label: "Onde posso estar me enganando hoje?",
    modules: [
      "eco_heuristica_ancoragem",
      "eco_heuristica_disponibilidade",
      "eco_heuristica_excesso_confianca",
      "eco_heuristica_ilusao_validade",
      "eco_heuristica_regressao_media",
    ],
    systemHint:
      "Explique vieses de forma simples. Faça 1 pergunta diagnóstica e proponha 1 reframe prático.",
  },
  {
    id: "stoic_reflection_now",
    icon: "🪞",
    label: "Quero ver um reflexo estoico agora",
    modules: ["eco_presenca_racional", "eco_identificacao_mente", "eco_fim_do_sofrimento"],
    systemHint:
      "Aplicação estoica: 3 perguntas — controle, julgamento, ação mínima. Tom direto e calmo.",
  },
  {
    id: "courage_exposure",
    icon: "💬",
    label: "Quero coragem para me expor mais",
    modules: ["eco_vulnerabilidade_defesas", "eco_vulnerabilidade_mitos", "eco_emo_vergonha_combate"],
    systemHint:
      "Traga Brené Brown: diferencie vulnerabilidade de exposição. Ajude a nomear 1 defesa ativa e 1 micro-ato de coragem.",
  },
  {
    id: "strong_past_emotion",
    icon: "🌊",
    label: "Revisar uma emoção forte do passado",
    modules: ["eco_memoria_revisitar_passado", "eco_observador_presente", "eco_corpo_emocao"],
    systemHint:
      "Resgate 1 memória intensa (≥ 7). Espelhe a emoção e proponha 1 nova interpretação prática.",
  },
];

/* --------- Frases rotativas (3 perguntas diretas) --------- */
export const DEFAULT_ROTATING: Suggestion[] = [
  {
    id: "rot_memoria_pergunta",
    icon: "🧭",
    label: "Quer revisitar uma lembrança que ainda mexe com você?",
    modules: ["eco_memoria_revisitar_passado", "eco_observador_presente", "eco_corpo_emocao"],
    systemHint:
      "Convide o usuário a escolher uma memória marcante (priorize intensidade ≥ 7). " +
      "Espelhe padrões, acolha a emoção e proponha 1 micro-ação no presente.",
  },
  {
    id: "rot_estoico_pergunta",
    icon: "🏛️",
    label: "Prefere começar refletindo sobre o que realmente está no seu controle hoje?",
    modules: ["eco_presenca_racional", "eco_identificacao_mente"],
    systemHint:
      "Aplique estoicismo com 3 passos: o que depende de si, qual julgamento está ativo, qual a menor ação virtuosa agora.",
  },
  {
    id: "rot_vieses_pergunta",
    icon: "🔍",
    label: "Topa explorar se algum viés pode estar influenciando sua visão agora?",
    modules: ["eco_heuristica_excesso_confianca", "eco_heuristica_ancoragem", "eco_heuristica_regressao_media"],
    systemHint:
      "Faça 1 checklist curto de vieses comuns, proponha 1 checagem objetiva e 1 reframe prático.",
  },
];

/* === Tipografia igual ao Drawer (clean) === */
const labelCls =
  "text-[15px] leading-[1.35] text-slate-900/95 font-normal tracking-[-0.005em] antialiased";

export default function QuickSuggestions({
  visible,
  className = "",
  suggestions = DEFAULT_SUGGESTIONS,
  onPickSuggestion,
  onPick, // legado
  showRotating = true,
  rotatingItems = DEFAULT_ROTATING,
  rotationMs = 4500,
}: QuickSuggestionsProps) {
  if (!visible) return null;

  const emitPick = (s: Suggestion) => {
    if (onPickSuggestion) return onPickSuggestion(s);
    if (onPick) return onPick(`${s.icon ? s.icon + " " : ""}${s.label}`);
  };

  return (
    <div
      className={`w-full max-w-2xl mx-auto mb-2 ${className}`}
      aria-label="Atalhos de início"
      role="region"
    >
      {/* ⬆️ Frases rotativas */}
      {showRotating && (
        <div className="mb-1.5">
          <RotatingPrompts
            items={rotatingItems}
            onPick={emitPick}
            intervalMs={rotationMs}
            className="w-full"
            labelClassName={labelCls}
          />
        </div>
      )}

      {/* ⬇️ Pílulas compactas */}
      <div
        className="
          flex gap-2 overflow-x-auto py-1 px-0.5
          whitespace-nowrap md:whitespace-normal
          md:flex md:flex-wrap md:justify-center
          [scrollbar-width:none] [-ms-overflow-style:none]
          [&::-webkit-scrollbar]:hidden
        "
      >
        {suggestions.map((s) => (
          <button
            key={s.id}
            onClick={() => emitPick(s)}
            className="
              shrink-0 md:shrink
              h-9 md:h-10
              rounded-full pl-2.5 pr-3 md:px-3.5
              bg-white/70 backdrop-blur-md
              border border-black/10
              shadow-[0_8px_22px_rgba(16,24,40,0.08)]
              hover:bg-white/85 hover:border-black/15
              focus:outline-none focus-visible:ring-2 focus-visible:ring-black/10
              active:translate-y-[1px] transition
              text-slate-900/95 inline-flex items-center gap-2
            "
            aria-label={`Sugerir: ${s.label}`}
            title={s.label}
            data-suggestion-id={s.id}
          >
            {s.icon && (
              <span className="leading-none text-[15px] md:text-[17px]" aria-hidden>
                {s.icon}
              </span>
            )}
            <span className={labelCls}>{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

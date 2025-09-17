import React from "react";
import RotatingPrompts from "./RotatingPrompts"; // ⬅️ seu componente

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

  /** Preferencial — recebe objetos ricos */
  suggestions?: Suggestion[];
  onPickSuggestion?: (s: Suggestion) => void;

  /** Legado: compat com versão antiga (texto direto) */
  onPick?: (text: string) => void;

  /** Rotativas */
  showRotating?: boolean;          // default: true
  rotatingItems?: Suggestion[];    // opcional — se não vier, usa DEFAULT_ROTATING
  rotationMs?: number;             // default: 4500ms
};

/* --------- Pílulas padrão (Kahneman / Tolle / Brené / Estoicos) --------- */
export const DEFAULT_SUGGESTIONS: Suggestion[] = [
  {
    id: "bias_check",
    icon: "🧠",
    label: "Checar meus vieses de hoje",
    modules: [
      "eco_heuristica_ancoragem",
      "eco_heuristica_disponibilidade",
      "eco_heuristica_regressao_media",
      "eco_heuristica_excesso_confianca",
    ],
    systemHint:
      "Contexto: usuário quer revisar possíveis vieses cognitivos nas percepções do dia. " +
      "Abordagem: explique cada viés de forma simples, faça 1 pergunta prática e proponha 1 micro-checagem.",
  },
  {
    id: "presence_now",
    icon: "🌿",
    label: "Praticar presença (3 min)",
    modules: ["eco_observador_presente", "eco_presenca_silenciosa", "eco_corpo_emocao"],
    systemHint:
      "Conduza um exercício de presença curto (3 minutos). Passo-a-passo, tom calmo e concreto. " +
      "Convide a notar corpo, respiração e um pensamento; finalize com 1 insight simples.",
  },
  {
    id: "vulnerability",
    icon: "🫶",
    label: "Coragem & vulnerabilidade",
    modules: ["eco_vulnerabilidade_defesas", "eco_vulnerabilidade_mitos", "eco_emo_vergonha_combate"],
    systemHint:
      "Traga a perspectiva de Brené Brown: diferença entre vulnerabilidade e exposição. " +
      "Ajude a identificar 1 defesa ativa e ofereça 1 gesto prático de coragem.",
  },
  {
    id: "stoic_reflection",
    icon: "🏛️",
    label: "Reflexão estoica do dia",
    modules: ["eco_presenca_racional", "eco_identificacao_mente", "eco_fim_do_sofrimento"],
    systemHint:
      "Use Marco Aurélio: distinguir o que depende de si. Conduza 3 perguntas: controle, julgamento, ação mínima.",
  },
];

/* --------- Frases rotativas que já acionam módulos --------- */
export const DEFAULT_ROTATING: Suggestion[] = [
  {
    id: "rot_presenca_scan",
    icon: "🌬️",
    label: "Vamos fazer um mini-scan de presença agora?",
    modules: ["eco_observador_presente", "eco_presenca_silenciosa", "eco_corpo_emocao"],
    systemHint:
      "Conduza um body scan curto (2–3 minutos), com foco gentil em respiração, pontos de contato e 1 pensamento.",
  },
  {
    id: "rot_kahneman_check",
    icon: "🧩",
    label: "Quero checar se caí em algum atalho mental hoje",
    modules: [
      "eco_heuristica_ancoragem",
      "eco_heuristica_disponibilidade",
      "eco_heuristica_excesso_confianca",
    ],
    systemHint:
      "Explique cada heurística em linguagem simples, faça 1 pergunta diagnóstica e proponha 1 reframe.",
  },
  {
    id: "rot_vulnerabilidade",
    icon: "💗",
    label: "Posso explorar coragem & vulnerabilidade em 1 situação",
    modules: ["eco_vulnerabilidade_defesas", "eco_vulnerabilidade_mitos", "eco_emo_vergonha_combate"],
    systemHint:
      "Brené Brown: diferencie vulnerabilidade de exposição. Ajude a nomear 1 defesa e 1 micro-ato de coragem.",
  },
  {
    id: "rot_estoico",
    icon: "🏛️",
    label: "O que está sob meu controle hoje?",
    modules: ["eco_presenca_racional", "eco_identificacao_mente", "eco_fim_do_sofrimento"],
    systemHint:
      "Marco Aurélio: conduza 3 perguntas (controle/julgamento/ação mínima) e conclua com 1 compromisso simples.",
  },
  {
    id: "rot_regressao_media",
    icon: "📉",
    label: "Talvez ontem foi exceção — quero revisar expectativas",
    modules: ["eco_heuristica_regressao_media", "eco_heuristica_certeza_emocional"],
    systemHint:
      "Explique regressão à média em tom acessível. Convide a recalibrar expectativas e registrar 1 evidência concreta.",
  },
];

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
      {/* ⬆️ Frases rotativas (ocupam pouco espaço e “puxam” módulos) */}
      {showRotating && (
        <div className="mb-1.5">
          <RotatingPrompts
            items={rotatingItems}
            onPick={emitPick}
            intervalMs={rotationMs}
            className="w-full"
          />
        </div>
      )}

      {/* ⬇️ Pílulas compactas — mobile com rolagem horizontal, desktop com wrap */}
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
              rounded-full px-3 md:px-3.5
              text-[13px] md:text-[13.5px]
              bg-white/70 backdrop-blur-md
              border border-gray-200/70
              shadow-sm hover:shadow focus:outline-none
              focus-visible:ring-2 focus-visible:ring-slate-300
              active:translate-y-[1px] transition
              text-slate-800 flex items-center gap-2
            "
            aria-label={`Sugerir: ${s.label}`}
            title={s.label}
            data-suggestion-id={s.id}
          >
            {s.icon && <span className="leading-none text-[15px] md:text-[17px]">{s.icon}</span>}
            <span className="font-medium leading-none">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

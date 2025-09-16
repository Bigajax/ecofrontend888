import React from "react";

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

  /** NOVO: preferencial — recebe objetos ricos */
  suggestions?: Suggestion[];
  onPickSuggestion?: (s: Suggestion) => void;

  /** LEGADO: compat com sua implementação antiga */
  onPick?: (text: string) => void;
};

/* --------- SUGESTÕES PADRÃO (Kahneman / Tolle / Brené / Estoicos) --------- */
const DEFAULT_SUGGESTIONS: Suggestion[] = [
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

export default function QuickSuggestions({
  visible,
  className = "",
  suggestions = DEFAULT_SUGGESTIONS,
  onPickSuggestion,
  onPick, // legado
}: QuickSuggestionsProps) {
  if (!visible) return null;

  const handleClick = (s: Suggestion) => {
    if (onPickSuggestion) return onPickSuggestion(s);
    if (onPick) return onPick(`${s.icon ? s.icon + " " : ""}${s.label}`);
  };

  return (
    <div
      className={"w-full max-w-2xl mx-auto mb-2 " + className}
      aria-label="Atalhos de início"
    >
      {/* mobile: 2 colunas | md+: pílulas com wrap centralizado */}
      <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:justify-center">
        {suggestions.map((s) => (
          <button
            key={s.id}
            onClick={() => handleClick(s)}
            className="
              rounded-full w-full
              text-[13px] md:text-sm px-3.5 py-2
              bg-white border border-gray-200
              shadow-sm hover:shadow focus:outline-none
              focus-visible:ring-2 focus-visible:ring-gray-400/50
              active:translate-y-[1px] transition
              text-slate-800 flex items-center justify-center gap-2
            "
            aria-label={`Sugerir: ${s.label}`}
            title={s.label}
            data-suggestion-id={s.id}
          >
            {s.icon && <span className="text-base md:text-[17px]">{s.icon}</span>}
            <span className="font-medium">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

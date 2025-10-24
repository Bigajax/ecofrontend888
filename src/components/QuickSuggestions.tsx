import React from "react";
import clsx from "clsx";
import RotatingPrompts from "./RotatingPrompts";

/* --------- Tipo público para usar no ChatPage --------- */
export type Suggestion = {
  id: string;
  label: string;          // texto visível
  icon?: string;          // emoji/ícone opcional
  modules?: string[];     // chaves dos módulos a ativar
  systemHint?: string;    // dica extra para a IA ajustar o tom
};

export type SuggestionPickMeta = {
  source: "rotating" | "pill";
  index: number;
};

type QuickSuggestionsProps = {
  visible: boolean;
  className?: string;

  /** Preferencial — recebe objetos ricos */
  suggestions?: Suggestion[];
  onPickSuggestion?: (s: Suggestion, meta?: SuggestionPickMeta) => void;

  /** Legado: compat com versão antiga (texto direto) */
  onPick?: (text: string) => void;

  /** Rotativas */
  showRotating?: boolean;          // default: true
  rotatingItems?: Suggestion[];    // opcional — se não vier, usa DEFAULT_ROTATING
  rotationMs?: number;             // default: 4500ms
  disabled?: boolean;
};

/* --------- Pílulas padrão (Eco convida) --------- */
export const DEFAULT_SUGGESTIONS: Suggestion[] = [
  {
    id: "bias_check",
    icon: "🧠",
    label: "Quer checar possíveis vieses hoje?",
    modules: [
      "eco_heuristica_ancoragem",
      "eco_heuristica_disponibilidade",
      "eco_heuristica_regressao_media",
      "eco_heuristica_excesso_confianca",
    ],
    systemHint:
      "Tom: curioso, gentil e não-julgador. Convide o usuário a revisar vieses comuns do dia (ancoragem, disponibilidade, excesso de confiança e regressão à média) com linguagem simples. Faça 1 pergunta prática e proponha 1 micro-checagem aplicável agora.",
  },
  {
    id: "presence_now",
    icon: "🌿",
    label: "Praticar presença por 3 min?",
    modules: ["eco_observador_presente", "eco_presenca_silenciosa", "eco_corpo_emocao"],
    systemHint:
      "Conduza um exercício breve de presença (≈3 min), passo a passo, com foco em corpo e respiração. Tom calmo, direto e gentil. Finalize com 1 pergunta simples sobre como a pessoa se sente agora.",
  },
  {
    id: "vulnerability",
    icon: "🫶",
    label: "Explorar coragem & vulnerabilidade?",
    modules: ["eco_vulnerabilidade_defesas", "eco_vulnerabilidade_mitos", "eco_emo_vergonha_combate"],
    systemHint:
      "Inspire-se em Brené Brown. Diferencie vulnerabilidade de exposição. Ajude a reconhecer 1 defesa ativa e convide para 1 gesto pequeno e autêntico, mantendo o tom acolhedor e sem prescrever.",
  },
  {
    id: "stoic_reflection",
    icon: "🏛️",
    label: "Reflexão estoica — o que depende de você?",
    modules: ["eco_presenca_racional", "eco_identificacao_mente", "eco_fim_do_sofrimento"],
    systemHint:
      "Use o olhar estoico para distinguir o que depende ou não de si. Conduza 3 perguntas curtas (controle, julgamento, ação mínima) e encerre com um compromisso simples e realista.",
  },
];

/* --------- Frases rotativas (convites da ECO) --------- */
export const DEFAULT_ROTATING: Suggestion[] = [
  {
    id: "rot_presenca_scan",
    icon: "🌬️",
    label: "Vamos fazer um mini exercício de presença agora?",
    modules: ["eco_observador_presente", "eco_presenca_silenciosa", "eco_corpo_emocao"],
    systemHint:
      "Guie um body scan curto (2–3 min). Fale em tom calmo, direto e gentil. Oriente atenção à respiração, pontos de contato do corpo e sons ao redor. Feche com 1 pergunta simples sobre a sensação do momento.",
  },
  {
    id: "rot_kahneman_check",
    icon: "🧩",
    label: "Quer explorar se sua mente criou algum atalho hoje?",
    modules: [
      "eco_heuristica_ancoragem",
      "eco_heuristica_disponibilidade",
      "eco_heuristica_excesso_confianca",
    ],
    systemHint:
      "Convite leve para examinar heurísticas (ancoragem, disponibilidade, excesso de confiança). Explique de forma acessível, faça 1 pergunta diagnóstica e ofereça 1 reframe prático. Sem tom prescritivo.",
  },
  {
    id: "rot_vulnerabilidade",
    icon: "💗",
    label: "Falamos um pouco sobre coragem e vulnerabilidade?",
    modules: ["eco_vulnerabilidade_defesas", "eco_vulnerabilidade_mitos", "eco_emo_vergonha_combate"],
    systemHint:
      "Traga a perspectiva de Brené Brown. Ajude a diferenciar vulnerabilidade de exposição. Convide a pessoa a nomear 1 defesa e imaginar 1 gesto pequeno de autenticidade no contexto atual.",
  },
  {
    id: "rot_estoico",
    icon: "🏛️",
    label: "Vamos olhar juntos o que está sob seu controle hoje?",
    modules: ["eco_presenca_racional", "eco_identificacao_mente", "eco_fim_do_sofrimento"],
    systemHint:
      "Aplique a lente estoica: controle, julgamento e ação mínima possível. Conduza 3 perguntas curtas e finalize com 1 passo simples, mantendo humor apropriado e acolhimento.",
  },
  {
    id: "rot_regressao_media",
    icon: "📉",
    label: "Quer revisar suas expectativas com mais leveza hoje?",
    modules: ["eco_heuristica_regressao_media", "eco_heuristica_certeza_emocional"],
    systemHint:
      "Explique regressão à média em linguagem simples. Convide a recalibrar expectativas após picos (bons/ruins). Proponha 1 evidência concreta a observar esta semana, com tom gentil e não-julgador.",
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
  disabled = false,
}: QuickSuggestionsProps) {
  if (!visible) return null;

  const emitPick = (s: Suggestion, meta?: SuggestionPickMeta) => {
    if (disabled) return;
    if (onPickSuggestion) return onPickSuggestion(s, meta);
    if (onPick) return onPick(`${s.icon ? s.icon + " " : ""}${s.label}`);
  };

  return (
    <div
      className={clsx(
        "quick-suggestions mx-auto flex w-full flex-col items-center gap-3",
        className,
      )}
      aria-label="Atalhos de início"
      role="region"
    >
      {/* ⬆️ Frases rotativas */}
      {showRotating && (
        <div className="w-full">
          <RotatingPrompts
            items={rotatingItems}
            onPick={emitPick}
            intervalMs={rotationMs}
            className="w-full"
            // força a mesma tipografia no componente filho
            labelClassName={labelCls}
            disabled={disabled}
          />
        </div>
      )}

      {/* ⬇️ Pílulas compactas */}
      <div className="quick-suggestions__grid">
        {suggestions.map((s, index) => (
          <button
            key={s.id}
            onClick={() => emitPick(s, { source: "pill", index })}
            className="
              quick-suggestions__pill
              rounded-2xl
              border border-black/10
              bg-white/80
              px-4 py-3
              text-slate-900/95
              shadow-[0_2px_12px_rgba(0,0,0,0.06)]
              backdrop-blur-md
              transition-colors duration-200 ease-out
              hover:border-black/15 hover:bg-white
              focus:outline-none focus-visible:ring-2 focus-visible:ring-black/10
              disabled:opacity-70
            "
            aria-label={`Sugerir: ${s.label}`}
            title={s.label}
            data-suggestion-id={s.id}
            type="button"
            disabled={disabled}
          >
            {s.icon && (
              <span
                className="quick-suggestions__pill-icon leading-none text-[15px] md:text-[17px]"
                aria-hidden
              >
                {s.icon}
              </span>
            )}
            <span className={clsx(labelCls, "text-center")}>{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

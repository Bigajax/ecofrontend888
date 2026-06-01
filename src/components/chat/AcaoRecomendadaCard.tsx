// src/components/chat/AcaoRecomendadaCard.tsx
//
// Card de "próximo passo" exibido abaixo de uma resposta da Eco.
// O backend (Action Engine) decide a ação semântica (tipo/título/descrição/cta) e a envia no
// metadata do SSE; aqui mapeamos `tipo` → rota + ARTE REAL do programa e renderizamos.
//
// Estética: card de conteúdo no idioma do app (capa real do programa + play), não ícone abstrato.
// A capa carrega a personalidade; a cor de acento entra só na borda-fio, no eyebrow e no glow do
// play. Tipografia Geist (título) + Lora itálico (descrição).

import { useEffect, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Play, ArrowRight, Sparkles } from "lucide-react";

import type { Message } from "../../contexts/ChatContext";
import { track } from "../../analytics/track";
import { useHapticFeedback } from "../../hooks/useHapticFeedback";
import { useSubscriptionTier, usePremiumContent } from "../../hooks/usePremiumContent";
import { canAccessMeditation } from "../../constants/meditationTiers";

/** Azul-bebê da marca — mesma cor do feedback do nav (`--accent`/eco-baby). Abre a recomendação. */
const ECO_BABY = "#6EC8FF";

/** Grão fractal sutil para dar textura/profundidade ao vidro (data URI, sem rede). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export type TipoAcao = "meditacao" | "sono" | "diario" | "estoicismo" | "relatorio";
export type AcaoKind = "programa" | "meditacao";

export interface AcaoRecomendada {
  /** Opcional para tolerar payloads legados que só enviavam `tipo`. */
  id?: string;
  kind?: AcaoKind;
  titulo: string;
  descricao: string;
  cta: string;
  prioridade?: number;
  /** Alias legado (payloads antigos enviavam só `tipo`). */
  tipo?: TipoAcao;
}

interface CatalogEntry {
  kind: AcaoKind;
  rota: string;
  /** Capa real do programa (em /public/images). */
  cover: string;
  kicker: string;
  accent: string;
  glyph: "play" | "open";
  /** Id para checagem de acesso premium (kind === "meditacao"). */
  premiumId?: string;
  /** State de navegação para o player (kind === "meditacao"). */
  meditationState?: {
    title: string; duration: string; audioUrl: string; imageUrl: string; gradient: string;
  };
}

export const CATALOG: Record<string, CatalogEntry> = {
  meditacao: { kind: "programa", rota: "/app/introducao-meditacao", cover: "/images/introducao-meditacao-hero.webp", kicker: "RESPIRAR", accent: "#36A8E8", glyph: "play" },
  sono: { kind: "programa", rota: "/app/meditacoes-sono", cover: "/images/meditacoes-sono-hero.webp", kicker: "DESCANSAR", accent: "#6E63B0", glyph: "play" },
  estoicismo: { kind: "programa", rota: "/app/diario-estoico", cover: "/images/diario-marco-aurelio.webp", kicker: "REFLETIR", accent: "#B5895E", glyph: "play" },
  diario: { kind: "programa", rota: "/app/diario-estoico", cover: "/images/diario-estoico.webp", kicker: "ESCREVER", accent: "#5C9A78", glyph: "play" },
  relatorio: { kind: "programa", rota: "/app/memory/report", cover: "/images/relatorio-emocional-ilustracao.webp", kicker: "OBSERVAR", accent: "#2E6FB0", glyph: "open" },
  aneis: { kind: "programa", rota: "/app/rings", cover: "/images/5-aneis-hero.webp", kicker: "PERSISTIR", accent: "#B07C3F", glyph: "open" },
  riqueza_mental: { kind: "programa", rota: "/app/riqueza-mental", cover: "/images/quem-pensa-enriquece.webp", kicker: "PROSPERAR", accent: "#3B6BA5", glyph: "open" },
  energy_blessings: { kind: "programa", rota: "/app/energy-blessings", cover: "/images/meditacao-bencao-energia.webp", kicker: "ENERGIZAR", accent: "#E67E3C", glyph: "open" },
  liberar_estresse: {
    kind: "meditacao", rota: "/app/meditation-player",
    cover: "/images/liberando-estresse.webp", kicker: "LIBERAR", accent: "#8855C4", glyph: "play",
    premiumId: "blessing_11",
    meditationState: {
      title: "Liberando o Estresse", duration: "5 min",
      audioUrl: "/audio/liberando-estresse.mp3", imageUrl: "/images/liberando-estresse.webp",
      gradient: "linear-gradient(to bottom, #C4A0E8 0%, #A877D6 20%, #8855C4 40%, #6B40A8 60%, #4F2B8C 80%, #341870 100%)",
    },
  },
};

function isAcaoRecomendada(value: unknown): value is AcaoRecomendada {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const id = (typeof v.id === "string" && v.id) || (typeof v.tipo === "string" ? v.tipo : "");
  return typeof id === "string" && id in CATALOG && typeof v.titulo === "string" && typeof v.cta === "string";
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

const container: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.04, when: "beforeChildren" },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

const cover: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export default function AcaoRecomendadaCard({ acao, messageId }: AcaoRecomendadaCardProps) {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const haptic = useHapticFeedback();
  const tier = useSubscriptionTier();
  const { requestUpgrade } = usePremiumContent();
  const id = acao.id || acao.tipo || "";
  const entry = CATALOG[id];
  const [imgOk, setImgOk] = useState(true);

  useEffect(() => {
    track("Eco Action Shown", { action_type: id, message_id: messageId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, messageId]);

  if (!entry) return null;
  const { rota, cover: coverSrc, kicker, accent, glyph } = entry;

  const go = () => {
    haptic.selection();
    track("Eco Action Clicked", { action_type: id, message_id: messageId, rota });
    if (entry.kind === "meditacao") {
      if (entry.premiumId && !canAccessMeditation(entry.premiumId, tier)) {
        requestUpgrade("acao_" + id);
        return;
      }
      navigate(rota, { state: { meditation: entry.meditationState } });
      return;
    }
    navigate(rota);
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      go();
    }
  };

  const GlyphIcon = glyph === "play" ? Play : ArrowRight;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="visible"
      className="group/card mt-2.5 ml-[58px] sm:ml-[62px] w-[min(33rem,86vw)]"
      style={{ "--accent": accent } as React.CSSProperties}
    >
      {/* Abertura: rótulo da marca em azul-bebê (mesma cor do feedback do nav) */}
      <motion.div variants={item} className="mb-2 flex items-center gap-2 pl-0.5">
        <motion.span
          aria-hidden
          className="flex"
          animate={reduce ? undefined : { opacity: [0.55, 1, 0.55], scale: [1, 1.12, 1] }}
          transition={{ duration: 3.2, ease: "easeInOut", repeat: Infinity }}
        >
          <Sparkles size={13} color={ECO_BABY} strokeWidth={2} />
        </motion.span>
        <span
          className="font-display text-[12px] font-semibold tracking-tight"
          style={{ color: ECO_BABY }}
        >
          Próximo passo
        </span>
        <span
          className="h-px flex-1"
          style={{ background: `linear-gradient(90deg, ${ECO_BABY}59, transparent)` }}
        />
      </motion.div>

      {/* Borda-fio luminosa com a cor do programa + glow do acento atrás */}
      <div className="relative">
        {!reduce && (
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-3 -z-10 rounded-[30px] opacity-50 blur-2xl transition-opacity duration-500 group-hover/card:opacity-90"
            style={{
              background: `radial-gradient(60% 65% at 28% 38%, ${accent}40, transparent 72%)`,
            }}
          />
        )}
        <motion.div
          whileHover={reduce ? undefined : { y: -3 }}
          whileTap={reduce ? undefined : { scale: 0.985 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          role="button"
          tabIndex={0}
          aria-label={`${acao.titulo} — ${acao.cta}`}
          onClick={go}
          onKeyDown={onKey}
          className="cursor-pointer rounded-[22px] p-px outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{
            background: `linear-gradient(150deg, ${accent}66, rgba(255,255,255,0.4) 46%, ${accent}1f)`,
            boxShadow: `0 14px 34px -16px ${accent}66, 0 2px 10px rgba(30,42,68,0.06)`,
            // @ts-expect-error css var for tailwind ring color
            "--tw-ring-color": `${accent}80`,
          }}
        >
        <div
          className="relative flex items-stretch gap-3 overflow-hidden rounded-[21px] p-2.5"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.74) 100%)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          {/* Grão sutil para textura/profundidade do vidro */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 opacity-[0.04] mix-blend-overlay"
            style={{ backgroundImage: GRAIN, backgroundSize: "180px 180px" }}
          />
          {/* Capa real do programa + play */}
          <motion.div
            variants={cover}
            className="relative z-10 h-[92px] w-[92px] shrink-0 overflow-hidden rounded-[16px]"
            style={{
              // fallback: gradiente do acento caso a imagem falhe
              background: `linear-gradient(150deg, ${accent}, ${accent}99)`,
              boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.25)`,
            }}
          >
            {imgOk && (
              <img
                src={coverSrc}
                alt=""
                loading="lazy"
                decoding="async"
                onError={() => setImgOk(false)}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover/card:scale-[1.06]"
              />
            )}
            {/* Véu para legibilidade do play */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(8,16,28,0.05) 0%, rgba(8,16,28,0.28) 100%)",
              }}
            />
            {/* Botão de play / abrir */}
            <span className="absolute inset-0 flex items-center justify-center">
              {!reduce && (
                <motion.span
                  className="absolute h-12 w-12 rounded-full"
                  style={{ border: `1.5px solid rgba(255,255,255,0.6)` }}
                  animate={{ scale: [1, 1.45], opacity: [0.55, 0] }}
                  transition={{ duration: 2.4, ease: "easeOut", repeat: Infinity }}
                />
              )}
              <span
                className="relative flex h-10 w-10 items-center justify-center rounded-full transition-transform duration-300 group-hover/card:scale-110"
                style={{
                  background: "rgba(255,255,255,0.26)",
                  backdropFilter: "blur(6px)",
                  WebkitBackdropFilter: "blur(6px)",
                  border: "1px solid rgba(255,255,255,0.55)",
                  boxShadow: `0 6px 16px -6px ${accent}, inset 0 1px 1px rgba(255,255,255,0.4)`,
                }}
              >
                <GlyphIcon
                  size={17}
                  color="#fff"
                  strokeWidth={glyph === "play" ? 0 : 2.2}
                  fill={glyph === "play" ? "#fff" : "none"}
                  className={glyph === "play" ? "ml-0.5" : ""}
                />
              </span>
            </span>
          </motion.div>

          {/* Texto */}
          <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-center py-0.5">
            <motion.div variants={item} className="mb-1 flex items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: accent, boxShadow: `0 0 6px ${accent}` }}
              />
              <span
                className="font-sans text-[10px] font-semibold uppercase tracking-[0.16em]"
                style={{ color: accent, filter: "brightness(0.8)" }}
              >
                {kicker}
              </span>
            </motion.div>

            <motion.p
              variants={item}
              className="font-sans text-[15px] font-medium leading-snug text-[#16263A]"
            >
              {acao.titulo}
            </motion.p>

            {acao.descricao && (
              <motion.p
                variants={item}
                className="mt-1 font-serif text-[13px] italic leading-relaxed text-[#5B6B7E]"
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {acao.descricao}
              </motion.p>
            )}

            <motion.span
              variants={item}
              className="mt-1.5 inline-flex items-center gap-1 font-sans text-[12.5px] font-medium"
              style={{ color: accent }}
            >
              {acao.cta}
              <ArrowRight
                size={13}
                strokeWidth={2.2}
                className="transition-transform duration-300 ease-out group-hover/card:translate-x-0.5"
              />
            </motion.span>
          </div>
        </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

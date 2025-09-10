import React, { useMemo } from "react";
import { useMemoryData } from "./memoryData";
import MapaEmocional2D from "../../components/MapaEmocional2D";
import LinhaDoTempoEmocional from "../../components/LinhaDoTempoEmocional";

/**
 * Repaginado no estilo do app Saúde (Apple Health)
 * - Tipografia maior e arejada
 * - Cards com cantos 3xl, borda sutil e sombra suave
 * - Header "Resumo" + selo (Fixado)
 * - Skeletons de carregamento
 * - Estados vazios elegantes
 * - Mantém a mesma API dos componentes MapaEmocional2D e LinhaDoTempoEmocional
 */

const clamp = (v: number, min = -1, max = 1) => Math.max(min, Math.min(max, v));

/** UI PRIMITIVES **/
const SectionHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div className="mb-4">
    <div className="flex items-center gap-2 text-[28px] leading-tight font-semibold text-neutral-900">
      <span>{title}</span>
    </div>
    {subtitle && (
      <p className="text-[13px] text-neutral-500 mt-1">{subtitle}</p>
    )}
  </div>
);

const Pill: React.FC<{ children: React.ReactNode; tone?: "blue" | "gray" | "orange" }>
= ({ children, tone = "gray" }) => (
  <span
    className={[
      "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium",
      tone === "blue" && "bg-sky-50 text-sky-700 ring-1 ring-sky-100",
      tone === "gray" && "bg-neutral-50 text-neutral-600 ring-1 ring-neutral-100",
      tone === "orange" && "bg-orange-50 text-orange-700 ring-1 ring-orange-100",
    ].filter(Boolean).join(" ")}
  >
    {children}
  </span>
);

const Card: React.FC<{ title: string; right?: React.ReactNode; children: React.ReactNode }>
= ({ title, right, children }) => (
  <div className="bg-white rounded-[28px] border border-black/10 shadow-sm p-4 sm:p-5">
    <div className="flex items-start justify-between mb-3">
      <h4 className="text-[17px] font-semibold text-neutral-900 tracking-[-0.01em]">
        {title}
      </h4>
      <div className="shrink-0">{right}</div>
    </div>
    {children}
  </div>
);

const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={"animate-pulse rounded-xl bg-neutral-200/70 " + (className ?? "h-24")}></div>
);

const EmptyState: React.FC<{ title: string; desc?: string; icon?: string }>
= ({ title, desc, icon = "🪷" }) => (
  <div className="flex flex-col items-center text-center py-10">
    <div className="text-5xl mb-4">{icon}</div>
    <p className="text-base sm:text-lg font-medium mb-1 text-neutral-900">{title}</p>
    {desc && <p className="text-sm text-neutral-500 max-w-xs">{desc}</p>}
  </div>
);

/**
 * Cards auxiliares de métrica (opcionalmente reutilizáveis no futuro)
 */
const MetricRow: React.FC<{ label: string; value: React.ReactNode; hint?: string }>
= ({ label, value, hint }) => (
  <div className="flex items-baseline justify-between py-1.5">
    <span className="text-[13px] text-neutral-500">{label}</span>
    <div className="text-[20px] font-semibold text-neutral-900">{value}</div>
    {hint && <span className="ml-2 text-[12px] text-neutral-400">{hint}</span>}
  </div>
);

/** MAIN **/
const ReportSection: React.FC = () => {
  const { relatorio, loading, error } = useMemoryData();

  const mapaEmocional2D = useMemo(() => {
    if (!Array.isArray(relatorio?.mapa_emocional)) return [] as Array<{
      emocao: string;
      valenciaNormalizada: number;
      excitacaoNormalizada: number;
      cor?: string;
    }>;

    return relatorio!.mapa_emocional
      .map((p: any) => ({
        emocao: p.emocao ?? p.emocao_principal ?? "Desconhecida",
        valenciaNormalizada: clamp(typeof p.valencia === "number" ? p.valencia : p.x ?? 0),
        excitacaoNormalizada: clamp(typeof p.excitacao === "number" ? p.excitacao : p.y ?? 0),
        cor: p.cor ?? undefined,
      }))
      .filter((p: any) => typeof p.valenciaNormalizada === "number" && typeof p.excitacaoNormalizada === "number");
  }, [relatorio]);

  if (loading) {
    return (
      <div className="space-y-4">
        <SectionHeader title="Resumo" subtitle="Relatório Emocional" />
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-white rounded-[28px] border border-black/10 shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Pill tone="blue">Estado Emocional</Pill>
                <span className="text-[13px] text-neutral-500">Hoje</span>
              </div>
              <div className="text-neutral-300">•••</div>
            </div>
            <Skeleton className="h-40" />
          </div>
          <div className="bg-white rounded-[28px] border border-black/10 shadow-sm p-4">
            <Skeleton className="h-56" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700 text-sm">
        {error}
      </div>
    );
  }

  const hasLT = !!relatorio?.linha_do_tempo_intensidade?.length;
  const hasMapa = mapaEmocional2D.length > 0;

  return (
    <section className="space-y-4">
      {/* Header no estilo Saúde */}
      <div className="flex items-center justify-between">
        <SectionHeader title="Resumo" subtitle="Relatório Emocional" />
        <div className="flex items-center gap-2">
          <Pill tone="gray">Fixado</Pill>
        </div>
      </div>

      {/* Destaques / Cards */}
      <div className="grid grid-cols-1 gap-4">
        {hasMapa && (
          <Card
            title="Mapa Emocional 2D"
            right={<Pill tone="blue">Emoções</Pill>}
          >
            <div className="rounded-2xl overflow-hidden ring-1 ring-neutral-100">
              <MapaEmocional2D data={mapaEmocional2D} />
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <MetricRow label="Pontos plotados" value={<span>{mapaEmocional2D.length}</span>} />
              <MetricRow label="Memórias" value={<span>{relatorio?.total_memorias ?? "—"}</span>} />
              <MetricRow label="Última atualização" value={<span>{relatorio?.atualizado_em ?? "—"}</span>} />
            </div>
          </Card>
        )}

        {hasLT && (
          <Card title="Linha do Tempo Emocional" right={<Pill tone="orange">Últimos 30 dias</Pill>}>
            <div className="rounded-2xl overflow-hidden ring-1 ring-neutral-100">
              <LinhaDoTempoEmocional data={relatorio!.linha_do_tempo_intensidade} />
            </div>
          </Card>
        )}

        {!hasMapa && !hasLT && (
          <Card title="Relatório Emocional">
            <EmptyState
              title="Seu Relatório Emocional está em branco"
              desc="Para criar seu primeiro relatório, compartilhe suas memórias mais marcantes com a Eco."
            />
          </Card>
        )}

        {!!relatorio && (
          <div className="text-center text-[12px] text-neutral-500">
            Total de memórias significativas: {relatorio.total_memorias ?? "Indisponível"}
          </div>
        )}
      </div>
    </section>
  );
};

export default ReportSection;

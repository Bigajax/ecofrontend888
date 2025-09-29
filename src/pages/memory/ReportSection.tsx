import React, { useMemo, useState } from "react";
import { useMemoryData } from "./memoryData";
import MapaEmocional2D from "../../components/MapaEmocional2D";
import LinhaDoTempoEmocional from "../../components/LinhaDoTempoEmocional";
import StackedAreaSemanalEmocional from "../../components/StackedAreaSemanalEmocional";
import DailyIntensityStrip from "../../components/DailyIntensityStrip";
import EcoBubbleLoading from "../../components/EcoBubbleLoading";

/* ---------- Helpers / UI ---------- */

const clamp = (v: number, min = -1, max = 1) => Math.max(min, Math.min(max, v));

const SectionHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div className="mb-1">
    <div className="flex items-center gap-2 text-[28px] leading-tight font-semibold text-neutral-900">
      <span>{title}</span>
    </div>
    {subtitle && <p className="text-[13px] text-neutral-500 mt-1">{subtitle}</p>}
  </div>
);

const Pill: React.FC<{ children: React.ReactNode; tone?: "blue" | "gray" | "orange" }> = ({
  children,
  tone = "gray",
}) => (
  <span
    className={[
      "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium",
      tone === "blue" && "bg-sky-50 text-sky-700 ring-1 ring-sky-100",
      tone === "gray" && "bg-neutral-50 text-neutral-600 ring-1 ring-neutral-100",
      tone === "orange" && "bg-orange-50 text-orange-700 ring-1 ring-orange-100",
    ]
      .filter(Boolean)
      .join(" ")}
  >
    {children}
  </span>
);

const Card: React.FC<{ title: string; right?: React.ReactNode; children: React.ReactNode }> = ({
  title,
  right,
  children,
}) => (
  <div className="bg-white rounded-[28px] border border-black/10 shadow-sm p-4 sm:p-5">
    <div className="flex items-start justify-between mb-3">
      <h4 className="text-[17px] font-semibold text-neutral-900 tracking-[-0.01em]">{title}</h4>
      <div className="shrink-0">{right}</div>
    </div>
    {children}
  </div>
);

const EmptyState: React.FC<{ title: string; desc?: string; icon?: string }> = ({
  title,
  desc,
  icon = "🪷",
}) => (
  <div className="flex flex-col items-center text-center py-10">
    <div className="text-5xl mb-4">{icon}</div>
    <p className="text-base sm:text-lg font-medium mb-1 text-neutral-900">{title}</p>
    {desc && <p className="text-sm text-neutral-500 max-w-xs">{desc}</p>}
  </div>
);

const MetricRow: React.FC<{ label: string; value: React.ReactNode; hint?: string }> = ({
  label,
  value,
  hint,
}) => (
  <div className="flex items-baseline justify-between py-1.5">
    <span className="text-[13px] text-neutral-500">{label}</span>
    <div className="text-[20px] font-semibold text-neutral-900">{value}</div>
    {hint && <span className="ml-2 text-[12px] text-neutral-400">{hint}</span>}
  </div>
);

const Disclosure: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 border-t border-neutral-100 pt-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={open}
      >
        <span className="text-[13px] font-medium text-neutral-700">{title}</span>
        <span className="text-neutral-400 text-xl leading-none">{open ? "–" : "+"}</span>
      </button>
      {open && <div className="mt-2 text-[12px] text-neutral-600 space-y-2">{children}</div>}
    </div>
  );
};

const QuadrantLegend = () => (
  <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-600">
    <div className="rounded-lg border border-neutral-200 p-2">
      <div className="font-medium text-neutral-800">Positivo • Calmo</div>
      <div className="text-[11px]">(X:+, Y:−) tranquilo, satisfeito</div>
    </div>
    <div className="rounded-lg border border-neutral-200 p-2">
      <div className="font-medium text-neutral-800">Positivo • Intenso</div>
      <div className="text-[11px]">(X:+, Y:+) animado, eufórico</div>
    </div>
    <div className="rounded-lg border border-neutral-200 p-2">
      <div className="font-medium text-neutral-800">Negativo • Calmo</div>
      <div className="text-[11px]">(X:−, Y:−) melancólico, cansado</div>
    </div>
    <div className="rounded-lg border border-neutral-200 p-2">
      <div className="font-medium text-neutral-800">Negativo • Intenso</div>
      <div className="text-[11px]">(X:−, Y:+) irritado, ansioso</div>
    </div>
  </div>
);

/* ---------- Main ---------- */

const ReportSection: React.FC = () => {
  const { relatorio, relatorioLoading, relatorioError } = useMemoryData();
  const [heatmapRange, setHeatmapRange] = useState<30 | 90 | 180 | undefined>(30);

  const mapaEmocional2D = useMemo(() => {
    if (!Array.isArray(relatorio?.mapa_emocional))
      return [] as Array<{
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
      .filter(
        (p: any) =>
          typeof p.valenciaNormalizada === "number" &&
          typeof p.excitacaoNormalizada === "number"
      );
  }, [relatorio]);

  if (relatorioLoading) {
    return (
      <section className="space-y-4 max-h-[82vh] overflow-y-auto pr-1">
        <div className="sticky top-0 z-20 -mx-1 px-1 py-2 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b border-neutral-100">
          <div className="flex items-center justify-between">
            <SectionHeader title="Resumo" subtitle="Relatório Emocional" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Card title="Carregando análise…">
            <div className="h-48 grid place-items-center">
              <EcoBubbleLoading size={80} text="Preparando seu relatório..." />
            </div>
          </Card>

          <Card title="Carregando visualizações…">
            <div className="h-56 grid place-items-center">
              <EcoBubbleLoading size={60} />
            </div>
          </Card>
        </div>
      </section>
    );
  }

  if (relatorioError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700 text-sm">
        {relatorioError}
      </div>
    );
  }

  const hasLT = !!relatorio?.linha_do_tempo_intensidade?.length;
  const hasMapa = (mapaEmocional2D.length ?? 0) > 0;

  const rangeLabel =
    heatmapRange === 30 ? "Últimos 30 dias" :
    heatmapRange === 90 ? "Últimos 90 dias" :
    heatmapRange === 180 ? "Últimos 180 dias" : "Ano";

  return (
    <section className="space-y-4 max-h-[82vh] overflow-y-auto pr-1">
      {/* Header sticky */}
      <div className="sticky top-0 z-20 -mx-1 px-1 py-2 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b border-neutral-100">
        <div className="flex items-center justify-between">
          <SectionHeader title="Resumo" subtitle="Relatório Emocional" />
        </div>
      </div>

      <div className="h-2" />

      <div className="grid grid-cols-1 gap-4">
        {/* 🔷 Intensidade por Dia */}
        {hasLT && (
          <Card title="Intensidade por Dia" right={<Pill tone="orange">{rangeLabel}</Pill>}>
            <div className="mb-2 flex gap-2">
              {([30, 90, 180] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setHeatmapRange(v)}
                  className={[
                    "px-3 py-1.5 rounded-full text-[12px] border",
                    heatmapRange === v
                      ? "bg-neutral-900 text-white border-neutral-900"
                      : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100",
                  ].join(" ")}
                >
                  {v} d
                </button>
              ))}
              <button
                onClick={() => setHeatmapRange(undefined)}
                className={[
                  "px-3 py-1.5 rounded-full text-[12px] border",
                  heatmapRange === undefined
                    ? "bg-neutral-900 text-white border-neutral-900"
                    : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100",
                ].join(" ")}
              >
                Ano
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden ring-1 ring-neutral-100 px-3 py-2">
              <DailyIntensityStrip
                data={relatorio!.linha_do_tempo_intensidade}
                rangeDays={heatmapRange}
                trackHeight={22}
              />
            </div>

            <div className="mt-2 text-[12px] text-neutral-600">
              <p>
                <span className="font-medium text-neutral-700">Como ler:</span> cada quadrado é um
                dia; claro = baixa intensidade, escuro = alta (0–10). Sequências escuras indicam
                semanas mais intensas.
              </p>
            </div>
          </Card>
        )}

        {/* 🔶 Stacked Area Semanal */}
        {hasLT && (
          <Card title="Volume Semanal por Domínio" right={<Pill tone="orange">Semanas</Pill>}>
            <div className="rounded-2xl overflow-hidden ring-1 ring-neutral-100">
              <StackedAreaSemanalEmocional
                data={relatorio!.linha_do_tempo_intensidade}
                height={240}
              />
            </div>
            <div className="mt-2 text-[12px] text-neutral-600">
              <p>
                <span className="font-medium text-neutral-700">Como ler:</span> cada faixa mostra o
                quanto cada domínio contribuiu em cada semana. Áreas maiores indicam semanas mais
                intensas.
              </p>
            </div>
          </Card>
        )}

        {/* 🟢 Mapa 2D */}
        {hasMapa && (
          <Card title="Mapa Emocional 2D" right={<Pill tone="blue">Emoções</Pill>}>
            <div className="rounded-2xl overflow-hidden ring-1 ring-neutral-100">
              <MapaEmocional2D data={mapaEmocional2D} height={340} radius={14} />
            </div>

            <div className="mt-2 text-[12px] text-neutral-600">
              <p>
                <span className="font-medium text-neutral-700">Como ler:</span> as células
                hexagonais indicam <b>densidade de memórias</b>; quanto mais escura a área,
                mais recorrentes foram registros naquela região. X = valência
                (negativa → positiva) e Y = excitação (baixa → alta).
              </p>
            </div>

            <div className="mt-3">
              <QuadrantLegend />
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <MetricRow label="Pontos plotados" value={<span>{mapaEmocional2D.length}</span>} />
              <MetricRow label="Memórias" value={<span>{relatorio?.total_memorias ?? "—"}</span>} />
              <MetricRow label="Última atualização" value={<span>{relatorio?.atualizado_em ?? "—"}</span>} />
            </div>

            <Disclosure title="Detalhes do Mapa 2D">
              <ul className="list-disc pl-4 space-y-1">
                <li>Use os quadrantes para distinguir calmo/intenso e negativo/positivo.</li>
                <li>Manchas densas sugerem estados recorrentes.</li>
                <li>Compare períodos diferentes para observar mudanças.</li>
              </ul>
            </Disclosure>
          </Card>
        )}

        {/* 🚧 Detalhe por Domínio – temporariamente “fechado” */}
        {hasLT && (
          <Card title="Detalhe por Domínio" right={<Pill tone="orange">Linhas</Pill>}>
            <div className="relative rounded-2xl overflow-hidden ring-1 ring-neutral-100">
              {/* Conteúdo “embaçado” */}
              <div className="blur-[2px] select-none pointer-events-none">
                <LinhaDoTempoEmocional data={relatorio!.linha_do_tempo_intensidade} yMax={10} />
              </div>

              {/* Véu turvo + selo Em construção */}
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm" />
                <div className="relative">
                  <span className="px-3 py-1.5 rounded-full border border-black/10 bg-white/80 text-neutral-700 text-sm font-medium shadow-sm">
                    Em construção
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-2 text-[12px] text-neutral-500">
              Esta visualização está passando por melhorias — em breve liberamos a versão completa.
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

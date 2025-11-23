import React, { useMemo, useState } from "react";
import { LazyResponsiveLine as ResponsiveLine } from "@/components/charts/LazyCharts";

type LinhaDoTempoItem = { data: string; [dominio: string]: number | string };

type Props = {
  data: LinhaDoTempoItem[];
  /** força a ordem/seleção dos domínios (ex.: ["emocional","relacionamentos","profissional"]) */
  domainsOverride?: string[];
  /** altura do gráfico */
  height?: number;
  /** "total" (área única) ou "domains" (linhas por domínio) */
  variant?: "total" | "domains";
};

const COLORS = ["hsl(205,60%,56%)", "hsl(95,55%,48%)", "hsl(28,85%,55%)"];
const BLUE = "hsl(205,60%,56%)";

const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
const toDate = (v: string) => {
  const d = new Date(v);
  return isNaN(d.getTime()) ? new Date(Date.parse(v)) : d;
};
const fmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });

/** média móvel simples (janela = 2 por padrão) */
function smooth<T extends { x: Date; y: number }>(pts: T[], window = 2): T[] {
  if (pts.length <= 2) return pts;
  return pts.map((p, i) => {
    const a = Math.max(0, i - window);
    const b = Math.min(pts.length - 1, i + window);
    const slice = pts.slice(a, b + 1);
    const y = slice.reduce((acc, s) => acc + s.y, 0) / slice.length;
    return { ...p, y };
  });
}

/** segunda-feira da semana da data */
function weekStart(d: Date) {
  const m = new Date(d);
  m.setHours(0, 0, 0, 0);
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
}

export default function StackedAreaSemanalEmocional({
  data,
  domainsOverride,
  height = 240,
  variant = "total",
}: Props) {
  if (!data?.length) {
    return <div className="text-sm text-neutral-400 italic text-center p-6">Sem dados.</div>;
  }

  /** 1) top-3 domínios (ou override) */
  const keys = useMemo(() => {
    if (domainsOverride?.length) return domainsOverride;
    const agg: Record<string, number> = {};
    for (const r of data) {
      for (const k of Object.keys(r)) if (k !== "data") agg[k] = (agg[k] || 0) + num((r as any)[k]);
    }
    return Object.entries(agg)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k]) => k);
  }, [data, domainsOverride]);

  /** 2) agrega por semana:
   * - total: média semanal da média diária dos domínios => 0..10
   * - por domínio: média semanal de cada domínio => 0..10
   */
  const weekly = useMemo(() => {
    type Bucket = {
      x: Date;
      days: number;
      sumDailyAvg: number; // para "total"
      byKeySum: Record<string, number>; // para "domains"
      byKeyDays: Record<string, number>;
    };
    const map = new Map<string, Bucket>();

    for (const row of data) {
      const d = toDate(row.data);
      const w = weekStart(d).toISOString();
      if (!map.has(w)) {
        map.set(w, {
          x: weekStart(d),
          days: 0,
          sumDailyAvg: 0,
          byKeySum: {},
          byKeyDays: {},
        });
      }
      const b = map.get(w)!;

      // média diária dos domínios selecionados (mantém 0..10)
      const dailyAvg = keys.reduce((acc, k) => acc + num((row as any)[k]), 0) / (keys.length || 1);
      b.sumDailyAvg += dailyAvg;
      b.days += 1;

      for (const k of keys) {
        const v = num((row as any)[k]);
        b.byKeySum[k] = (b.byKeySum[k] || 0) + v;
        b.byKeyDays[k] = (b.byKeyDays[k] || 0) + 1;
      }
    }

    const rows = [...map.values()].sort((a, b) => a.x.getTime() - b.x.getTime());

    const totalSeries = rows.map((r) => ({ x: r.x, y: r.days ? r.sumDailyAvg / r.days : 0 }));
    const byDomainSeries = keys.map((k, i) => ({
      id: k,
      color: COLORS[i % COLORS.length],
      data: rows.map((r) => ({
        x: r.x,
        y: r.byKeyDays[k] ? r.byKeySum[k] / r.byKeyDays[k] : 0,
      })),
    }));

    return {
      rows,
      total: smooth(totalSeries, 2),
      byDomain: byDomainSeries.map((s) => ({ ...s, data: smooth(s.data, 2) })),
    };
  }, [data, keys]);

  // ticks no máx. 6
  const tickEvery = Math.max(1, Math.floor(weekly.rows.length / 6));
  const tickValues = weekly.rows.filter((_, i) => i % tickEvery === 0).map((w) => w.x);

  /** 3) legenda clicável (modo domains) */
  const [visible, setVisible] = useState<Record<string, boolean>>(
    Object.fromEntries(keys.map((k) => [k, true]))
  );
  const displayedDomains =
    variant === "domains"
      ? weekly.byDomain.map((s) => (visible[s.id as string] ? s : { ...s, data: [] }))
      : [];

  /** média geral para a linha de referência (modo total) */
  const avgTotal =
    variant === "total" && weekly.total.length
      ? weekly.total.reduce((a, b) => a + b.y, 0) / weekly.total.length
      : 0;

  return (
    <div role="img" aria-label="Tendência semanal" style={{ height }}>
      <ResponsiveLine
        data={
          variant === "total"
            ? [{ id: "Total", color: BLUE, data: weekly.total }]
            : (displayedDomains as any)
        }
        xScale={{ type: "time", format: "native", precision: "day" }}
        xFormat="time:%d/%m"
        yScale={{ type: "linear", stacked: false, min: 0, max: 10 }} // escala fixa 0..10 (Apple-like)
        axisBottom={{ tickPadding: 6, tickSize: 0, tickValues, format: "%d/%m" }}
        axisLeft={{ tickPadding: 4, tickSize: 0 }}
        enablePoints={false}
        curve="monotoneX"
        enableGridX={false}
        enableGridY
        colors={(s) => (s.color as string) ?? BLUE}
        lineWidth={variant === "total" ? 2 : 1.5}
        enableArea={variant === "total"}
        areaOpacity={0.28}
        margin={{ top: 8, right: 12, bottom: 28, left: 28 }}
        useMesh
        enableSlices="x"
        legends={
          variant === "domains"
            ? [
                {
                  anchor: "bottom-left",
                  direction: "row",
                  translateY: 20,
                  itemWidth: 120,
                  itemHeight: 16,
                  symbolSize: 8,
                  itemsSpacing: 12,
                  onClick: (d: any) => {
                    const id = d?.id as string;
                    if (id) setVisible((v) => ({ ...v, [id]: !v[id] }));
                  },
                },
              ]
            : undefined
        }
        theme={{
          grid: { line: { stroke: "#F3F4F6", strokeWidth: 1 } },
          axis: { ticks: { text: { fill: "#9CA3AF", fontSize: 10 } } },
          legends: { text: { fill: "#6B7280", fontSize: 11 } },
          crosshair: { line: { stroke: "#D1D5DB", strokeWidth: 1 } },
          tooltip: { container: { fontSize: 12, borderRadius: 8 } },
        }}
        tooltip={({ slice }) => {
          if (!slice) return null;
          const d = slice.points[0]?.data.x as Date;
          return (
            <div className="rounded-md border border-neutral-200 bg-white/95 p-2 text-xs">
              <div className="font-medium mb-1">{fmt.format(d)} (semana)</div>
              {variant === "total" ? (
                <div className="flex items-center gap-1">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{ background: BLUE }}
                  />
                  Intensidade média: {Number(slice.points[0]?.data.y).toFixed(1)}
                </div>
              ) : (
                slice.points.map((p) => (
                  <div key={p.id} className="flex items-center gap-1">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full"
                      style={{ background: p.serieColor }}
                    />
                    {p.serieId}: {Number(p.data.y).toFixed(1)}
                  </div>
                ))
              )}
            </div>
          );
        }}
        markers={
          variant === "total" && avgTotal
            ? [
                {
                  axis: "y",
                  value: avgTotal,
                  lineStyle: { stroke: "#9CA3AF", strokeWidth: 1, strokeDasharray: "4 4" },
                  legend: `média ${avgTotal.toFixed(1)}`,
                  legendPosition: "right",
                  textStyle: { fill: "#6B7280", fontSize: 10 },
                },
              ]
            : []
        }
        animate={false}
      />
    </div>
  );
}

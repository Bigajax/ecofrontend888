import React, { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';

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

  // Transform data for Recharts
  const rechartsData = useMemo(() => {
    if (variant === "total") {
      return weekly.total.map(point => ({
        date: fmt.format(point.x),
        Total: Number(point.y.toFixed(1)),
      }));
    } else {
      const allDates = [...new Set(weekly.byDomain.flatMap(s => s.data.map(d => d.x.getTime())))].sort();
      return allDates.map(timestamp => {
        const date = new Date(timestamp);
        const obj: any = { date: fmt.format(date) };
        weekly.byDomain.forEach(serie => {
          if (visible[serie.id as string]) {
            const point = serie.data.find(d => d.x.getTime() === timestamp);
            obj[serie.id as string] = point ? Number(point.y.toFixed(1)) : 0;
          }
        });
        return obj;
      });
    }
  }, [variant, weekly, visible]);

  return (
    <div role="img" aria-label="Tendência semanal" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rechartsData} margin={{ top: 8, right: 12, bottom: 28, left: 28 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "#9CA3AF", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 10]}
            tick={{ fill: "#9CA3AF", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            content={({ active, payload }) =>
              active && payload?.length ? (
                <div className="rounded-md border border-neutral-200 bg-white/95 p-2 text-xs">
                  <div className="font-medium mb-1">{payload[0].payload.date} (semana)</div>
                  {variant === "total" ? (
                    <div className="flex items-center gap-1">
                      <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: BLUE }} />
                      Intensidade média: {payload[0].value}
                    </div>
                  ) : (
                    payload.map((p, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                        {p.name}: {p.value}
                      </div>
                    ))
                  )}
                </div>
              ) : null
            }
          />
          {variant === "domains" && (
            <Legend
              wrapperStyle={{ fontSize: 11, color: "#6B7280" }}
              onClick={(e) => {
                const id = e.dataKey as string;
                if (id) setVisible((v) => ({ ...v, [id]: !v[id] }));
              }}
            />
          )}
          {variant === "total" && avgTotal > 0 && (
            <ReferenceLine
              y={Number(avgTotal.toFixed(1))}
              stroke="#9CA3AF"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{ value: `média ${avgTotal.toFixed(1)}`, fill: "#6B7280", fontSize: 10, position: "right" }}
            />
          )}
          {variant === "total" ? (
            <Line
              type="monotone"
              dataKey="Total"
              stroke={BLUE}
              strokeWidth={2}
              dot={false}
              fill={BLUE}
              fillOpacity={0.28}
            />
          ) : (
            keys.filter(k => visible[k]).map((domain, i) => (
              <Line
                key={domain}
                type="monotone"
                dataKey={domain}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={1.5}
                dot={false}
              />
            ))
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

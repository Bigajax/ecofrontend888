import React, { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';

type LinhaDoTempoItem = { data: string; [dominio: string]: number | string };

interface Props {
  data: LinhaDoTempoItem[];
  height?: number;
  yMax?: number;
  domainsOverride?: string[];
  /** modo inicial: "total" (padrão) ou "dominios" */
  defaultMode?: "total" | "dominios";
}

const COLORS = ["hsl(205,60%,56%)", "hsl(95,55%,48%)", "hsl(28,85%,55%)"];
const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
const toDate = (v: string) => {
  const d = new Date(v);
  return isNaN(d.getTime()) ? new Date(Date.parse(v)) : d;
};
const fmtDM = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });
const fmtSem = (d: Date) => {
  // label semanal “dd/MM”
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // segunda
  return fmtDM.format(start);
};

// média móvel simples
const movingAvg = (arr: number[], k = 3) =>
  arr.map((_, i) => {
    const s = Math.max(0, i - k + 1);
    const slice = arr.slice(s, i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });

// agrega por semana
function aggregateWeekly(data: LinhaDoTempoItem[], keys: string[]) {
  const bucket: Record<string, { x: Date; yByKey: Record<string, number> }> = {};
  for (const row of data) {
    const d = toDate(row.data);
    const monday = new Date(d);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const k = monday.toISOString();
    if (!bucket[k]) bucket[k] = { x: monday, yByKey: {} };
    for (const key of keys) {
      bucket[k].yByKey[key] = (bucket[k].yByKey[key] || 0) + num((row as any)[key]);
    }
  }
  const points = Object.values(bucket).sort((a, b) => a.x.getTime() - b.x.getTime());
  return points;
}

const LinhaDoTempoEmocional: React.FC<Props> = ({
  data,
  height = 260,
  yMax = 10,
  domainsOverride,
  defaultMode = "total",
}) => {
  if (!data?.length) {
    return (
      <div className="text-sm text-neutral-400 italic text-center p-6">
        Nenhum dado para exibir na linha do tempo.
      </div>
    );
  }

  // domínios (override ou top3)
  const topDomains = useMemo(() => {
    if (domainsOverride?.length) return domainsOverride;
    const sum: Record<string, number> = {};
    for (const row of data) for (const k of Object.keys(row)) if (k !== "data") sum[k] = (sum[k] || 0) + num((row as any)[k]);
    return Object.entries(sum).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
  }, [data, domainsOverride]);

  // --- MODO TOTAL (semanal + suavizado) ---
  const totalSeries = useMemo(() => {
    const weekly = aggregateWeekly(data, topDomains).map(({ x, yByKey }) => ({
      x,
      y: topDomains.reduce((acc, k) => acc + (yByKey[k] || 0), 0),
    }));
    const ySmoothed = movingAvg(weekly.map((p) => p.y), 3);
    const smoothed = weekly.map((p, i) => ({ x: p.x, y: ySmoothed[i] }));
    return [
      {
        id: "Total (semanal)",
        color: COLORS[0],
        data: smoothed,
      },
    ];
  }, [data, topDomains]);

  // --- MODO DOMÍNIOS (linhas limpas) ---
  const domainSeries = useMemo(
    () =>
      topDomains.map((k, i) => ({
        id: k,
        color: COLORS[i % COLORS.length],
        data: data.map((d) => ({ x: toDate(d.data), y: num(d[k]) })),
      })),
    [data, topDomains]
  );

  const [mode, setMode] = useState<"total" | "dominios">(defaultMode);

  // ticks: no máx. 6 rótulos
  const dates = useMemo(() => data.map((d) => toDate(d.data)).sort((a, b) => a.getTime() - b.getTime()), [data]);
  const tickEvery = Math.max(1, Math.floor(dates.length / 6));
  const tickValues = dates.filter((_, i) => i % tickEvery === 0);

  // Transform data for Recharts format
  const rechartsData = useMemo(() => {
    if (mode === "total") {
      return totalSeries[0].data.map(point => ({
        date: fmtDM.format(point.x),
        timestamp: point.x.getTime(),
        Total: point.y,
      }));
    } else {
      // Merge all series into single array of objects
      const allDates = [...new Set(domainSeries.flatMap(s => s.data.map(d => d.x.getTime())))].sort();
      return allDates.map(timestamp => {
        const obj: any = { date: fmtDM.format(new Date(timestamp)), timestamp };
        domainSeries.forEach(serie => {
          const point = serie.data.find(d => d.x.getTime() === timestamp);
          obj[serie.id] = point ? point.y : 0;
        });
        return obj;
      });
    }
  }, [mode, totalSeries, domainSeries]);

  return (
    <div style={{ height }}>
      {/* Segmented control */}
      <div className="mb-2 inline-flex rounded-full border border-neutral-200 p-0.5 bg-neutral-50">
        {[
          { k: "total", label: "Total" },
          { k: "dominios", label: "Por domínio" },
        ].map((opt) => (
          <button
            key={opt.k}
            className={
              "px-3 py-1.5 text-[11px] rounded-full transition " +
              (mode === (opt.k as any)
                ? "bg-white text-neutral-900"
                : "text-neutral-500 hover:text-neutral-700")
            }
            onClick={() => setMode(opt.k as any)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={height - 50}>
        <LineChart data={rechartsData} margin={{ top: 8, right: 12, bottom: 28, left: 28 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "#9CA3AF", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, yMax]}
            tick={{ fill: "#9CA3AF", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            content={({ active, payload }) =>
              active && payload?.length ? (
                <div className="rounded-md border border-neutral-200 bg-white/95 p-2 text-xs">
                  <div className="font-medium mb-1">{payload[0].payload.date}</div>
                  {payload.map((p, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full"
                        style={{ background: p.color }}
                      />
                      {p.name}: {Number(p.value).toFixed(0)}
                    </div>
                  ))}
                </div>
              ) : null
            }
          />
          {mode === "dominios" && <Legend wrapperStyle={{ fontSize: 11, color: "#6B7280" }} />}
          {mode === "dominios" && (
            <ReferenceLine y={3} stroke="#9CA3AF" strokeDasharray="4 4" strokeWidth={1} />
          )}
          {mode === "total" ? (
            <Line
              type="natural"
              dataKey="Total"
              stroke={COLORS[0]}
              strokeWidth={2}
              dot={false}
              fill={COLORS[0]}
              fillOpacity={0.18}
            />
          ) : (
            topDomains.map((domain, i) => (
              <Line
                key={domain}
                type="natural"
                dataKey={domain}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={false}
              />
            ))
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LinhaDoTempoEmocional;

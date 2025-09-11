import React, { useMemo } from "react";

export type LinhaDoTempoItem = { data: string; [dominio: string]: number | string };

type Props = {
  data: LinhaDoTempoItem[];
  /** Quais domínios somar por dia (ordem opcional). Se vazio, pega os top 3 por soma. */
  domainsOverride?: string[];
  /** Janela em dias (30, 90, 180). Se undefined, usa todo o período do dataset. */
  rangeDays?: number;
  /** Altura da faixa (px) – afeta o tamanho dos quadrados. */
  trackHeight?: number;
};

const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
const clamp01to10 = (v: number) => Math.max(0, Math.min(10, v));
const padISO = (d: Date) => d.toISOString().slice(0, 10);

/** cor = interp entre #E5EDFF (claro) → #4F46E5 (escuro) */
function colorFor(value: number) {
  const t = Math.max(0, Math.min(1, value / 10));
  const a = [0xE5, 0xED, 0xFF];
  const b = [0x4F, 0x46, 0xE5];
  const c = a.map((av, i) => Math.round(av + (b[i] - av) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function daysBetween(from: Date, to: Date) {
  const arr: Date[] = [];
  const d = new Date(from);
  d.setHours(12, 0, 0, 0); // evita problemas de fuso
  const end = new Date(to);
  end.setHours(12, 0, 0, 0);
  while (d <= end) {
    arr.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return arr;
}

const monthNames = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const DailyIntensityStrip: React.FC<Props> = ({
  data,
  domainsOverride,
  rangeDays = 90,
  trackHeight = 22,
}) => {
  if (!data?.length) {
    return <div className="text-sm text-neutral-400 italic text-center p-6">Sem dados.</div>;
  }

  /** 1) domínios (override ou top 3) */
  const keys = useMemo(() => {
    if (domainsOverride?.length) return domainsOverride;
    const agg: Record<string, number> = {};
    for (const r of data) {
      for (const k of Object.keys(r)) if (k !== "data") agg[k] = (agg[k] || 0) + num((r as any)[k]);
    }
    return Object.entries(agg).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k])=>k);
  }, [data, domainsOverride]);

  /** 2) soma por dia (0..10) */
  const byDayAll = useMemo(() => {
    return data.map((r) => {
      const total = keys.reduce((acc, k) => acc + num((r as any)[k]), 0);
      return { day: r.data.slice(0,10), value: clamp01to10(total) };
    });
  }, [data, keys]);

  /** 3) range selecionado (últimos N dias) */
  const maxDay = new Date(byDayAll[byDayAll.length - 1].day);
  const minDay = new Date(byDayAll[0].day);
  const toDate = maxDay;
  const fromDate = rangeDays ? new Date(toDate.getTime() - (rangeDays - 1)*24*60*60*1000) : minDay;

  /** 4) mapa dia→valor; e sequência completa de dias (para preencher lacunas) */
  const map = new Map(byDayAll.map(d => [d.day, d.value]));
  const allDays = daysBetween(fromDate, toDate);
  const items = allDays.map(d => {
    const k = padISO(d);
    const value = map.get(k) ?? 0;
    return { date: d, key: k, value };
  });

  /** 5) agrupamento por mês (para os rótulos embaixo) */
  const months: Array<{ label: string; count: number }> = [];
  for (const it of items) {
    const m = it.date.getMonth();
    if (!months.length || monthNames[m] !== months[months.length-1].label) {
      months.push({ label: monthNames[m], count: 1 });
    } else {
      months[months.length-1].count++;
    }
  }

  const cell = trackHeight;     // lado do quadrado
  const gap = 4;                // espaço entre quadrados
  const borderColor = "#E5E7EB";

  return (
    <div className="overflow-x-auto">
      {/* faixa de quadradinhos */}
      <div
        className="flex items-center py-2"
        style={{ gap }}
        role="list"
        aria-label="Intensidade emocional por dia"
      >
        {items.map(({ key, value, date }) => (
          <div
            role="listitem"
            key={key}
            title={`${date.toLocaleDateString("pt-BR")} — ${value}/10`}
            className="rounded-md border"
            style={{
              width: cell,
              height: cell,
              background: colorFor(value),
              borderColor: borderColor,
            }}
          />
        ))}
      </div>

      {/* rótulos de mês dimensionados pela quantidade de dias daquele mês no range */}
      <div className="flex select-none text-[11px] text-neutral-400 mt-1 leading-none">
        {months.map((m, i) => (
          <div key={i} className="text-center" style={{ width: m.count*(cell+gap) - gap }}>
            {m.label}
          </div>
        ))}
      </div>

      {/* rampa baixo↔alto */}
      <div className="mt-2 flex items-center gap-2 text-[11px] text-neutral-500">
        <span>baixo</span>
        <div
          className="h-2 flex-1 rounded"
          style={{
            background: `linear-gradient(90deg, #E5EDFF 0%, #4F46E5 100%)`,
          }}
        />
        <span>alto</span>
      </div>
    </div>
  );
};

export default DailyIntensityStrip;

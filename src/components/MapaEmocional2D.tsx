// src/components/MapaEmocional2D.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { hexbin as d3hexbin } from "d3-hexbin";
import { scaleLinear } from "d3-scale";
import { max as d3max } from "d3-array";

type Ponto = {
  emocao: string;
  valenciaNormalizada: number; // X em [-1, 1]
  excitacaoNormalizada: number; // Y em [-1, 1]
  cor?: string;
};

type Props = {
  data: Ponto[];
  height?: number;
  /** raio do hexágono em px */
  radius?: number;
};

const clamp = (v: number, min = -1, max = 1) => Math.max(min, Math.min(max, v));

/** cor base (teal) com alpha variável */
const hexFill = (alpha: number) => `rgba(16,185,129,${alpha})`; // tailwind emerald-500 approx.

const MapaEmocional2D: React.FC<Props> = ({ data, height = 320, radius = 14 }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>(480);

  // medir largura do container (responsivo)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    if (!('ResizeObserver' in window)) {
      setWidth(Math.max(260, Math.floor(el.offsetWidth)));
      return;
    }

    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      setWidth(Math.max(260, Math.floor(w)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!data?.length) {
    return <div className="text-sm text-neutral-400 italic text-center p-6">Sem pontos.</div>;
  }

  const margin = { top: 10, right: 10, bottom: 28, left: 32 };
  const innerW = Math.max(1, width - margin.left - margin.right);
  const innerH = Math.max(1, height - margin.top - margin.bottom);

  // escalas (−1..1 → área útil)
  const x = useMemo(() => scaleLinear().domain([-1, 1]).range([0, innerW]), [innerW]);
  const y = useMemo(() => scaleLinear().domain([-1, 1]).range([innerH, 0]), [innerH]);

  // pontos normalizados
  const pts = useMemo(
    () =>
      data.map((p) => ({
        x: clamp(p.valenciaNormalizada),
        y: clamp(p.excitacaoNormalizada),
        emocao: p.emocao,
      })),
    [data]
  );

  const hb = useMemo(
    () =>
      d3hexbin<{ x: number; y: number }>()
        .x((d) => x(d.x))
        .y((d) => y(d.y))
        .radius(radius)
        .extent([
          [0, 0],
          [innerW, innerH],
        ]),
    [x, y, radius, innerW, innerH]
  );

  const bins = useMemo(() => hb(pts as any), [hb, pts]);

  const hexagonPath = useMemo(() => hb.hexagon(), [hb]);

  const maxCount = useMemo(() => d3max(bins, (b) => b.length) ?? 1, [bins]);

  const ticks = [-1, -0.5, 0, 0.5, 1];

  return (
    <div ref={wrapRef} className="w-full" style={{ height }}>
      <svg width={width} height={height} role="img" aria-label="Mapa emocional 2D (hexbin)">
        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* grade leve */}
          {ticks.map((t) => (
            <line
              key={`vx-${t}`}
              x1={x(t)}
              x2={x(t)}
              y1={0}
              y2={innerH}
              stroke="#F3F4F6"
              strokeWidth={1}
            />
          ))}
          {ticks.map((t) => (
            <line
              key={`hy-${t}`}
              x1={0}
              x2={innerW}
              y1={y(t)}
              y2={y(t)}
              stroke="#F3F4F6"
              strokeWidth={1}
            />
          ))}

          {/* eixos zero levemente mais fortes */}
          <line x1={x(0)} x2={x(0)} y1={0} y2={innerH} stroke="#E5E7EB" strokeWidth={1.2} />
          <line x1={0} x2={innerW} y1={y(0)} y2={y(0)} stroke="#E5E7EB" strokeWidth={1.2} />

          {/* rótulos dos ticks */}
          {ticks.map((t) => (
            <text
              key={`tx-${t}`}
              x={x(t)}
              y={innerH + 18}
              textAnchor="middle"
              fontSize={10}
              fill="#9CA3AF"
            >
              {t}
            </text>
          ))}
          {ticks.map((t) => (
            <text
              key={`ty-${t}`}
              x={-8}
              y={y(t) + 3}
              textAnchor="end"
              fontSize={10}
              fill="#9CA3AF"
            >
              {t}
            </text>
          ))}

          {/* hexbins — alpha cresce com a densidade */}
          {bins.map((b, i) => {
            const alpha = 0.12 + 0.75 * (b.length / maxCount); // 0.12 → 0.87
            return (
              <path
                key={i}
                transform={`translate(${b.x},${b.y})`}
                d={hexagonPath}
                fill={hexFill(alpha)}
                stroke={hexFill(0.25)}
                strokeWidth={1}
              >
                {/* tooltip nativo do SVG */}
                <title>
                  {`${b.length} memória${b.length > 1 ? "s" : ""}\n`}
                  {`Valência média: ${(
                    b.map((d: any) => d.x).reduce((a: number, c: number) => a + c, 0) / b.length
                  ).toFixed(2)} • Excitação média: ${(
                    b.map((d: any) => d.y).reduce((a: number, c: number) => a + c, 0) / b.length
                  ).toFixed(2)}`}
                </title>
              </path>
            );
          })}
        </g>
      </svg>
    </div>
  );
};

export default MapaEmocional2D;

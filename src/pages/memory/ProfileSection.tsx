import React, { useEffect, useMemo, useState, Suspense } from 'react';
import { useMemoryData } from './memoryData';
import type { Memoria } from '../../api/memoriaApi';
import { listarMemoriasBasico } from '../../api/memoriaApi';

/* ===== Lazy: Nivo ===== */
const LazyResponsiveLine = React.lazy(async () => {
  const mod = await import('@nivo/line');
  return { default: mod.ResponsiveLine };
});
const LazyResponsiveBar = React.lazy(async () => {
  const mod = await import('@nivo/bar');
  return { default: mod.ResponsiveBar };
});

/* ===== Error Boundary ===== */
class ChartErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props:any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch() {/* log opcional */}
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full grid place-items-center text-neutral-400 text-sm">
          Não foi possível renderizar o gráfico.
        </div>
      );
    }
    return this.props.children as any;
  }
}

/* ---------- paleta ---------- */
const EMOTION_COLORS: Record<string, string> = {
  raiva: '#DB2777', irritado: '#EC4899', frustracao: '#BE185D', medo: '#DB2777', incerteza: '#BE185D',
  alegria: '#3B82F6', calmo: '#2563EB', surpresa: '#06B6D4', antecipacao: '#2563EB',
  tristeza: '#8B5CF6', neutro: '#94A3B8',
};
const normalize = (s = '') => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const colorForEmotion = (n: string) => EMOTION_COLORS[normalize(n)] || '#C7D2FE';
const hashHue = (str: string) => { let h = 0; for (let i=0;i<str.length;i++) h = str.charCodeAt(i)+((h<<5)-h); return Math.abs(h)%360; };
const pastel = (str: string) => `hsl(${hashHue(str)}, 40%, 82%)`;

/* ---------- UI ---------- */
const Card: React.FC<React.PropsWithChildren<{ title: string; subtitle?: string; id?: string }>> = ({ title, subtitle, id, children }) => (
  <section id={id} className="bg-white rounded-[24px] border border-black/10 shadow-[0_1px_0_rgba(255,255,255,.8),0_8px_28px_rgba(2,6,23,.05)] p-5 md:p-6" role="region" aria-label={title}>
    <header className="mb-4">
      <h3 className="text-[20px] md:text-[22px] font-semibold text-neutral-900">{title}</h3>
      {subtitle && <p className="text-[13px] text-neutral-500 mt-0.5">{subtitle}</p>}
    </header>
    <div className="border-t border-neutral-100/80 pt-4">{children}</div>
  </section>
);

/* ---------- helpers ---------- */
const day = 24 * 60 * 60 * 1000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const toISOday = (t: number) => new Date(t).toISOString().slice(0, 10); // YYYY-MM-DD

function countBy<T>(arr: T[], key: (x: T) => string | undefined | null) {
  const map = new Map<string, number>();
  for (const item of arr) {
    const k = (key(item) || '').trim();
    if (!k) continue;
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return map;
}
function buildLocalPerfil(memories: Memoria[]) {
  const emoMap = countBy(memories, (m) => (m.emocao_principal || '').toString());
  const emocoes_frequentes: Record<string, number> = {};
  emoMap.forEach((v, k) => (emocoes_frequentes[k] = v));
  const temas = new Map<string, number>();
  for (const m of memories) {
    const domain = (m as any).dominio_vida || (m as any).dominio || (m as any).domain || '';
    const categoria = (m as any).categoria || '';
    const tags: string[] = Array.isArray(m.tags)
      ? (m.tags as string[])
      : typeof (m as any).tags === 'string'
      ? (m as any).tags.split(/[;,]/)
      : [];
    const add = (t?: string) => { const k = (t || '').trim(); if (!k) return; temas.set(k, (temas.get(k) ?? 0) + 1); };
    add(domain); add(categoria); tags.forEach(add);
  }
  const temas_recorrentes: Record<string, number> = {};
  temas.forEach((v, k) => (temas_recorrentes[k] = v));
  return { emocoes_frequentes, temas_recorrentes };
}

/* === Período === */
type Period = 7 | 28 | 90;
const PERIOD_LABEL: Record<Period, string> = { 7: '7d', 28: '28d', 90: '90d' };

function filterByDays(memories: Memoria[], days: Period) {
  const now = startOfDay(new Date());
  const since = now.getTime() - days * day;
  return memories.filter(m => {
    const t = new Date(m.created_at || 0).getTime();
    return Number.isFinite(t) && t >= since;
  });
}
function buildStats(memories: Memoria[], days: Period) {
  const scoped = filterByDays(memories, days);
  const emo = countBy(scoped, m => m.emocao_principal || null);
  const emoArr = [...emo.entries()].sort((a,b)=>b[1]-a[1]);
  const dominante = emoArr[0]?.[0] ?? null;
  const last28 = filterByDays(memories, 28);
  const totalPeriodo = scoped.length;
  const media28 = Math.round((last28.length / 28) * 10) / 10;
  return { totalPeriodo, media28, dominante };
}
function buildSparklineData(memories: Memoria[], days: Period) {
  const now = startOfDay(new Date());
  const start = now.getTime() - days * day;
  const buckets = new Map<number, number>();
  for (let i = 0; i < days; i++) buckets.set(start + i * day, 0);
  memories.forEach(m => {
    const t = startOfDay(new Date(m.created_at || 0)).getTime();
    if (Number.isFinite(t) && t >= start) buckets.set(t, (buckets.get(t) ?? 0) + 1);
  });
  return [...buckets.entries()]
    .map(([t, v]) => ({ t, v: Number.isFinite(v) ? v : 0 }))
    .filter(d => Number.isFinite(d.t));
}

/* toggle segmentado */
const SegmentedControl: React.FC<{ value: Period; onChange: (p: Period)=>void }> = ({ value, onChange }) => {
  const base = 'px-4 h-9 rounded-full text-[14px] font-medium transition';
  const item = (p: Period) => `${base} ${value===p ? 'bg-neutral-900 text-white shadow-sm' : 'text-neutral-700 hover:bg-neutral-100'}`;
  return (
    <div role="tablist" aria-label="Período" className="inline-flex p-1 rounded-full border border-black/10 bg-white shadow-sm gap-1">
      {[7,28,90].map(p => (
        <button key={p} role="tab" aria-selected={value===p} className={item(p as Period)} onClick={()=>onChange(p as Period)}>
          {PERIOD_LABEL[p as Period]}
        </button>
      ))}
    </div>
  );
};

/* ---------- componente ---------- */
const ProfileSection: React.FC = () => {
  const { perfil, memories, loading, error } = useMemoryData();

  const [memLocal, setMemLocal] = useState<Memoria[] | null>(null);
  const [fetchingLocal, setFetchingLocal] = useState(false);
  const [period, setPeriod] = useState<Period>(7);
  const [isClient, setIsClient] = useState(false); // só monta Nivo no client

  useEffect(() => { setIsClient(true); }, []);

  useEffect(() => {
    const needLocal = (!perfil || (!perfil.emocoes_frequentes && !perfil.temas_recorrentes)) && (!memories || memories.length === 0);
    if (!needLocal || fetchingLocal || memLocal) return;
    setFetchingLocal(true);
    listarMemoriasBasico(600).then(setMemLocal).finally(()=>setFetchingLocal(false));
  }, [perfil, memories, fetchingLocal, memLocal]);

  const allMemories: Memoria[] = (memories?.length ? memories : (memLocal || []));
  const memScoped = useMemo(() => filterByDays(allMemories, period), [allMemories, period]);

  const emotionChart = useMemo(() => {
    const data = buildLocalPerfil(memScoped).emocoes_frequentes || {};
    return Object.entries(data)
      .map(([name, value]) => ({ name, value: Number(value) }))
      .filter(d => Number.isFinite(d.value))
      .sort((a,b)=>b.value-a.value)
      .slice(0,5);
  }, [memScoped]);

  const themeChart = useMemo(() => {
    const data = buildLocalPerfil(memScoped).temas_recorrentes || {};
    return Object.entries(data)
      .map(([name, value]) => ({ name, value: Number(value) }))
      .filter(d => Number.isFinite(d.value))
      .sort((a,b)=>b.value-a.value)
      .slice(0,5);
  }, [memScoped]);

  const sparkData = useMemo(() => buildSparklineData(allMemories, period), [allMemories, period]);
  const { totalPeriodo, media28, dominante } = useMemo(() => buildStats(allMemories, period), [allMemories, period]);

  const stillLoading = loading || fetchingLocal;
  if (stillLoading) return <div className="flex justify-center items-center h-full text-neutral-500 text-sm">Carregando…</div>;
  if (error)        return <div className="flex justify-center items-center h-full text-rose-500 text-sm">{error}</div>;

  const insight = dominante
    ? `Você tem registrado mais ${dominante} que outras emoções nos últimos ${period} dias.`
    : `Você ainda não tem registros no período selecionado.`;
  const comp = (totalPeriodo && media28 !== undefined)
    ? `Últimos ${period} dias: ${totalPeriodo} registros • Média diária (28d): ${media28}`
    : null;
  const periodLabel = PERIOD_LABEL[period];

  /* ==== Nivo data (strings YYYY-MM-DD + guards) ==== */
  const lineData = useMemo(() => {
    const serie = sparkData
      .map(d => ({ x: toISOday(d.t), y: d.v }))
      .filter(pt => typeof pt.x === 'string' && Number.isFinite(pt.y));
    return [{ id: 'registros', data: serie }];
  }, [sparkData]);
  const hasLinePoints = lineData[0]?.data?.length > 0;

  const emotionsData = emotionChart.map(d => ({ name: d.name, value: d.value }));
  const themesData   = themeChart.map(d => ({ name: d.name, value: d.value }));

  return (
    // SCROLL habilitado aqui
    <div className="min-h-0 h-[calc(100vh-96px)] overflow-y-auto">
      <div className="mx-auto w-full max-w-[960px] px-4 md:px-6 py-4 md:py-6 space-y-10">
        {/* CARD 1 — Resumo */}
        <Card title="Resumo" id="resumo">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="pb-2">
              <p className="text-[15px] md:text-[16px] text-neutral-700">{insight}</p>
              {comp && <p className="mt-1 text-[13px] text-neutral-500">{comp}</p>}
            </div>
            <div className="sticky top-2">
              <SegmentedControl value={period} onChange={setPeriod} />
            </div>
          </div>

          <div className="mt-4 border-t border-neutral-100/80 pt-4">
            <div className="h-[84px]">
              {isClient && hasLinePoints ? (
                <ChartErrorBoundary>
                  <Suspense fallback={<div className="w-full h-full grid place-items-center text-neutral-400 text-sm">Carregando…</div>}>
                    <LazyResponsiveLine
                      data={lineData}
                      margin={{ top: 6, right: 8, bottom: 6, left: 8 }}
                      xScale={{ type: 'time', format: '%Y-%m-%d', precision: 'day', useUTC: false }}
                      xFormat="time:%d/%m"
                      yScale={{ type: 'linear', min: 0, max: 'auto' }}
                      axisBottom={null}
                      axisLeft={null}
                      enablePoints={false}
                      enableArea={true}
                      areaOpacity={0.15}
                      useMesh={true}
                      enableGridX={false}
                      enableGridY={true}
                      curve="monotoneX"
                      colors={['#111827']}
                      theme={{
                        grid: { line: { stroke: '#F3F4F6' } },
                        tooltip: { container: { fontSize: 12, borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.08)' } },
                      }}
                      tooltip={({ point }) => (
                        <div className="rounded-xl bg-white/95 border border-black/10 px-3 py-2 text-[12px]">
                          <div className="font-medium">{point.data.xFormatted as string}</div>
                          <div>{String(point.data.y)} registro{Number(point.data.y) === 1 ? '' : 's'}</div>
                        </div>
                      )}
                    />
                  </Suspense>
                </ChartErrorBoundary>
              ) : (
                <div className="w-full h-full grid place-items-center text-neutral-400 text-sm">
                  Sem dados no período
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* CARD 2 — Emoções mais frequentes */}
        <Card title="Emoções mais frequentes" subtitle={`Período: ${periodLabel}`} id="emocoes">
          {isClient && emotionsData.length ? (
            <div className="h-[300px]">
              <ChartErrorBoundary>
                <Suspense fallback={<div className="w-full h-full grid place-items-center text-neutral-400 text-sm">Carregando…</div>}>
                  <LazyResponsiveBar
                    data={emotionsData}
                    keys={['value']}
                    indexBy="name"
                    margin={{ top: 12, right: 12, bottom: 24, left: 36 }}
                    padding={0.26}
                    colors={(bar) => colorForEmotion(bar.data.name as string)}
                    borderRadius={12}
                    axisTop={null}
                    axisRight={null}
                    axisBottom={{ tickSize: 0, tickPadding: 6 }}
                    axisLeft={{ tickSize: 0, tickPadding: 6 }}
                    enableGridY={true}
                    labelSkipHeight={9999}
                    tooltip={({ indexValue, value }) => (
                      <div className="rounded-xl bg-white/95 border border-black/10 px-3 py-2 text-[12px]">
                        <div className="font-medium">{indexValue as string}</div>
                        <div>{String(value)}</div>
                      </div>
                    )}
                    theme={{
                      grid: { line: { stroke: '#F3F4F6' } },
                      tooltip: { container: { fontSize: 12, borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.08)' } },
                    }}
                  />
                </Suspense>
              </ChartErrorBoundary>
            </div>
          ) : (
            <div className="grid place-items-center text-neutral-500 h-[240px]">
              <div className="text-center">
                <p className="text-neutral-900 font-medium">Sem dados no período</p>
                <p className="text-sm">Registre memórias para ver seu perfil aqui.</p>
              </div>
            </div>
          )}
        </Card>

        {/* CARD 3 — Temas mais recorrentes */}
        <Card title="Temas mais recorrentes" subtitle={`Período: ${periodLabel}`} id="temas">
          {isClient && themesData.length ? (
            <div className="h-[300px]">
              <ChartErrorBoundary>
                <Suspense fallback={<div className="w-full h-full grid place-items-center text-neutral-400 text-sm">Carregando…</div>}>
                  <LazyResponsiveBar
                    data={themesData}
                    keys={['value']}
                    indexBy="name"
                    layout="horizontal"
                    margin={{ top: 8, right: 16, bottom: 8, left: 140 }}
                    padding={0.3}
                    colors={(bar) => pastel(bar.data.name as string)}
                    borderRadius={12}
                    axisTop={null}
                    axisRight={null}
                    axisLeft={{ tickSize: 0, tickPadding: 6 }}
                    axisBottom={null}
                    enableGridX={true}
                    labelSkipWidth={9999}
                    tooltip={({ indexValue, value }) => (
                      <div className="rounded-xl bg-white/95 border border-black/10 px-3 py-2 text-[12px]">
                        <div className="font-medium">{indexValue as string}</div>
                        <div>{String(value)}</div>
                      </div>
                    )}
                    theme={{
                      grid: { line: { stroke: '#F3F4F6' } },
                      tooltip: { container: { fontSize: 12, borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.08)' } },
                    }}
                  />
                </Suspense>
              </ChartErrorBoundary>
            </div>
          ) : (
            <div className="grid place-items-center text-neutral-500 h-[240px]">
              <div className="text-center">
                <p className="text-neutral-900 font-medium">Sem dados no período</p>
                <p className="text-sm">Crie registros para descobrir seus principais temas.</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ProfileSection;

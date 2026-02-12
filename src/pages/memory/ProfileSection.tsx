// src/pages/memory/ProfileSection.tsx
import { useEffect, useMemo, useState, Suspense, lazy, Component } from 'react';
import type { FC, PropsWithChildren, ReactNode } from 'react';
import { useMemoryData } from './memoryData';
import type { ApiErrorDetails } from './memoryData';
import type { Memoria } from '../../api/memoriaApi';
import { listarMemoriasBasico } from '../../api/memoriaApi';
import { useAuth } from '../../contexts/AuthContext';
import { emotionPalette, resolveEmotionKey } from './emotionTokens';

import EcoBubbleLoading from '../../components/EcoBubbleLoading';

/* ===== Recharts (replacement for Nivo) ===== */
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

/* ===== Error Boundary ===== */
type EBState = { hasError: boolean };
class ChartErrorBoundary extends Component<PropsWithChildren<{}>, EBState> {
  constructor(props: PropsWithChildren<{}>) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render(): ReactNode {
    if (this.state.hasError) {
      return <div className="w-full h-full grid place-items-center text-neutral-400 text-sm">
        Não foi possível renderizar o gráfico.
      </div>;
    }
    return this.props.children as ReactNode;
  }
}

/* ---------- paleta ---------- */
const colorForEmotion = (n: string) => emotionPalette[resolveEmotionKey(n)] || '#C7D2FE';
const hashHue = (str: string) => { let h = 0; for (let i=0;i<str.length;i++) h = str.charCodeAt(i)+((h<<5)-h); return Math.abs(h)%360; };
const pastel = (str: string) => `hsl(${hashHue(str)}, 40%, 82%)`;

/* ---------- UI ---------- */
const Card: FC<PropsWithChildren<{ title: string; subtitle?: string; id?: string }>> = ({ title, subtitle, id, children }) => (
  <section
    id={id}
    className="rounded-2xl border backdrop-blur-md p-6 md:p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
    style={{
      backgroundColor: 'rgba(243, 238, 231, 0.6)',
      borderColor: 'var(--eco-line, #E8E3DD)',
      boxShadow: '0 4px 30px rgba(0, 0, 0, 0.04)',
    }}
    role="region"
    aria-label={title}
  >
    <header className="mb-4">
      <h3
        className="text-[20px] md:text-[22px] font-normal md:font-semibold transition-colors duration-300"
        style={{
          color: 'var(--eco-text, #38322A)',
          fontFamily: 'var(--font-display, Playfair Display, Georgia, serif)',
        }}
      >
        {title}
      </h3>
      {subtitle && (
        <p
          className="text-[13px] mt-0.5"
          style={{ color: 'var(--eco-muted, #9C938A)' }}
        >
          {subtitle}
        </p>
      )}
    </header>
    <div
      className="border-t pt-4"
      style={{ borderColor: 'var(--eco-line, #E8E3DD)' }}
    >
      {children}
    </div>
  </section>
);

/* ---------- helpers ---------- */
const day = 24 * 60 * 60 * 1000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const toISOday = (t: number) => new Date(t).toISOString().slice(0, 10);

// deepClone removed - not needed with Recharts (only needed for Nivo's frozen objects issue)

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
    const tags: string[] = Array.isArray(m.tags) ? (m.tags as string[])
      : typeof (m as any).tags === 'string' ? (m as any).tags.split(/[;,]/) : [];
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
  return [...buckets.entries()].map(([t, v]) => ({ t, v: Number(v) || 0 })).filter(d => Number.isFinite(d.t));
}

/* toggle segmentado */
const SegmentedControl: FC<{ value: Period; onChange: (p: Period)=>void }> = ({ value, onChange }) => {
  const base = 'px-4 h-9 rounded-full text-[14px] font-medium transition-all duration-300';
  const item = (p: Period) => `${base} ${
    value===p
      ? 'text-white shadow-[0_2px_12px_rgba(0,0,0,0.08)]'
      : 'hover:-translate-y-0.5'
  }`;
  return (
    <div
      role="tablist"
      aria-label="Período"
      className="inline-flex p-1 rounded-full border gap-1 backdrop-blur-sm"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        borderColor: 'var(--eco-line, #E8E3DD)',
      }}
    >
      {[7,28,90].map(p => (
        <button
          key={p}
          role="tab"
          aria-selected={value===p}
          className={item(p as Period)}
          onClick={()=>onChange(p as Period)}
          style={
            value === p
              ? {
                  background: 'linear-gradient(90deg, var(--eco-user, #A7846C), var(--eco-accent, #C6A995))',
                  color: 'white',
                }
              : {
                  color: 'var(--eco-text, #38322A)',
                }
          }
        >
          {PERIOD_LABEL[p as Period]}
        </button>
      ))}
    </div>
  );
};

/* ---------- componente ---------- */
const ProfileSection: FC = () => {
  const { userId } = useAuth();
  const {
    perfil,
    memories,
    perfilLoading,
    memoriesLoading,
    perfilError,
    memoriesError,
    perfilErrorDetails,
    memoriesErrorDetails,
  } = useMemoryData();
  const [memLocal, setMemLocal] = useState<Memoria[] | null>(null);
  const [fetchingLocal, setFetchingLocal] = useState(false);
  const [period, setPeriod] = useState<Period>(7);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => { setIsClient(true); }, []);

  useEffect(() => {
    const needLocal =
      (!perfil || (!perfil.emocoes_frequentes && !perfil.temas_recorrentes)) &&
      (!memories || memories.length === 0);
    if (!needLocal || fetchingLocal || memLocal || !userId) return;
    setFetchingLocal(true);
    listarMemoriasBasico(userId, 600)
      .then((arr) => setMemLocal(Array.isArray(arr) ? (arr.filter(Boolean) as Memoria[]) : []))
      .catch(() => setMemLocal([]))
      .finally(() => setFetchingLocal(false));
  }, [perfil, memories, fetchingLocal, memLocal, userId]);

  const allMemories: Memoria[] = (memories?.length ? memories : (memLocal || []));
  const memScoped = useMemo(() => filterByDays(allMemories, period), [allMemories, period]);

  const emotionChart = useMemo(() => {
    const data = buildLocalPerfil(memScoped).emocoes_frequentes || {};
    return Object.entries(data).map(([name, value]) => ({ name, value: Number(value) }))
      .filter(d => Number.isFinite(d.value)).sort((a,b)=>b.value-a.value).slice(0,5);
  }, [memScoped]);

  const themeChart = useMemo(() => {
    const data = buildLocalPerfil(memScoped).temas_recorrentes || {};
    return Object.entries(data).map(([name, value]) => ({ name, value: Number(value) }))
      .filter(d => Number.isFinite(d.value)).sort((a,b)=>b.value-a.value).slice(0,5);
  }, [memScoped]);

  const sparkData = useMemo(() => buildSparklineData(allMemories, period), [allMemories, period]);
  const { totalPeriodo, media28, dominante } = useMemo(() => buildStats(allMemories, period), [allMemories, period]);

  const insight = dominante
    ? `Você tem registrado mais ${dominante} que outras emoções nos últimos ${period} dias.`
    : `Você ainda não tem registros no período selecionado.`;
  const comp = (totalPeriodo && media28 !== undefined)
    ? `Últimos ${period} dias: ${totalPeriodo} registros • Média diária (28d): ${media28}`
    : null;
  const periodLabel = PERIOD_LABEL[period];

  const lineData = useMemo(() => {
    const serie = (sparkData ?? [])
      .filter(d => Number.isFinite(d.t) && Number.isFinite(d.v))
      .map(d => ({ x: toISOday(d.t), y: Number(d.v) || 0 }))
      .filter(pt => pt.x.length > 0);
    return [{ id: 'registros', data: serie }];
  }, [sparkData]);
  const hasLinePoints = !!lineData[0]?.data?.length;

  const emotionsData = useMemo(
    () => (emotionChart ?? []).map(d => ({ name: String(d.name ?? ''), value: Number(d.value) || 0 })).filter(d => d.name.length > 0),
    [emotionChart]
  );
  const themesData = useMemo(
    () => (themeChart ?? []).map(d => ({ name: String(d.name ?? ''), value: Number(d.value) || 0 })).filter(d => d.name.length > 0),
    [themeChart]
  );

  // Safe copies removed - Recharts doesn't have the frozen objects issue that Nivo had

  const noRemoteData = (!perfil || (!perfil.emocoes_frequentes && !perfil.temas_recorrentes)) && (allMemories.length === 0);

  return (
    <div
      className="min-h-0 h-[calc(100vh-96px)] overflow-y-auto transition-colors duration-300"
      style={{ backgroundColor: 'var(--eco-bg, #FAF9F7)' }}
    >
      {noRemoteData && (
        <div className="mx-auto w-full max-w-[980px] px-4 md:px-6 pt-4">
          <div
            className="rounded-2xl border px-4 py-3 text-sm backdrop-blur-sm"
            style={{
              backgroundColor: 'rgba(217, 119, 6, 0.08)',
              borderColor: 'rgba(217, 119, 6, 0.3)',
              color: 'var(--eco-text, #38322A)',
            }}
          >
            Não consegui carregar dados do servidor agora (offline/indisponível). Quando voltar, os gráficos se atualizam.
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-[980px] px-4 md:px-6 py-6 md:py-8 space-y-8 md:space-y-10">
        {(perfilLoading || memoriesLoading || fetchingLocal) && (
          <div
            className="rounded-2xl border px-4 py-10 grid place-items-center backdrop-blur-sm"
            style={{
              backgroundColor: 'rgba(243, 238, 231, 0.6)',
              borderColor: 'var(--eco-line, #E8E3DD)',
            }}
          >
            <EcoBubbleLoading size={72} text="Carregando…" />
          </div>
        )}
        {(() => {
          const messages = [
            perfilError && { message: perfilError, details: perfilErrorDetails },
            memoriesError && { message: memoriesError, details: memoriesErrorDetails },
          ].filter(Boolean) as Array<{ message: string; details: ApiErrorDetails | null }>;

          if (!messages.length) return null;

          return (
            <div
              className="rounded-2xl border px-4 py-3 text-sm space-y-2 backdrop-blur-sm"
              style={{
                backgroundColor: 'rgba(217, 119, 6, 0.08)',
                borderColor: 'rgba(217, 119, 6, 0.3)',
                color: 'var(--eco-text, #38322A)',
              }}
            >
              {messages.map(({ message, details }, index) => (
                <div key={`${message}-${index}`}>
                  <p className="font-medium">{message}</p>
                  {details?.status || details?.message ? (
                    <p
                      className="mt-1 text-[12px]"
                      style={{ color: 'var(--eco-muted, #9C938A)' }}
                    >
                      Detalhes técnicos:{' '}
                      {details?.status
                        ? `${details.status}${details.statusText ? ` ${details.statusText}` : ''}`
                        : 'status indisponível'}
                      {details?.message ? ` • ${details.message}` : ''}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          );
        })()}

        {/* CARD 1 — Resumo */}
        <Card title="Resumo" id="resumo">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="pb-2">
              <p
                className="text-[15px] md:text-[16px] transition-colors duration-300"
                style={{ color: 'var(--eco-text, #38322A)' }}
              >
                {insight}
              </p>
              {comp && (
                <p
                  className="mt-1 text-[13px]"
                  style={{ color: 'var(--eco-muted, #9C938A)' }}
                >
                  {comp}
                </p>
              )}
              <div className="mt-3">
                <div
                  className="text-[13px]"
                  style={{ color: 'var(--eco-muted, #9C938A)' }}
                >
                  Média diária (28d)
                </div>
                <div
                  className="text-[32px] leading-[1.1] font-semibold transition-colors duration-300"
                  style={{
                    color: 'var(--eco-user, #A7846C)',
                    fontFamily: 'var(--font-display, Playfair Display, Georgia, serif)',
                  }}
                >
                  {media28?.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                  <span
                    className="ml-1 text-[14px] font-normal transition-colors duration-300"
                    style={{ color: 'var(--eco-muted, #9C938A)' }}
                  >
                    reg/dia
                  </span>
                </div>
                <div
                  className="mt-1 text-[13px]"
                  style={{ color: 'var(--eco-muted, #9C938A)' }}
                >
                  Período {periodLabel}: {totalPeriodo} registros
                </div>
              </div>
            </div>
            <div className="sticky top-2"><SegmentedControl value={period} onChange={setPeriod} /></div>
          </div>

          <div
            className="mt-4 border-t pt-4"
            style={{ borderColor: 'var(--eco-line, #E8E3DD)' }}
          >
            <div className="h-[96px]">
              {isClient && hasLinePoints ? (
                <ChartErrorBoundary>
                  <Suspense fallback={<div className="w-full h-full grid place-items-center"><EcoBubbleLoading size={28} /></div>}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={lineData[0]?.data ?? []}
                        margin={{ top: 6, right: 8, bottom: 6, left: 8 }}
                      >
                        <XAxis dataKey="x" hide />
                        <YAxis hide domain={[0, 'auto']} />
                        <Tooltip
                          content={({ active, payload }: any) =>
                            active && payload?.length ? (
                              <div
                                className="rounded-xl border px-3 py-2 text-[12px] backdrop-blur-sm"
                                style={{
                                  backgroundColor: 'rgba(243, 238, 231, 0.95)',
                                  borderColor: 'var(--eco-line, #E8E3DD)',
                                  color: 'var(--eco-text, #38322A)',
                                }}
                              >
                                <div className="font-medium">{payload[0].payload.x}</div>
                                <div>{payload[0].value} registro{payload[0].value === 1 ? '' : 's'}</div>
                              </div>
                            ) : null
                          }
                        />
                        <Line
                          type="monotone"
                          dataKey="y"
                          stroke="var(--eco-user, #A7846C)"
                          strokeWidth={2}
                          dot={false}
                          fill="var(--eco-user, #A7846C)"
                          fillOpacity={0.15}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Suspense>
                </ChartErrorBoundary>
              ) : (
                <div
                  className="w-full h-full grid place-items-center text-sm"
                  style={{ color: 'var(--eco-muted, #9C938A)' }}
                >
                  Sem dados no período
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* CARD 2 — Emoções */}
        <Card title="Emoções mais frequentes" subtitle={`Período: ${periodLabel}`} id="emocoes">
          {isClient && emotionsData.length ? (
            <div className="h-[300px]">
              <ChartErrorBoundary>
                <Suspense fallback={<div className="w-full h-full grid place-items-center"><EcoBubbleLoading size={32} /></div>}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={emotionsData}
                      margin={{ top: 12, right: 12, bottom: 0, left: 40 }}
                      barCategoryGap="32%"
                    >
                      <XAxis dataKey="name" hide />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--eco-muted, #9C938A)', fontSize: 12 }}
                      />
                      <Tooltip
                        content={({ active, payload }: any) =>
                          active && payload?.length ? (
                            <div
                              className="rounded-xl border px-3 py-2 text-[12px] backdrop-blur-sm"
                              style={{
                                backgroundColor: 'rgba(243, 238, 231, 0.95)',
                                borderColor: colorForEmotion(payload[0].payload.name),
                                color: 'var(--eco-text, #38322A)',
                              }}
                            >
                              <div className="font-medium">{payload[0].payload.name}</div>
                              <div>{payload[0].value}</div>
                            </div>
                          ) : null
                        }
                      />
                      <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                        {emotionsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={colorForEmotion(entry.name)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Suspense>
              </ChartErrorBoundary>
            </div>
          ) : (
            <div
              className="grid place-items-center h-[240px]"
              style={{ color: 'var(--eco-muted, #9C938A)' }}
            >
              <div className="text-center">
                <p
                  className="font-medium"
                  style={{ color: 'var(--eco-text, #38322A)' }}
                >
                  Sem dados no período
                </p>
                <p className="text-sm">Registre memórias para ver seu perfil aqui.</p>
              </div>
            </div>
          )}
        </Card>

        {/* CARD 3 — Temas */}
        <Card title="Temas mais recorrentes" subtitle={`Período: ${periodLabel}`} id="temas">
          {isClient && themesData.length ? (
            <div className="h-[300px]">
              <ChartErrorBoundary>
                <Suspense fallback={<div className="w-full h-full grid place-items-center"><EcoBubbleLoading size={32} /></div>}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={themesData}
                      layout="horizontal"
                      margin={{ top: 8, right: 16, bottom: 8, left: 160 }}
                      barCategoryGap="30%"
                    >
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--eco-text, #38322A)', fontSize: 12 }}
                        width={150}
                      />
                      <Tooltip
                        content={({ active, payload }: any) =>
                          active && payload?.length ? (
                            <div
                              className="rounded-xl border px-3 py-2 text-[12px] backdrop-blur-sm"
                              style={{
                                backgroundColor: 'rgba(243, 238, 231, 0.95)',
                                borderColor: 'var(--eco-line, #E8E3DD)',
                                color: 'var(--eco-text, #38322A)',
                              }}
                            >
                              <div className="font-medium">{payload[0].payload.name}</div>
                              <div>{payload[0].value}</div>
                            </div>
                          ) : null
                        }
                      />
                      <Bar dataKey="value" radius={[0, 12, 12, 0]}>
                        {themesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={pastel(entry.name)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Suspense>
              </ChartErrorBoundary>
            </div>
          ) : (
            <div
              className="grid place-items-center h-[240px]"
              style={{ color: 'var(--eco-muted, #9C938A)' }}
            >
              <div className="text-center">
                <p
                  className="font-medium"
                  style={{ color: 'var(--eco-text, #38322A)' }}
                >
                  Sem dados no período
                </p>
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

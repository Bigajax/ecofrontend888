import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  LineChart, Line, CartesianGrid
} from 'recharts';
import { useMemoryData } from './memoryData';
import type { Memoria } from '../../api/memoriaApi';
import { listarMemoriasBasico } from '../../api/memoriaApi';

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
const Card: React.FC<React.PropsWithChildren<{ title: string; subtitle?: string }>> = ({ title, subtitle, children }) => (
  <section
    className="bg-white rounded-[24px] border border-black/10 shadow-[0_1px_0_rgba(255,255,255,.8),0_8px_28px_rgba(2,6,23,.05)] p-4 md:p-5 mb-6"
    role="region"
    aria-label={title}
  >
    <h3 className="text-[17px] md:text-[18px] font-semibold text-neutral-900">{title}</h3>
    {subtitle && <p className="text-[13px] text-neutral-500 mt-0.5">{subtitle}</p>}
    <div className="mt-3">{children}</div>
  </section>
);

const CustomTooltip = ({ active, payload, label }: any) =>
  active && payload?.length ? (
    <div aria-live="polite" className="rounded-xl bg-white/90 border border-black/10 px-3 py-2 text-[13px] text-neutral-700 shadow-md">
      <div className="font-medium">{label}</div>
      <div>{payload[0].value}</div>
    </div>
  ) : null;

/* ---------- helpers ---------- */
const day = 24 * 60 * 60 * 1000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

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

function buildStats(memories: Memoria[]) {
  const now = startOfDay(new Date());
  const d7  = now.getTime() - 7  * day;
  const d28 = now.getTime() - 28 * day;

  const last7  = memories.filter(m => new Date(m.created_at!).getTime() >= d7);
  const last28 = memories.filter(m => new Date(m.created_at!).getTime() >= d28);

  const emo7 = countBy(last7, m => m.emocao_principal || null);
  const emo7Arr = [...emo7.entries()].sort((a,b)=>b[1]-a[1]);
  const dominante7 = emo7Arr[0]?.[0];

  const total7 = last7.length;
  const media28 = Math.round((last28.length / 28) * 10) / 10;

  return { total7, media28, dominante7 };
}

// sparkline nos últimos 28 dias (contagem por dia)
function buildSparklineData(memories: Memoria[]) {
  const now = startOfDay(new Date());
  const dStart = now.getTime() - 28 * day;

  const buckets = new Map<number, number>();
  for (let i = 0; i < 28; i++) buckets.set(dStart + i * day, 0);

  memories.forEach(m => {
    const t = startOfDay(new Date(m.created_at!)).getTime();
    if (t >= dStart) buckets.set(t, (buckets.get(t) ?? 0) + 1);
  });

  return [...buckets.entries()].map(([t, v]) => ({ t, v }));
}

const Sparkline: React.FC<{ data: { t: number; v: number }[] }> = ({ data }) => (
  <div className="mt-3 h-[60px]">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 4, right: 6, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#F3F4F6" />
        <XAxis dataKey="t" hide />
        <YAxis hide />
        <Line
          type="monotone"
          dataKey="v"
          stroke="#111827"
          strokeOpacity={0.35}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

/* ---------- componente ---------- */
const ProfileSection: React.FC = () => {
  const { perfil, memories, loading, error } = useMemoryData();

  const [memLocal, setMemLocal] = useState<Memoria[] | null>(null);
  const [fetchingLocal, setFetchingLocal] = useState(false);

  useEffect(() => {
    const needLocal = (!perfil || (!perfil.emocoes_frequentes && !perfil.temas_recorrentes)) && (!memories || memories.length === 0);
    if (!needLocal || fetchingLocal || memLocal) return;
    setFetchingLocal(true);
    listarMemoriasBasico(600)
      .then((arr) => setMemLocal(arr))
      .finally(() => setFetchingLocal(false));
  }, [perfil, memories, fetchingLocal, memLocal]);

  const sourceMemories: Memoria[] = (memories && memories.length > 0) ? memories : (memLocal || []);

  const effectivePerfil = useMemo(() => {
    if (perfil && (perfil.emocoes_frequentes || perfil.temas_recorrentes)) return perfil;
    return buildLocalPerfil(sourceMemories);
  }, [perfil, sourceMemories]);

  const emotionChart = useMemo(() => {
    const src = effectivePerfil?.emocoes_frequentes || {};
    return Object.entries(src)
      .map(([name, value]) => ({ name, value: Number(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [effectivePerfil]);

  const themeChart = useMemo(() => {
    const src = effectivePerfil?.temas_recorrentes || {};
    return Object.entries(src)
      .map(([name, value]) => ({ name, value: Number(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [effectivePerfil]);

  const sparkData = useMemo(() => buildSparklineData(sourceMemories), [sourceMemories]);
  const { total7, media28, dominante7 } = useMemo(() => buildStats(sourceMemories), [sourceMemories]);

  const stillLoading = loading || fetchingLocal;
  if (stillLoading) return <div className="flex justify-center items-center h-full text-neutral-500 text-sm">Carregando…</div>;
  if (error)        return <div className="flex justify-center items-center h-full text-rose-500 text-sm">{error}</div>;

  const insight =
    dominante7
      ? `Você tem registrado mais ${dominante7} que outras emoções nos últimos 7 dias.`
      : `Você ainda não tem registros recentes.`;
  const comp = (total7 && media28) ? `Últimos 7 dias: ${total7} registros • Média diária (28d): ${media28}` : null;

  return (
    <>
      {/* INSIGHT HEADER */}
      <section className="bg-white rounded-[24px] border border-black/10 shadow-[0_1px_0_rgba(255,255,255,.8),0_8px_28px_rgba(2,6,23,.05)] p-4 md:p-5 mb-6">
        <h2 className="text-[clamp(20px,3.5vw,24px)] font-semibold text-neutral-900">Resumo</h2>
        <p className="mt-1 text-[15px] md:text-[16px] text-neutral-700">{insight}</p>
        {comp && <p className="mt-1 text-[13px] text-neutral-500">{comp}</p>}
        <Sparkline data={sparkData} />
      </section>

      {/* GRID DE CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Emoções mais frequentes" subtitle="Últimos registros">
          {emotionChart.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={emotionChart} margin={{ top: 12, right: 8, left: 8, bottom: 20 }} barCategoryGap="28%">
                {/* gradientes por barra */}
                <defs>
                  {emotionChart.map((e, i) => {
                    const base = colorForEmotion(e.name);
                    return (
                      <linearGradient key={i} id={`g-emo-${i}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={base} stopOpacity={0.9} />
                        <stop offset="100%" stopColor={base} stopOpacity={0.65} />
                      </linearGradient>
                    );
                  })}
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#111827', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" barSize={34} radius={[10,10,10,10]}>
                  {/* label acima da barra */}
                  <text />
                  {emotionChart.map((e, i) => (
                    <Cell key={i} fill={`url(#g-emo-${i})`} aria-label={`${e.name}: ${e.value}`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-neutral-500 py-8">
              <p className="text-base text-neutral-900 mb-1">Nenhum dado emocional ainda</p>
              <p className="text-sm">Registre suas memórias para ver seu perfil aqui.</p>
            </div>
          )}
        </Card>

        <Card title="Temas mais recorrentes" subtitle="Top 5 do período">
          {themeChart.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={themeChart} margin={{ top: 12, right: 12, left: 12, bottom: 20 }} barCategoryGap="28%">
                <defs>
                  {themeChart.map((e, i) => {
                    const base = pastel(e.name);
                    return (
                      <linearGradient key={i} id={`g-theme-${i}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={base} stopOpacity={0.95} />
                        <stop offset="100%" stopColor={base} stopOpacity={0.65} />
                      </linearGradient>
                    );
                  })}
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#111827', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" barSize={34} radius={[10,10,10,10]}>
                  {themeChart.map((e, i) => (
                    <Cell key={i} fill={`url(#g-theme-${i})`} aria-label={`${e.name}: ${e.value}`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-neutral-500 py-8">
              <p className="text-base text-neutral-900 mb-1">Nenhum tema ainda</p>
              <p className="text-sm">Crie registros para descobrir seus principais temas.</p>
            </div>
          )}
        </Card>
      </div>
    </>
  );
};

export default ProfileSection;

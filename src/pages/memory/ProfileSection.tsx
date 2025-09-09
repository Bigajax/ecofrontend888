import React, { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
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
const Card: React.FC<React.PropsWithChildren<{ title: string }>> = ({ title, children }) => (
  <div className="bg-white rounded-3xl border border-black/10 shadow-sm p-4 mb-6">
    <h4 className="text-[17px] font-medium text-neutral-900 mb-2">{title}</h4>
    {children}
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) =>
  active && payload?.length ? (
    <div className="rounded-xl bg-white/90 border border-black/10 px-3 py-2 text-[13px] text-neutral-700 shadow-md">
      <div className="font-medium">{label}</div>
      <div>{payload[0].value}</div>
    </div>
  ) : null;

/* ---------- helpers locais ---------- */
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
  // emoções
  const emoMap = countBy(memories, (m) => (m.emocao_principal || '').toString());
  const emocoes_frequentes: Record<string, number> = {};
  emoMap.forEach((v, k) => (emocoes_frequentes[k] = v));

  // temas (tags + domínio + categoria)
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
    add(domain);
    add(categoria);
    tags.forEach(add);
  }
  const temas_recorrentes: Record<string, number> = {};
  temas.forEach((v, k) => (temas_recorrentes[k] = v));

  return { emocoes_frequentes, temas_recorrentes };
}

/* ---------- componente ---------- */
const ProfileSection: React.FC = () => {
  const { perfil, memories, loading, error } = useMemoryData();

  // quando a API de perfil falhar e não tivermos memórias no hook,
  // buscamos um lote mínimo só para compor os gráficos
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

  // escolhe a fonte de dados
  const sourceMemories: Memoria[] = (memories && memories.length > 0) ? memories : (memLocal || []);

  // decide entre API ou cálculo local
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

  const stillLoading = loading || fetchingLocal;

  if (stillLoading) return <div className="flex justify-center items-center h-full text-neutral-500 text-sm">Carregando…</div>;
  if (error)        return <div className="flex justify-center items-center h-full text-rose-500 text-sm">{error}</div>;

  return (
    <>
      <Card title="Emoções mais frequentes">
        {emotionChart.length ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={emotionChart} margin={{ top: 12, right: 8, left: 8, bottom: 20 }} barCategoryGap="28%">
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#111827', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" barSize={34} radius={[8, 8, 8, 8]}>
                {emotionChart.map((e, i) => <Cell key={i} fill={colorForEmotion(e.name)} />)}
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

      <Card title="Temas mais recorrentes">
        {themeChart.length ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={themeChart} margin={{ top: 12, right: 12, left: 12, bottom: 12 }} barCategoryGap="28%">
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#111827', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" barSize={34} radius={[8, 8, 8, 8]}>
                {themeChart.map((e, i) => <Cell key={i} fill={pastel(e.name)} />)}
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
    </>
  );
};

export default ProfileSection;

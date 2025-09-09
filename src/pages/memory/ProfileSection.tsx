import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { useMemoryData } from './memoryData';

const EMOTION_COLORS: Record<string, string> = {
  raiva: '#DB2777', irritado: '#EC4899', frustracao: '#BE185D', medo: '#DB2777', incerteza: '#BE185D',
  alegria: '#3B82F6', calmo: '#2563EB', surpresa: '#3B82F6', antecipacao: '#2563EB',
  tristeza: '#A855F7', neutro: '#8B5CF6',
};
const normalize = (s = '') => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const getEmotionColor = (n: string) => EMOTION_COLORS[normalize(n)] || '#C7D2FE';

const generateConsistentPastelColor = (str: string) => {
  let h = 0; for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return `hsl(${Math.abs(h) % 360}, 25%, 88%)`;
};

const HealthCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
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

const ProfileSection: React.FC = () => {
  const { perfil, loading, error } = useMemoryData();

  const emotionChart = useMemo(() => {
    if (!perfil?.emocoes_frequentes) return [];
    return Object.entries(perfil.emocoes_frequentes)
      .map(([name, value]) => ({ name, value: Number(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [perfil]);

  const themeChart = useMemo(() => {
    if (!perfil?.temas_recorrentes) return [];
    return Object.entries(perfil.temas_recorrentes)
      .map(([name, value]) => ({ name, value: Number(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [perfil]);

  if (loading) return <div className="flex justify-center items-center h-full text-neutral-500 text-sm">Carregando…</div>;
  if (error)   return <div className="flex justify-center items-center h-full text-rose-500 text-sm">{error}</div>;

  return (
    <>
      <HealthCard title="Emoções mais frequentes">
        {emotionChart.length ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={emotionChart} margin={{ top: 12, right: 8, left: 8, bottom: 20 }} barCategoryGap="28%">
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#111827', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" barSize={34} radius={[8, 8, 8, 8]}>
                {emotionChart.map((e, i) => <Cell key={i} fill={getEmotionColor(e.name)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center text-neutral-500 py-8">
            <p className="text-base text-neutral-900 mb-1">Nenhum dado emocional ainda</p>
            <p className="text-sm">Registre suas memórias para ver seu perfil aqui.</p>
          </div>
        )}
      </HealthCard>

      <HealthCard title="Temas mais recorrentes">
        {themeChart.length ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={themeChart} margin={{ top: 12, right: 12, left: 12, bottom: 12 }} barCategoryGap="28%">
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#111827', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" barSize={34} radius={[8, 8, 8, 8]}>
                {themeChart.map((e, i) => <Cell key={i} fill={generateConsistentPastelColor(e.name)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center text-neutral-500 py-8">
            <p className="text-base text-neutral-900 mb-1">Nenhum tema ainda</p>
            <p className="text-sm">Crie registros para descobrir seus principais temas.</p>
          </div>
        )}
      </HealthCard>
    </>
  );
};

export default ProfileSection;

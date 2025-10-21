// src/pages/MemoryPage.tsx
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import PhoneFrame from '../components/PhoneFrame';
import { useAuth } from '../contexts/AuthContext';
import MapaEmocional2D from '../components/MapaEmocional2D';
import LinhaDoTempoEmocional from '../components/LinhaDoTempoEmocional';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import MemoryCard from './memory/components/MemoryCard';
import mixpanel from '../lib/mixpanel';
import {
  chartColorForEmotion,
  chartColorForTheme,
  groupOrder,
  normalizeTab,
  TabKey,
  useMemoryPageData,
} from './memory/useMemoryPageData';

const CustomTooltip = ({ active, payload, label }: any) =>
  active && payload?.length ? (
    <div
      style={{
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(6px)',
        border: '1px solid rgba(0,0,0,0.08)',
        padding: '8px 12px',
        boxShadow: '0 8px 18px rgba(0,0,0,.06)',
        color: '#374151',
        fontSize: '0.85rem',
      }}
    >
      <div className="font-medium">{label}</div>
      <div>{payload[0].value}</div>
    </div>
  ) : null;

const ChartCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    className="glass-panel mb-6 p-4 rounded-3xl"
  >
    <h4 className="text-base font-semibold text-neutral-900 mb-3 tracking-tight">{title}</h4>
    {children}
  </motion.div>
);

const MemoryPage: React.FC = () => {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const { tab } = useParams<{ tab?: string }>();

  const [activeTab, setActiveTab] = useState<TabKey>(normalizeTab(tab));
  const hasTrackedReportOpenRef = useRef(false);
  const reportTimingActiveRef = useRef(false);

  const startReportTiming = () => {
    if (!reportTimingActiveRef.current) {
      mixpanel.time_event('Front-end: Relatório Carregado');
      reportTimingActiveRef.current = true;
    }
  };

  useEffect(() => {
    setActiveTab(normalizeTab(tab));
  }, [tab]);

  const goTab = (target: TabKey) => {
    mixpanel.track('Front-end: Memory Tab', { target, previous: activeTab });
    if (target === 'report') {
      startReportTiming();
    }
    setActiveTab(target);
    navigate(target === 'memories' ? '/app/memory' : `/app/memory/${target}`, { replace: true });
  };

  const {
    loading,
    error,
    perfil,
    relatorio,
    emotionOptions,
    filteredMemories,
    groupedMemories,
    emotionChart,
    themeChart,
    mapaEmocional2D,
    filtersActive,
    resetFilters,
    emoFilter,
    setEmoFilter,
    query,
    setQuery,
    minIntensity,
    setMinIntensity,
  } = useMemoryPageData(userId);

  const handleEmoFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    mixpanel.track('Front-end: UI Interação', {
      control: 'emotion-filter',
      value,
      activeTab,
      filteredCount: filteredMemories.length,
    });
    setEmoFilter(value);
  };

  const handleQueryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    mixpanel.track('Front-end: UI Interação', {
      control: 'memory-search',
      value,
      activeTab,
      filteredCount: filteredMemories.length,
    });
    setQuery(value);
  };

  const handleIntensityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    mixpanel.track('Front-end: UI Interação', {
      control: 'intensity-filter',
      value,
      activeTab,
      filteredCount: filteredMemories.length,
    });
    setMinIntensity(value);
  };

  const handleResetFilters = () => {
    mixpanel.track('Front-end: UI Interação', {
      control: 'reset-filters',
      activeTab,
      filteredCount: filteredMemories.length,
    });
    resetFilters();
  };

  useEffect(() => {
    if (activeTab === 'report') {
      startReportTiming();

      if (!loading && !hasTrackedReportOpenRef.current) {
        mixpanel.track('Front-end: Relatório Aberto', { hasData: Boolean(relatorio) });
        hasTrackedReportOpenRef.current = true;
      }

      if (!loading && reportTimingActiveRef.current) {
        mixpanel.track('Front-end: Relatório Carregado', { hasData: Boolean(relatorio) });
        reportTimingActiveRef.current = false;
      }
    } else {
      hasTrackedReportOpenRef.current = false;
      reportTimingActiveRef.current = false;
    }
  }, [activeTab, loading, relatorio]);

  return (
    <PhoneFrame className="flex h-full flex-col bg-white">
      <div className="sticky top-0 z-10 border-b border-black/5 bg-white/80 px-4 pb-3 pt-4 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-3">
          <div className="flex w-full items-center justify-between gap-3">
            <button
              onClick={() => navigate('/app')}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white/80 backdrop-blur hover:bg-white transition"
              aria-label="Voltar"
            >
              <ArrowLeft size={20} className="text-neutral-700" />
            </button>

            <div className="glass-panel flex items-center gap-1 rounded-full p-1">
              {(['memories', 'profile', 'report'] as const).map((t) => {
                const active = activeTab === t;
                return (
                  <button
                    key={t}
                    onClick={() => goTab(t)}
                    aria-pressed={active}
                    className={[
                      'px-3 py-1.5 text-[13px] font-medium transition rounded-full',
                      active
                        ? 'bg-white text-neutral-900 shadow-sm ring-1 ring-white/60'
                        : 'text-neutral-700 hover:bg-white/40',
                    ].join(' ')}
                  >
                    {{ memories: 'Memórias', profile: 'Perfil Emocional', report: 'Relatório' }[t]}
                  </button>
                );
              })}
            </div>

            <div className="hidden h-9 w-9 sm:block" aria-hidden />
          </div>

          <div className="text-center">
            <h1 className="text-[22px] font-semibold tracking-tight text-neutral-900">
              {{
                memories: 'Minhas Memórias',
                profile: 'Meu Perfil Emocional',
                report: 'Relatório Emocional',
              }[activeTab]}
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              {{
                memories: 'Registre e relembre seus sentimentos',
                profile: 'Seu panorama emocional em destaque',
                report: 'Análise aprofundada das suas memórias',
              }[activeTab]}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 sm:px-6">
        <div className="mx-auto flex h-full w-full max-w-4xl flex-col">
          {loading ? (
            <div className="flex flex-1 items-center justify-center text-sm text-neutral-500">Carregando…</div>
          ) : error ? (
            <div className="flex flex-1 items-center justify-center text-sm text-rose-500">{error}</div>
          ) : (
            <div className="flex-1 space-y-6 pb-4">
              {activeTab === 'memories' && (
                <>
                  <div className="glass-panel mb-3 rounded-2xl p-3 sm:p-4">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
                      <select
                        value={emoFilter}
                        onChange={handleEmoFilterChange}
                        className="h-11 rounded-xl border border-black/10 bg-white/80 px-3 text-sm"
                      >
                        <option value="all">Todas as emoções</option>
                        {emotionOptions.map((emo) => (
                          <option key={emo} value={emo}>
                            {emo[0].toUpperCase() + emo.slice(1)}
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        value={query}
                        onChange={handleQueryChange}
                        placeholder="Buscar em tags, reflexão ou pensamento…"
                        className="h-11 rounded-xl border border-black/10 bg-white/80 px-3 text-sm"
                      />

                      <div className="flex items-center gap-3 rounded-xl border border-black/5 bg-white/60 px-3 py-1.5">
                        <label className="w-24 text-xs text-neutral-600">Intensidade ≥ {minIntensity}</label>
                        <input
                          type="range"
                          min={0}
                          max={10}
                          step={1}
                          value={minIntensity}
                          onChange={handleIntensityChange}
                          className="flex-1"
                        />
                      </div>
                    </div>

                    {filtersActive && (
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={handleResetFilters}
                          className="rounded-full border border-black/10 bg-white/80 px-3 py-1 text-xs transition hover:bg-white"
                        >
                          Limpar filtros
                        </button>
                      </div>
                    )}
                  </div>

                  {filteredMemories.length > 0 ? (
                    <div className="space-y-6">
                    {groupOrder
                      .filter((bucket) => groupedMemories[bucket]?.length)
                      .map((bucket) => (
                        <section key={bucket}>
                          <h3 className="text-sm font-semibold text-neutral-500 mb-2">{bucket}</h3>
                          <ul className="space-y-3">
                            {groupedMemories[bucket].map((memory) => {
                              if (import.meta.env.DEV) {
                                console.log('memoria', memory);
                              }
                              return <MemoryCard key={memory.id} mem={memory} />;
                            })}
                          </ul>
                        </section>
                      ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center mt-16 text-neutral-500 px-6">
                    <p className="text-lg font-medium mb-2 text-neutral-900">
                      {filtersActive
                        ? 'Nenhuma memória coincide com os filtros'
                        : 'Você ainda não tem memórias salvas'}
                    </p>
                    <p className="text-sm mb-6 max-w-xs">
                      {filtersActive
                        ? 'Ajuste os filtros para ver mais resultados.'
                        : 'Crie sua primeira agora mesmo.'}
                    </p>
                    {!filtersActive && (
                      <button
                        onClick={() => navigate('/app')}
                        className="px-4 py-2 rounded-full text-sm font-medium border border-neutral-300 bg-white/60 backdrop-blur hover:bg-white transition text-neutral-900"
                      >
                        + Nova memória
                      </button>
                    )}
                  </div>
                )}
              </>
            )}

            {activeTab === 'profile' && (
              <>
                {perfil && (emotionChart.length > 0 || themeChart.length > 0) ? (
                  <>
                    <ChartCard title="Emoções mais frequentes">
                      {emotionChart.length > 0 ? (
                        <ResponsiveContainer width="100%" height={230}>
                          <BarChart
                            data={emotionChart}
                            margin={{ top: 20, right: 5, left: 5, bottom: 40 }}
                            barCategoryGap="30%"
                          >
                            <XAxis
                              dataKey="name"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#111827', fontSize: 12 }}
                            />
                            <YAxis
                              domain={[0, 'dataMax + 5']}
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#9CA3AF', fontSize: 12 }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="value" barSize={37} radius={[6, 6, 0, 0]}>
                              {emotionChart.map((entry, index) => (
                                <Cell key={index} fill={chartColorForEmotion(entry.name)} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex flex-col items-center text-center py-8 text-neutral-500">
                          <p className="text-base mb-2 text-neutral-900">Nenhum dado emocional ainda</p>
                          <p className="text-sm max-w-xs">Registre suas memórias para ver seu perfil aqui.</p>
                        </div>
                      )}
                    </ChartCard>

                    <ChartCard title="Temas mais recorrentes">
                      {themeChart.length > 0 ? (
                        <ResponsiveContainer width="100%" height={230}>
                          <BarChart
                            data={themeChart}
                            margin={{ top: 20, right: 10, left: 10, bottom: 20 }}
                            barCategoryGap="30%"
                          >
                            <XAxis
                              dataKey="name"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#111827', fontSize: 12 }}
                            />
                            <YAxis
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#9CA3AF', fontSize: 12 }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="value" barSize={37} radius={[6, 6, 0, 0]}>
                              {themeChart.map((entry, index) => (
                                <Cell key={index} fill={chartColorForTheme(entry.name)} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex flex-col items-center text-center py-8 text-neutral-500">
                          <p className="text-base mb-2 text-neutral-900">Nenhum tema ainda</p>
                          <p className="text-sm max-w-xs">Crie registros para descobrir seus principais temas.</p>
                        </div>
                      )}
                    </ChartCard>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-center mt-20 text-neutral-500 px-6">
                    <p className="text-lg font-medium mb-2 text-neutral-900">Seu perfil emocional está vazio</p>
                    <p className="text-sm mb-6 max-w-xs">
                      Compartilhe o que sente com a Eco para criar seu panorama emocional.
                    </p>
                    <button
                      onClick={() => navigate('/app')}
                      className="px-4 py-2 rounded-full text-sm font-medium border border-neutral-300 bg-white/60 backdrop-blur hover:bg-white transition text-neutral-900"
                    >
                      + Nova memória
                    </button>
                  </div>
                )}
              </>
            )}

            {activeTab === 'report' && (
              <>
                {relatorio && (mapaEmocional2D.length > 0 || relatorio.linha_do_tempo_intensidade?.length > 0) ? (
                  <>
                    <ChartCard title="Mapa Emocional 2D">
                      <MapaEmocional2D data={mapaEmocional2D} />
                    </ChartCard>

                    <ChartCard title="Linha do Tempo Emocional">
                      <LinhaDoTempoEmocional data={relatorio.linha_do_tempo_intensidade} />
                    </ChartCard>

                    <p className="text-xs text-neutral-500 text-center">
                      Total de memórias significativas: {relatorio.total_memorias ?? 'Indisponível'}
                    </p>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-center mt-20 text-neutral-500 px-6">
                    <div className="text-5xl mb-4">🪷</div>
                    <p className="text-lg font-medium mb-2 text-neutral-900">Seu Relatório Emocional está em branco</p>
                    <p className="text-sm mb-6 max-w-xs">
                      Para criar seu primeiro relatório, compartilhe suas memórias mais marcantes com a Eco.
                    </p>
                    <button
                      onClick={() => navigate('/app')}
                      className="px-4 py-2 rounded-full text-sm font-medium border border-neutral-300 bg-white/60 backdrop-blur hover:bg-white transition text-neutral-900"
                    >
                      + Registrar memória
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </PhoneFrame>
  );
};

export default MemoryPage;

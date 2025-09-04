// src/pages/MemoryPage.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PhoneFrame from '../components/PhoneFrame';
import { useAuth } from '../contexts/AuthContext';
import { buscarMemoriasPorUsuario, Memoria } from '../api/memoriaApi';
import { buscarPerfilEmocional } from '../api/perfilApi';
import { buscarRelatorioEmocional, RelatorioEmocional } from '../api/relatorioEmocionalApi';
import MapaEmocional2D from '../components/MapaEmocional2D';
import LinhaDoTempoEmocional from '../components/LinhaDoTempoEmocional';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

/* ------------------- Paleta & helpers ------------------- */
const EMOTION_COLORS: Record<string, string> = {
  raiva: '#DB2777', irritado: '#EC4899', frustracao: '#BE185D', medo: '#DB2777', incerteza: '#BE185D',
  alegria: '#3B82F6', calmo: '#2563EB', surpresa: '#3B82F6', antecipacao: '#2563EB',
  tristeza: '#A855F7', neutro: '#8B5CF6'
};
const normalizeEmotion = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const hashStringToHue = (str: string) => {
  let h = 0; for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h) % 360;
};
const generateConsistentPastelColor = (str: string, o: any = {}) => {
  const hue = hashStringToHue(str);
  const { saturation = 25, lightness = 88 } = o;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};
const getEmotionColor = (n: string) => EMOTION_COLORS[normalizeEmotion(n)] || generateConsistentPastelColor(n);

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

const humanDate = (raw: string) => {
  const d = new Date(raw); if (isNaN(d.getTime())) return '';
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Ontem';
  return `${diff} dias atrás`;
};
const clamp = (v: number, min = -1, max = 1) => Math.max(min, Math.min(max, v));

/* ------------------- Cartão de memória ------------------- */
const MemoryCard: React.FC<{ mem: Memoria }> = ({ mem }) => {
  const [expanded, setExpanded] = useState(false);
  const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

  return (
    <li className="glass-panel p-4 rounded-3xl transition-all">
      {/* emoção */}
      <div className="mb-2 text-center">
        <span className="block text-lg font-semibold text-neutral-900 tracking-tight">
          {mem.emocao_principal ? cap(mem.emocao_principal) : 'Emoção desconhecida'}
        </span>
      </div>

      {/* tags */}
      {mem.tags?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 justify-center">
          {mem.tags.map((tag, i) => (
            <span
              key={i}
              className="text-xs px-3 py-1 rounded-full font-medium border shadow-sm"
              style={{
                color: '#0f172a',
                background: getEmotionColor(tag),
                borderColor: 'rgba(0,0,0,0.10)',
              }}
            >
              {cap(tag)}
            </span>
          ))}
        </div>
      )}

      {/* data */}
      <div className="text-xs text-neutral-400 text-center">{mem.created_at ? humanDate(mem.created_at) : ''}</div>

      {/* toggle */}
      <div className="mt-3 flex justify-end">
        <button
          className="text-xs font-medium text-sky-700 hover:opacity-80 transition"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Fechar ↑' : 'Ver mais ↓'}
        </button>
      </div>

      {/* conteúdo expandido */}
      {expanded && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 mt-3 pt-3 border-t border-neutral-200 text-sm text-neutral-700">
          {mem.analise_resumo && (
            <div className="rounded-xl p-3 border border-neutral-200 bg-white/70 backdrop-blur shadow-sm">
              <div className="font-semibold mb-1 text-neutral-900">Reflexão da Eco</div>
              <div>{mem.analise_resumo}</div>
            </div>
          )}
          {mem.contexto && (
            <div className="rounded-xl p-3 border border-neutral-200 bg-white/70 backdrop-blur shadow-sm">
              <div className="font-semibold mb-1 text-neutral-900">Seu pensamento</div>
              <div>{mem.contexto}</div>
            </div>
          )}
          {(mem.dominio_vida || mem.categoria) && (
            <div className="flex flex-col sm:flex-row gap-2">
              {mem.dominio_vida && (
                <div className="flex-1 rounded-xl p-3 border border-neutral-200 bg-white/70 backdrop-blur shadow-sm">
                  <div className="font-semibold mb-1 text-neutral-900">Domínio</div>
                  <div>{mem.dominio_vida}</div>
                </div>
              )}
              {mem.categoria && (
                <div className="flex-1 rounded-xl p-3 border border-neutral-200 bg-white/70 backdrop-blur shadow-sm">
                  <div className="font-semibold mb-1 text-neutral-900">Categoria</div>
                  <div>{mem.categoria}</div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </li>
  );
};

/* ------------------- Página ------------------- */
const MemoryPage: React.FC = () => {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'memories' | 'profile' | 'report'>('memories');
  const [memories, setMemories] = useState<Memoria[]>([]);
  const [perfil, setPerfil] = useState<any>(null);
  const [relatorio, setRelatorio] = useState<RelatorioEmocional | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const carregar = async () => {
      if (!userId) return;
      setLoading(true);
      try {
        const [memData, perfilData, relatorioData] = await Promise.all([
          buscarMemoriasPorUsuario(userId),
          buscarPerfilEmocional(userId),
          buscarRelatorioEmocional(userId),
        ]);
        setMemories(memData.filter((m) => m.salvar_memoria === true || m.salvar_memoria === 'true'));
        setPerfil(perfilData);
        setRelatorio(relatorioData);
      } catch {
        setError('Erro ao carregar dados.');
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, [userId]);

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

  const mapaEmocional2D = useMemo(() => {
    if (!Array.isArray(relatorio?.mapa_emocional)) return [];
    return relatorio.mapa_emocional
      .map((p: any) => ({
        emocao: p.emocao ?? p.emocao_principal ?? 'Desconhecida',
        valenciaNormalizada: clamp(typeof p.valencia === 'number' ? p.valencia : p.x ?? 0),
        excitacaoNormalizada: clamp(typeof p.excitacao === 'number' ? p.excitacao : p.y ?? 0),
        cor: p.cor ?? undefined,
      }))
      .filter((p: any) => typeof p.valenciaNormalizada === 'number' && typeof p.excitacaoNormalizada === 'number');
  }, [relatorio]);

  const ChartCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="glass-panel mb-6 p-4 rounded-3xl">
      <h4 className="text-base font-semibold text-neutral-900 mb-3 tracking-tight">{title}</h4>
      {children}
    </motion.div>
  );

  return (
    <PhoneFrame className="flex flex-col h-full bg-white">
      {/* header sticky glass */}
      <div className="sticky top-0 z-10 px-4 pt-4 pb-3 bg-white/70 backdrop-blur-md border-b border-black/10">
        <div className="relative flex items-center justify-center">
          <button
            onClick={() => navigate('/chat')}
            className="absolute left-0 inline-flex items-center justify-center h-9 w-9 rounded-full border border-black/10 bg-white/70 backdrop-blur hover:bg-white transition"
            aria-label="Voltar"
          >
            <ArrowLeft size={20} className="text-neutral-700" />
          </button>
          <div className="text-center">
            <h1 className="text-[22px] font-semibold text-neutral-900 tracking-tight">
              {{
                memories: 'Minhas Memórias',
                profile: 'Meu Perfil Emocional',
                report: 'Relatório Emocional',
              }[activeTab]}
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              {{
                memories: 'Registre e relembre seus sentimentos',
                profile: 'Seu panorama emocional em destaque',
                report: 'Análise aprofundada das suas memórias',
              }[activeTab]}
            </p>
          </div>
        </div>

        {/* segmented control glass */}
        <div className="mt-3 flex justify-center">
          <div className="glass-panel p-1 rounded-full flex gap-1">
            {(['memories', 'profile', 'report'] as const).map((tab) => {
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  aria-pressed={active}
                  className={[
                    'px-3 py-1.5 rounded-full text-sm font-medium transition',
                    active
                      ? 'bg-white text-neutral-900 shadow-sm border border-white/60'
                      : 'text-neutral-700 hover:bg-white/40',
                  ].join(' ')}
                >
                  {{
                    memories: 'Memórias',
                    profile: 'Perfil Emocional',
                    report: 'Relatório',
                  }[tab]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* content */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {loading ? (
          <div className="flex justify-center items-center h-full text-neutral-500 text-sm">Carregando…</div>
        ) : error ? (
          <div className="flex justify-center items-center h-full text-rose-500 text-sm">{error}</div>
        ) : (
          <>
            {activeTab === 'memories' && (
              <>
                {memories.length > 0 ? (
                  <ul className="space-y-3">
                    {memories.map((m) => (
                      <MemoryCard key={m.id} mem={m} />
                    ))}
                  </ul>
                ) : (
                  <div className="flex flex-col items-center text-center mt-20 text-neutral-500 px-6">
                    <p className="text-lg font-medium mb-2 text-neutral-900">Você ainda não tem memórias salvas</p>
                    <p className="text-sm mb-6 max-w-xs">Crie sua primeira agora mesmo.</p>
                    <button
                      onClick={() => navigate('/chat')}
                      className="px-4 py-2 rounded-full text-sm font-medium border border-neutral-300 bg-white/60 backdrop-blur hover:bg-white transition text-neutral-900"
                    >
                      + Nova memória
                    </button>
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
                          <BarChart data={emotionChart} margin={{ top: 20, right: 5, left: 5, bottom: 40 }} barCategoryGap="30%">
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#111827', fontSize: 12 }} />
                            <YAxis domain={[0, 'dataMax + 5']} axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="value" barSize={37} radius={[6, 6, 0, 0]}>
                              {emotionChart.map((e, i) => (
                                <Cell key={i} fill={getEmotionColor(e.name)} />
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
                          <BarChart data={themeChart} margin={{ top: 20, right: 10, left: 10, bottom: 20 }} barCategoryGap="30%">
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#111827', fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="value" barSize={37} radius={[6, 6, 0, 0]}>
                              {themeChart.map((e, i) => (
                                <Cell key={i} fill={generateConsistentPastelColor(e.name)} />
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
                    <p className="text-sm mb-6 max-w-xs">Compartilhe o que sente com a Eco para criar seu panorama emocional.</p>
                    <button
                      onClick={() => navigate('/chat')}
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
                    <p className="text-sm mb-6 max-w-xs">Para criar seu primeiro relatório, compartilhe suas memórias mais marcantes com a Eco.</p>
                    <button
                      onClick={() => navigate('/chat')}
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

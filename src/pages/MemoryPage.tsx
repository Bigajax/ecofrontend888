// src/pages/MemoryPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
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
  tristeza: '#A855F7', neutro: '#8B5CF6',
};
const normalize = (s: string = '') =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const normalizeEmotion = (s: string) => normalize(s);
const hashStringToHue = (str: string) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h) % 360;
};
const generateConsistentPastelColor = (str: string, o: any = {}) => {
  const hue = hashStringToHue(str);
  const { saturation = 25, lightness = 88 } = o;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};
const getEmotionColor = (n: string) =>
  EMOTION_COLORS[normalizeEmotion(n)] || generateConsistentPastelColor(n);

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
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '';
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Ontem';
  return `${diff} dias atrás`;
};
const clamp = (v: number, min = -1, max = 1) => Math.max(min, Math.min(max, v));

/* -------- Agrupamento por período (Hoje/Ontem/Esta semana/Este mês/Antigas) -------- */
const bucketLabelForDate = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Antigas';
  const now = new Date();

  const msDay = 86400000;
  const diffDays = Math.floor((+now - +d) / msDay);
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';

  // esta semana
  const startOfWeek = new Date(now);
  const day = startOfWeek.getDay(); // 0..6
  const diffToMonday = (day + 6) % 7; // segunda como início
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);
  if (d >= startOfWeek) return 'Esta semana';

  // este mês
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  if (d >= startOfMonth) return 'Este mês';

  return 'Antigas';
};

type Grouped = Record<string, Memoria[]>;

const groupMemories = (mems: Memoria[]): Grouped =>
  mems.reduce((acc: Grouped, m) => {
    const label = m.created_at ? bucketLabelForDate(m.created_at) : 'Antigas';
    (acc[label] ||= []).push(m);
    return acc;
  }, {});

/* ------------------- Cartão de memória (novo) ------------------- */
const MemoryCard: React.FC<{ mem: Memoria }> = ({ mem }) => {
  const [open, setOpen] = useState(false);
  const cap = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
  const color = getEmotionColor(mem.emocao_principal || 'neutro');
  const when = mem.created_at ? humanDate(mem.created_at) : '';
  const intensidade = Math.max(0, Math.min(10, Number((mem as any).intensidade ?? 0)));
  const preview = (mem.analise_resumo || mem.contexto || '').trim();

  return (
    <li className="rounded-3xl border border-black/10 bg-white/70 backdrop-blur-md shadow-md p-4 transition-all">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full text-left"
      >
        <div className="flex items-center gap-3">
          <span
            className="h-9 w-9 rounded-full ring-2 ring-white/70 shadow-sm shrink-0"
            style={{ background: color, boxShadow: 'inset 0 1px 0 rgba(255,255,255,.6)' }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[15px] font-semibold text-neutral-900 truncate">
                {cap(mem.emocao_principal) || 'Emoção'}
              </h3>
              <span className="text-[12px] text-neutral-500 shrink-0">{when}</span>
            </div>

            {preview && (
              <p
                className="text-sm text-neutral-700 mt-0.5"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {preview}
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 h-1.5 rounded-full bg-neutral-200/60 overflow-hidden">
          <span
            className="block h-full rounded-full"
            style={{
              width: `${(intensidade / 10) * 100}%`,
              background: `linear-gradient(90deg, ${color}, rgba(0,0,0,0.08))`,
            }}
            aria-hidden
          />
        </div>

        {!!mem.tags?.length && (
          <div className="mt-3 flex flex-wrap gap-2">
            {mem.tags.map((tag, i) => (
              <span
                key={`${tag}-${i}`}
                className="text-xs px-3 py-1 rounded-full font-medium border border-black/10 shadow-sm"
                style={{
                  background: generateConsistentPastelColor(tag),
                  color: '#0f172a',
                }}
              >
                {tag && tag[0].toUpperCase() + tag.slice(1)}
              </span>
            ))}
          </div>
        )}

        <div className="mt-3 flex justify-end">
          <span className="text-xs font-medium text-sky-700">
            {open ? 'Fechar ↑' : 'Ver mais ↓'}
          </span>
        </div>
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 mt-3 pt-3 border-t border-neutral-200 text-sm text-neutral-700"
        >
          {mem.analise_resumo && (
            <div className="rounded-xl p-3 bg-white/70 backdrop-blur border border-neutral-200 shadow-sm">
              <div className="font-semibold mb-1 text-neutral-900">Reflexão da Eco</div>
              <div>{mem.analise_resumo}</div>
            </div>
          )}

          {mem.contexto && (
            <div className="rounded-xl p-3 bg-white/70 backdrop-blur border border-neutral-200 shadow-sm">
              <div className="font-semibold mb-1 text-neutral-900">Seu pensamento</div>
              <div>{mem.contexto}</div>
            </div>
          )}

          {(mem.dominio_vida || mem.categoria) && (
            <div className="flex flex-col sm:flex-row gap-2">
              {mem.dominio_vida && (
                <div className="flex-1 rounded-xl p-3 bg-white/70 backdrop-blur border border-neutral-200 shadow-sm">
                  <div className="font-semibold mb-1 text-neutral-900">Domínio</div>
                  <div>{mem.dominio_vida}</div>
                </div>
              )}
              {mem.categoria && (
                <div className="flex-1 rounded-xl p-3 bg-white/70 backdrop-blur border border-neutral-200 shadow-sm">
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

  // filtros
  const [emoFilter, setEmoFilter] = useState<string>('all');
  const [query, setQuery] = useState<string>('');
  const [minIntensity, setMinIntensity] = useState<number>(0);

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
        setMemories(
          memData.filter((m) => (m as any).salvar_memoria === true || (m as any).salvar_memoria === 'true')
        );
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

  // emoções únicas para o seletor
  const emotionOptions = useMemo(() => {
    const set = new Set<string>();
    memories.forEach((m) => m.emocao_principal && set.add(m.emocao_principal));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [memories]);

  // aplica filtros
  const filteredMemories = useMemo(() => {
    const q = normalize(query);
    return memories.filter((m) => {
      // emoção
      if (emoFilter !== 'all') {
        if (normalize(m.emocao_principal || '') !== normalize(emoFilter)) return false;
      }
      // intensidade
      const inten = Number((m as any).intensidade ?? 0);
      if (!isNaN(minIntensity) && inten < minIntensity) return false;
      // busca em tags/analise/contexto
      if (q) {
        const hay =
          normalize(m.analise_resumo || '') +
          ' ' +
          normalize(m.contexto || '') +
          ' ' +
          (Array.isArray(m.tags) ? m.tags.map(normalize).join(' ') : '');
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [memories, emoFilter, minIntensity, query]);

  // agrupamento
  const grouped = useMemo(() => groupMemories(filteredMemories), [filteredMemories]);
  const groupOrder = ['Hoje', 'Ontem', 'Esta semana', 'Este mês', 'Antigas'];

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
      .filter(
        (p: any) => typeof p.valenciaNormalizada === 'number' && typeof p.excitacaoNormalizada === 'number'
      );
  }, [relatorio]);

  const ChartCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="glass-panel mb-6 p-4 rounded-3xl">
      <h4 className="text-base font-semibold text-neutral-900 mb-3 tracking-tight">{title}</h4>
      {children}
    </motion.div>
  );

  const filtersActive = emoFilter !== 'all' || !!query || minIntensity > 0;

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
                {/* filtros rápidos */}
                <div className="glass-panel p-3 rounded-2xl mb-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <select
                      value={emoFilter}
                      onChange={(e) => setEmoFilter(e.target.value)}
                      className="h-10 rounded-xl px-3 bg-white/80 border border-black/10 text-sm"
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
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Buscar em tags, reflexão ou pensamento…"
                      className="h-10 rounded-xl px-3 bg-white/80 border border-black/10 text-sm"
                    />

                    <div className="flex items-center gap-3">
                      <label className="text-xs text-neutral-600 w-24">Intensidade ≥ {minIntensity}</label>
                      <input
                        type="range"
                        min={0}
                        max={10}
                        step={1}
                        value={minIntensity}
                        onChange={(e) => setMinIntensity(Number(e.target.value))}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  {filtersActive && (
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={() => {
                          setEmoFilter('all');
                          setQuery('');
                          setMinIntensity(0);
                        }}
                        className="text-xs px-3 py-1 rounded-full border border-black/10 bg-white/70 hover:bg-white transition"
                      >
                        Limpar filtros
                      </button>
                    </div>
                  )}
                </div>

                {/* lista agrupada */}
                {filteredMemories.length > 0 ? (
                  <div className="space-y-6">
                    {groupOrder
                      .filter((bucket) => grouped[bucket]?.length)
                      .map((bucket) => (
                        <section key={bucket}>
                          <h3 className="text-sm font-semibold text-neutral-500 mb-2">{bucket}</h3>
                          <ul className="space-y-3">
                            {grouped[bucket].map((m) => (
                              <MemoryCard key={m.id} mem={m} />
                            ))}
                          </ul>
                        </section>
                      ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center mt-16 text-neutral-500 px-6">
                    <p className="text-lg font-medium mb-2 text-neutral-900">
                      {filtersActive ? 'Nenhuma memória coincide com os filtros' : 'Você ainda não tem memórias salvas'}
                    </p>
                    <p className="text-sm mb-6 max-w-xs">
                      {filtersActive ? 'Ajuste os filtros para ver mais resultados.' : 'Crie sua primeira agora mesmo.'}
                    </p>
                    {!filtersActive && (
                      <button
                        onClick={() => navigate('/chat')}
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

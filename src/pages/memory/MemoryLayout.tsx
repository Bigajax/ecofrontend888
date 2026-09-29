import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptionTier } from '@/hooks/usePremiumContent';
import HomeHeader from '@/components/home/HomeHeader';
import ReinoChegada from '@/components/reino/ReinoChegada';
import { getReinoMood } from '@/components/reino/reinoMood';
import { buscarMemorias, buscarRetrato, esquecerCacheEmocional, type Memoria, type Retrato } from '@/api/emocional';
import '@/components/reino/reino.css';

/**
 * A Casa guarda (set/2026): memórias, retrato e relatório emocional no reino.
 * Memórias e retrato são de todo mundo que tem conta; o relatório é da
 * assinatura. Antes: vidro, gradientes, erros com "Detalhes técnicos" e um
 * retrato que quase nunca aparecia (o chat não mandava token e nenhuma
 * memória era salva para quem estava logado).
 */

const DIA_MS = 24 * 60 * 60 * 1000;

/** Quanto do histórico cada plano vê (mantido do desenho anterior). */
const JANELA: Record<string, { dias: number; max: number } | null> = {
  free: { dias: 30, max: 20 },
  essentials: { dias: 90, max: 100 },
  premium: null,
  vip: null,
};

interface CasaDaMemoria {
  memorias: Memoria[];
  totalGuardadas: number;
  janela: { dias: number; max: number } | null;
  retrato: Retrato | null;
  carregando: boolean;
  erro: string | null;
  recarregar: () => void;
}

const Contexto = createContext<CasaDaMemoria | null>(null);

export function useCasaDaMemoria(): CasaDaMemoria {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useCasaDaMemoria fora do MemoryLayout');
  return ctx;
}

const ABAS = [
  { to: '/app/memory', rotulo: 'Memórias', end: true },
  { to: '/app/memory/profile', rotulo: 'Retrato', end: false },
  { to: '/app/memory/report', rotulo: 'Relatório', end: false },
];

export default function MemoryLayout() {
  const { user, loading: carregandoConta } = useAuth();
  const tier = useSubscriptionTier();
  const navigate = useNavigate();
  const [todas, setTodas] = useState<Memoria[]>([]);
  const [retrato, setRetrato] = useState<Retrato | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [volta, setVolta] = useState(0);

  const recarregar = useCallback(() => {
    esquecerCacheEmocional();
    setVolta((v) => v + 1);
  }, []);

  useEffect(() => {
    if (!user) return;
    let vivo = true;
    setCarregando(true);
    setErro(null);
    Promise.allSettled([buscarMemorias(), buscarRetrato()]).then(([m, r]) => {
      if (!vivo) return;
      if (m.status === 'fulfilled') setTodas(m.value);
      if (r.status === 'fulfilled') setRetrato(r.value);
      if (m.status === 'rejected') setErro('Não foi possível abrir suas memórias agora.');
      setCarregando(false);
    });
    return () => {
      vivo = false;
    };
  }, [user, volta]);

  const janela = JANELA[tier] ?? null;
  const memorias = useMemo(() => {
    if (!janela) return todas;
    const desde = Date.now() - janela.dias * DIA_MS;
    return todas
      .filter((m) => (m.created_at ? new Date(m.created_at).getTime() >= desde : false))
      .slice(0, janela.max);
  }, [todas, janela]);

  if (carregandoConta) return null;
  if (!user) return <Navigate to="/memory-preview" replace />;

  const valor: CasaDaMemoria = {
    memorias,
    totalGuardadas: todas.length,
    janela,
    retrato,
    carregando,
    erro,
    recarregar,
  };

  return (
    <Contexto.Provider value={valor}>
      <div className="reino-corpo page-with-nav" style={{ minHeight: '100dvh' }}>
        <HomeHeader />
        <main>
          <ReinoChegada
            mood={getReinoMood()}
            imagem="/images/reino/casa.webp"
            foco="20% 50%"
            lugar="ECO.01 · Casa da Eco"
            titulo="O que a Eco guarda"
            sobre="As conversas que marcam viram memória. Delas sai o seu retrato."
            voltar={{ rotulo: 'Voltar para a conversa', onClick: () => navigate('/app/chat') }}
          />

          <div className="reino-pagina">
            <nav className="reino-filtros reino-casa__abas" aria-label="Memórias, retrato e relatório">
              {ABAS.map((a) => (
                <NavLink
                  key={a.to}
                  to={a.to}
                  end={a.end}
                  className="reino-filtro"
                  aria-current={undefined}
                  style={({ isActive }) => (isActive ? { color: 'var(--r-fg)', textDecorationColor: 'var(--r-ocre)' } : undefined)}
                >
                  {a.rotulo}
                </NavLink>
              ))}
            </nav>

            {erro ? (
              <div className="reino-aviso" role="alert">
                <span>{erro}</span>
                <button type="button" className="reino-aviso__acao" onClick={recarregar}>
                  Tentar de novo
                </button>
              </div>
            ) : carregando ? (
              <p className="reino-casa__carregando">Abrindo a Casa...</p>
            ) : (
              <Outlet />
            )}
          </div>
        </main>
      </div>
    </Contexto.Provider>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptionTier } from '@/hooks/usePremiumContent';
import CasaDaEco from '@/components/reino/CasaDaEco';
import { buscarMemorias, buscarRetrato, esquecerCacheEmocional, type Memoria, type Retrato } from '@/api/emocional';
import { CasaDaMemoriaContexto } from './casaDaMemoria';

/**
 * Os cômodos da Casa da Eco que guardam o que você contou (set/2026):
 * Memórias (o que ficou), Perfil emocional (o espelho) e Relatórios (o céu
 * dos dias), dentro da mesma moldura da conversa. Memórias e perfil são de
 * toda conta; relatórios, da assinatura.
 */

const DIA_MS = 24 * 60 * 60 * 1000;

/** Quanto do histórico cada plano vê (mantido do desenho anterior). */
const JANELA: Record<string, { dias: number; max: number } | null> = {
  free: { dias: 30, max: 20 },
  essentials: { dias: 90, max: 100 },
  premium: null,
  vip: null,
};

/** Cada cômodo mostra um pedaço da mesma pintura da casa. */
const COMODOS = {
  memorias: {
    comodo: 'o que ficou',
    titulo: 'Memórias',
    sobre: 'Das conversas que pesaram, a Eco guarda o essencial. Só você lê.',
    foco: '30% 55%',
  },
  perfil: {
    comodo: 'o espelho',
    titulo: 'Perfil emocional',
    sobre: 'O que a Eco vê em você, escrito em poucas linhas.',
    foco: '52% 58%',
  },
  relatorio: {
    comodo: 'o céu dos dias',
    titulo: 'Relatórios',
    sobre: 'Como estava o tempo dentro de você, dia a dia.',
    foco: '88% 22%',
  },
} as const;

export default function MemoryLayout() {
  const { user, loading: carregandoConta } = useAuth();
  const tier = useSubscriptionTier();
  const { pathname } = useLocation();
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

  const comodo = pathname.includes('/report')
    ? COMODOS.relatorio
    : pathname.includes('/profile')
      ? COMODOS.perfil
      : COMODOS.memorias;

  return (
    <CasaDaMemoriaContexto.Provider value={{ memorias, totalGuardadas: todas.length, janela, retrato, carregando, erro, recarregar }}>
      <CasaDaEco {...comodo}>
        {erro ? (
          <div className="reino-aviso" role="alert">
            <span>{erro}</span>
            <button type="button" className="reino-aviso__acao" onClick={recarregar}>
              Tentar de novo
            </button>
          </div>
        ) : carregando ? (
          <p className="reino-casa__carregando">Acendendo a lamparina...</p>
        ) : (
          <Outlet />
        )}
      </CasaDaEco>
    </CasaDaMemoriaContexto.Provider>
  );
}

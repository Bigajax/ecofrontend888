// src/pages/memory/MemoryLayout.tsx
import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import PhoneFrame from '../../components/PhoneFrame';
import { useAuth } from '../../contexts/AuthContext';
import { buscarMemoriasPorUsuario } from '../../api/memoriaApi';
import { buscarPerfilEmocional } from '../../api/perfilApi';
import { buscarRelatorioEmocional } from '../../api/relatorioEmocionalApi';
import { MemoryDataContext, type MemoryData } from './memoryData';

// ⬇️ Loader (bolha branca respirando)
import EcoBubbleLoading from '../../components/EcoBubbleLoading';

const MemoryLayout: React.FC = () => {
  const { userId } = useAuth();

  const [state, setState] = useState<MemoryData>({
    memories: [],
    perfil: null,
    relatorio: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let alive = true;

    const load = async () => {
      // Se não houver usuário, apenas marca como carregando (evita flicker)
      if (!userId) {
        setState((s) => ({ ...s, loading: true, error: null }));
        return;
      }

      setState((s) => ({ ...s, loading: true, error: null }));

      const results = await Promise.allSettled([
        buscarMemoriasPorUsuario(userId),
        buscarPerfilEmocional(userId),
        buscarRelatorioEmocional(userId),
      ]);

      if (!alive) return;

      const [memsRes, perfilRes, relRes] = results;

      const memories =
        memsRes.status === 'fulfilled'
          ? memsRes.value.filter(
              (m: any) => m?.salvar_memoria === true || m?.salvar_memoria === 'true'
            )
          : [];

      const perfil = perfilRes.status === 'fulfilled' ? perfilRes.value : null;
      const relatorio = relRes.status === 'fulfilled' ? relRes.value : null;

      const allFailed = results.every((r) => r.status === 'rejected');

      if (allFailed) {
        setState({
          memories: [],
          perfil: null,
          relatorio: null,
          loading: false,
          error: 'Erro ao carregar dados.',
        });
      } else {
        setState({ memories, perfil, relatorio, loading: false, error: null });
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [userId]);

  return (
    <MemoryDataContext.Provider value={state}>
      <PhoneFrame className="flex flex-col h-full bg-white">
        {/* conteúdo puro, sem header interno */}
        <div className="flex-1 overflow-y-auto px-4 py-4 relative">
          {/* Erro acima do conteúdo */}
          {state.error && (
            <div className="mb-3 text-center text-xs text-rose-600">
              {state.error}
            </div>
          )}

          {/* LOADING — bolha respirando centralizada */}
          {state.loading ? (
            <div className="h-[calc(100%-0px)] min-h-[320px] flex items-center justify-center">
              <EcoBubbleLoading size={120} text="Carregando dados..." />
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </PhoneFrame>
    </MemoryDataContext.Provider>
  );
};

export default MemoryLayout;

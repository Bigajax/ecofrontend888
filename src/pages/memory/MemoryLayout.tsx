import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import PhoneFrame from '../../components/PhoneFrame';
import { useAuth } from '../../contexts/AuthContext';
import { buscarMemoriasPorUsuario } from '../../api/memoriaApi';
import { buscarPerfilEmocional } from '../../api/perfilApi';
import { buscarRelatorioEmocional } from '../../api/relatorioEmocionalApi';
import { MemoryDataContext, type MemoryData } from './memoryData';
import EcoBubbleLoading from '../../components/EcoBubbleLoading';

const MemoryLayout: React.FC = () => {
  const { userId } = useAuth();

  const [state, setState] = useState<MemoryData>({
    memories: [],
    perfil: null,
    relatorio: null,
    memoriesLoading: true,
    perfilLoading: true,
    relatorioLoading: true,
    memoriesError: null,
    perfilError: null,
    relatorioError: null,
  });

  useEffect(() => {
    let alive = true;

    const load = async () => {
      if (!userId) {
        setState({
          memories: [],
          perfil: null,
          relatorio: null,
          memoriesLoading: true,
          perfilLoading: true,
          relatorioLoading: true,
          memoriesError: null,
          perfilError: null,
          relatorioError: null,
        });
        return;
      }

      setState({
        memories: [],
        perfil: null,
        relatorio: null,
        memoriesLoading: true,
        perfilLoading: true,
        relatorioLoading: true,
        memoriesError: null,
        perfilError: null,
        relatorioError: null,
      });

      const fetchMemories = async () => {
        try {
          const response = await buscarMemoriasPorUsuario(userId);
          if (!alive) return;

          const filtered = response.filter(
            (m: any) => m?.salvar_memoria === true || m?.salvar_memoria === 'true'
          );

          setState((s) => ({
            ...s,
            memories: filtered,
            memoriesLoading: false,
          }));
        } catch (err) {
          if (!alive) return;
          setState((s) => ({
            ...s,
            memories: [],
            memoriesLoading: false,
            memoriesError: 'Não foi possível carregar memórias.',
          }));
        }
      };

      const fetchPerfil = async () => {
        try {
          const response = await buscarPerfilEmocional(userId);
          if (!alive) return;
          setState((s) => ({
            ...s,
            perfil: response,
            perfilLoading: false,
          }));
        } catch (err) {
          if (!alive) return;
          setState((s) => ({
            ...s,
            perfil: null,
            perfilLoading: false,
            perfilError: 'Não foi possível carregar o perfil emocional.',
          }));
        }
      };

      const fetchRelatorio = async () => {
        try {
          const response = await buscarRelatorioEmocional(userId);
          if (!alive) return;
          setState((s) => ({
            ...s,
            relatorio: response,
            relatorioLoading: false,
          }));
        } catch (err) {
          if (!alive) return;
          setState((s) => ({
            ...s,
            relatorio: null,
            relatorioLoading: false,
            relatorioError: 'Não foi possível carregar o relatório emocional.',
          }));
        }
      };

      void fetchMemories();
      void fetchPerfil();
      void fetchRelatorio();
    };

    load();
    return () => {
      alive = false;
    };
  }, [userId]);

  useEffect(() => {
    void import('./ProfileSection');
    void import('./ReportSection');
  }, []);

  return (
    <MemoryDataContext.Provider value={state}>
      {/* Sem paddings de header/side aqui — o MainLayout já aplica.
          Mantemos a estrutura simples pra evitar “topo duplicado” em webviews */}
      <PhoneFrame className="flex flex-col h-full bg-white">
        <div className="flex-1 overflow-y-auto px-4 py-4 relative">
          {(() => {
            const messages = [
              state.memoriesError,
              state.perfilError,
              state.relatorioError,
            ].filter(Boolean) as string[];
            const uniqueMessages = Array.from(new Set(messages));
            if (!uniqueMessages.length) return null;
            return (
              <div className="mb-3 space-y-1 text-center text-xs text-rose-600">
                {uniqueMessages.map((message, index) => (
                  <div key={`${message}-${index}`}>{message}</div>
                ))}
              </div>
            );
          })()}

          {state.memoriesLoading && state.perfilLoading && state.relatorioLoading ? (
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

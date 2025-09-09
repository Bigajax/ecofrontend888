import React, { useMemo } from 'react';
import { useMemoryData } from './memoryData';
import MapaEmocional2D from '../../components/MapaEmocional2D';
import LinhaDoTempoEmocional from '../../components/LinhaDoTempoEmocional';

const clamp = (v: number, min = -1, max = 1) => Math.max(min, Math.min(max, v));

const HealthCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-white rounded-3xl border border-black/10 shadow-sm p-4 mb-6">
    <h4 className="text-[17px] font-medium text-neutral-900 mb-2">{title}</h4>
    {children}
  </div>
);

const ReportSection: React.FC = () => {
  const { relatorio, loading, error } = useMemoryData();

  const mapaEmocional2D = useMemo(() => {
    if (!Array.isArray(relatorio?.mapa_emocional)) return [];
    return relatorio!.mapa_emocional
      .map((p: any) => ({
        emocao: p.emocao ?? p.emocao_principal ?? 'Desconhecida',
        valenciaNormalizada: clamp(typeof p.valencia === 'number' ? p.valencia : p.x ?? 0),
        excitacaoNormalizada: clamp(typeof p.excitacao === 'number' ? p.excitacao : p.y ?? 0),
        cor: p.cor ?? undefined,
      }))
      .filter((p: any) => typeof p.valenciaNormalizada === 'number' && typeof p.excitacaoNormalizada === 'number');
  }, [relatorio]);

  if (loading) return <div className="flex justify-center items-center h-full text-neutral-500 text-sm">Carregando…</div>;
  if (error)   return <div className="flex justify-center items-center h-full text-rose-500 text-sm">{error}</div>;

  const hasLT = !!relatorio?.linha_do_tempo_intensidade?.length;
  const hasMapa = mapaEmocional2D.length > 0;

  return (
    <>
      {hasMapa && (
        <HealthCard title="Mapa Emocional 2D">
          <MapaEmocional2D data={mapaEmocional2D} />
        </HealthCard>
      )}

      {hasLT && (
        <HealthCard title="Linha do Tempo Emocional">
          <LinhaDoTempoEmocional data={relatorio!.linha_do_tempo_intensidade} />
        </HealthCard>
      )}

      {!hasMapa && !hasLT && (
        <div className="flex flex-col items-center text-center mt-20 text-neutral-500 px-6">
          <div className="text-5xl mb-4">🪷</div>
          <p className="text-lg font-medium mb-2 text-neutral-900">Seu Relatório Emocional está em branco</p>
          <p className="text-sm mb-6 max-w-xs">
            Para criar seu primeiro relatório, compartilhe suas memórias mais marcantes com a Eco.
          </p>
        </div>
      )}

      {!!relatorio && (
        <p className="text-xs text-neutral-500 text-center">
          Total de memórias significativas: {relatorio.total_memorias ?? 'Indisponível'}
        </p>
      )}
    </>
  );
};

export default ReportSection;

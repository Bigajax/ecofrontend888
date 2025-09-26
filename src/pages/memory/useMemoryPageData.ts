import { useEffect, useMemo, useState } from 'react';
import { buscarMemoriasPorUsuario, Memoria } from '../../api/memoriaApi';
import { buscarPerfilEmocional } from '../../api/perfilApi';
import {
  buscarRelatorioEmocional,
  RelatorioEmocional,
} from '../../api/relatorioEmocionalApi';
import {
  FILTER_GROUP_ORDER,
  filtersAreActive,
  generateConsistentPastelColor,
  getEmotionColor,
  groupMemories,
  normalize,
  normalizeTextFields,
  clamp,
} from '../../utils/memory';

export type TabKey = 'memories' | 'profile' | 'report';

export type EmotionChartDatum = { name: string; value: number };

export const normalizeTab = (tab?: string): TabKey => {
  if (tab === 'profile') return 'profile';
  if (tab === 'report') return 'report';
  return 'memories';
};

const savedOnly = (memory: Memoria) => {
  const flag = (memory as any).salvar_memoria;
  if (flag === undefined || flag === null) return true;
  if (typeof flag === 'string') return flag === 'true';
  if (typeof flag === 'number') return flag === 1;
  return Boolean(flag);
};

export function useMemoryPageData(userId?: string | null) {
  const [memories, setMemories] = useState<Memoria[]>([]);
  const [perfil, setPerfil] = useState<any>(null);
  const [relatorio, setRelatorio] = useState<RelatorioEmocional | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [emoFilter, setEmoFilter] = useState<string>('all');
  const [query, setQuery] = useState<string>('');
  const [minIntensity, setMinIntensity] = useState<number>(0);

  useEffect(() => {
    if (!userId) {
      setMemories([]);
      setPerfil(null);
      setRelatorio(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const [memData, perfilData, relatorioData] = await Promise.all([
          buscarMemoriasPorUsuario(userId),
          buscarPerfilEmocional(userId),
          buscarRelatorioEmocional(userId),
        ]);
        if (cancelled) return;
        setMemories(memData.filter(savedOnly));
        setPerfil(perfilData);
        setRelatorio(relatorioData);
      } catch (err) {
        if (cancelled) return;
        setError('Erro ao carregar dados.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const emotionOptions = useMemo(() => {
    const unique = new Set<string>();
    memories.forEach((memory) => {
      if (memory.emocao_principal) unique.add(memory.emocao_principal);
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [memories]);

  const filteredMemories = useMemo(() => {
    const normalizedQuery = normalize(query);

    return memories.filter((memory) => {
      if (emoFilter !== 'all') {
        if (normalize(memory.emocao_principal || '') !== normalize(emoFilter)) return false;
      }

      const intensity = Number((memory as any).intensidade ?? 0);
      if (!Number.isNaN(minIntensity) && intensity < minIntensity) return false;

      if (normalizedQuery) {
        const haystack = normalizeTextFields(
          memory.analise_resumo,
          memory.contexto,
          Array.isArray(memory.tags) ? memory.tags.join(' ') : ''
        );
        if (!haystack.includes(normalizedQuery)) return false;
      }

      return true;
    });
  }, [memories, emoFilter, minIntensity, query]);

  const groupedMemories = useMemo(() => groupMemories(filteredMemories), [filteredMemories]);

  const emotionChart: EmotionChartDatum[] = useMemo(() => {
    if (!perfil?.emocoes_frequentes) return [];
    return Object.entries(perfil.emocoes_frequentes)
      .map(([name, value]) => ({ name, value: Number(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [perfil]);

  const themeChart: EmotionChartDatum[] = useMemo(() => {
    if (!perfil?.temas_recorrentes) return [];
    return Object.entries(perfil.temas_recorrentes)
      .map(([name, value]) => ({ name, value: Number(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [perfil]);

  const mapaEmocional2D = useMemo(() => {
    if (!Array.isArray(relatorio?.mapa_emocional)) return [];
    return relatorio.mapa_emocional
      .map((point: any) => ({
        emocao: point.emocao ?? point.emocao_principal ?? 'Desconhecida',
        valenciaNormalizada: clamp(
          typeof point.valencia === 'number' ? point.valencia : point.x ?? 0
        ),
        excitacaoNormalizada: clamp(
          typeof point.excitacao === 'number' ? point.excitacao : point.y ?? 0
        ),
        cor: point.cor ?? undefined,
      }))
      .filter(
        (point: any) =>
          typeof point.valenciaNormalizada === 'number' &&
          typeof point.excitacaoNormalizada === 'number'
      );
  }, [relatorio]);

  const filtersActive = useMemo(
    () => filtersAreActive(emoFilter, query, minIntensity),
    [emoFilter, query, minIntensity]
  );

  const resetFilters = () => {
    setEmoFilter('all');
    setQuery('');
    setMinIntensity(0);
  };

  return {
    loading,
    error,
    memories,
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
  };
}

export const groupOrder = Array.from(FILTER_GROUP_ORDER);

export const chartColorForEmotion = (emotion: string) => getEmotionColor(emotion);

export const chartColorForTheme = (theme: string) => generateConsistentPastelColor(theme);

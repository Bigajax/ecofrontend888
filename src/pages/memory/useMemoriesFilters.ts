import { useCallback, useMemo, useState } from 'react';

import {
  Memoria,
  getEmotion,
  getTags,
  getCreatedAt,
  groupMemories,
  normalizeText,
  toDate,
} from './utils';

export type MemoriesFiltersState = {
  emotion: 'all' | string;
  query: string;
};

const defaultState: MemoriesFiltersState = {
  emotion: 'all',
  query: '',
};

export const useMemoriesFilters = (memories: Memoria[]) => {
  const [filters, setFilters] = useState<MemoriesFiltersState>(defaultState);

  const emotionOptions = useMemo(() => {
    const set = new Set<string>();
    memories.forEach((memory) => {
      const emotion = getEmotion(memory);
      if (emotion) {
        set.add(emotion);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [memories]);

  const filteredMemories = useMemo(() => {
    const query = normalizeText(filters.query);
    return memories
      .filter((mem) => {
        if (filters.emotion !== 'all' && normalizeText(getEmotion(mem)) !== normalizeText(filters.emotion)) {
          return false;
        }

        if (query) {
          const searchString = [
            mem.analise_resumo || '',
            mem.resumo_eco || '',
            mem.contexto || '',
            getTags(mem).join(' '),
            mem.categoria || '',
            mem.dominio_vida || '',
          ]
            .map(normalizeText)
            .join(' ');

          if (!searchString.includes(query)) {
            return false;
          }
        }

        return true;
      })
      .sort((first, second) => toDate(getCreatedAt(second)).getTime() - toDate(getCreatedAt(first)).getTime());
  }, [memories, filters]);

  const groupedMemories = useMemo(() => groupMemories(filteredMemories), [filteredMemories]);

  const filtersActive = filters.emotion !== 'all' || Boolean(filters.query);

  const setEmotionFilter = useCallback(
    (value: MemoriesFiltersState['emotion']) => setFilters((prev) => ({ ...prev, emotion: value })),
    [],
  );

  const setQueryFilter = useCallback((value: string) => setFilters((prev) => ({ ...prev, query: value })), []);

  const resetFilters = useCallback(() => setFilters(defaultState), []);

  return {
    emotionOptions,
    filteredMemories,
    groupedMemories,
    filters,
    filtersActive,
    setEmotionFilter,
    setQueryFilter,
    resetFilters,
  };
};

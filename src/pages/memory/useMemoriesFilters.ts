import { useCallback, useMemo, useState } from 'react';

import { BUCKET_ORDER, groupMemoryCards, MemoryBucket, MemoryCardDTO } from './memoryCardDto';
import { normalize as normalizeText } from '../../utils/memory';

export type MemoriesFiltersState = {
  emotion: 'all' | string;
  query: string;
};

const defaultState: MemoriesFiltersState = {
  emotion: 'all',
  query: '',
};

export type GroupedCards = Record<MemoryBucket, MemoryCardDTO[]>;

export const useMemoriesFilters = (memories: MemoryCardDTO[]) => {
  const [filters, setFilters] = useState<MemoriesFiltersState>(defaultState);

  const normalizedMemories = useMemo(() => {
    return [...memories].sort((a, b) => {
      const timeA = a.createdAtDate ? a.createdAtDate.getTime() : -Infinity;
      const timeB = b.createdAtDate ? b.createdAtDate.getTime() : -Infinity;
      return timeB - timeA;
    });
  }, [memories]);

  const emotionOptions = useMemo(() => {
    const set = new Set<string>();
    normalizedMemories.forEach((memory) => {
      if (memory.emocao) {
        set.add(memory.emocao);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [normalizedMemories]);

  const filteredMemories = useMemo(() => {
    const query = normalizeText(filters.query);
    return normalizedMemories.filter((memory) => {
      if (filters.emotion !== 'all') {
        if (normalizeText(memory.emocao) !== normalizeText(filters.emotion)) {
          return false;
        }
      }

      if (query) {
        const searchString = [
          memory.resumoCompleto ?? '',
          memory.raw.contexto ?? '',
          memory.tags.join(' '),
          memory.categoria ?? '',
          memory.domain ?? '',
          memory.raw.resumo_eco ?? '',
        ]
          .map(normalizeText)
          .join(' ');

        if (!searchString.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [normalizedMemories, filters]);

  const groupedMemories = useMemo<GroupedCards>(() => groupMemoryCards(filteredMemories), [filteredMemories]);

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

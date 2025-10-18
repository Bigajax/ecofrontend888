import React from 'react';
import { motion } from 'framer-motion';

import { useMemo, useState } from 'react';

import type { Memoria } from '../../api/memoriaApi';

import { useMemoryData } from './memoryData';
import MemoryCard from '../../components/memory/MemoryCard';
import MemoriesFilterBar from '../../components/memory/MemoriesFilterBar';
import MemoryEmptyState from '../../components/memory/MemoryEmptyState';
import MemoryCardSkeleton from '../../components/memory/MemoryCardSkeleton';
import { useMemoriesFilters } from './useMemoriesFilters';
import { normalizeMemoryCollection, BUCKET_ORDER, groupMemoryCards } from './memoryCardDto';

const PAGE_SIZE = 20;

const MemoriesSection: React.FC = () => {
  const { memories, memoriesLoading, memoriesError, memoriesErrorDetails } = useMemoryData();

  const normalizedCards = useMemo(
    () => normalizeMemoryCollection(memories as Memoria[]),
    [memories]
  );

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const {
    emotionOptions,
    filteredMemories,
    filters,
    filtersActive,
    setEmotionFilter,
    setQueryFilter,
    resetFilters,
  } = useMemoriesFilters(normalizedCards);

  const limitedMemories = useMemo(() => filteredMemories.slice(0, visibleCount), [filteredMemories, visibleCount]);
  const limitedGroups = useMemo(() => groupMemoryCards(limitedMemories), [limitedMemories]);
  const hasMore = filteredMemories.length > visibleCount;

  if (memoriesLoading) {
    return (
      <div className="min-h-0 h-full max-h-[calc(100vh-96px)] overflow-y-auto overflow-x-hidden">
        <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-8 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <MemoryCardSkeleton key={`memory-skeleton-${index}`} />
          ))}
        </div>
      </div>
    );
  }

  if (memoriesError) {
    return (
      <div className="flex items-center justify-center h-64 px-6 text-center">
        <div className="rounded-3xl border border-rose-100 bg-rose-50 px-6 py-5 shadow-sm">
          <p className="text-[15px] font-semibold text-rose-600">{memoriesError}</p>
          {memoriesErrorDetails?.status || memoriesErrorDetails?.message ? (
            <p className="mt-2 text-[12px] text-rose-500/80">
              Detalhes técnicos:{' '}
              {memoriesErrorDetails?.status
                ? `${memoriesErrorDetails.status}${
                    memoriesErrorDetails.statusText ? ` ${memoriesErrorDetails.statusText}` : ''
                  }`
                : 'status indisponível'}
              {memoriesErrorDetails?.message ? ` • ${memoriesErrorDetails.message}` : ''}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex items-center justify-center rounded-full border border-rose-200/70 bg-white/90 px-4 py-2 text-sm font-semibold text-rose-600 shadow-sm transition hover:bg-white"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 h-full max-h-[calc(100vh-96px)] overflow-y-auto overflow-x-hidden">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        <section className="rounded-[28px] border border-black/[0.08] bg-white/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(0,0,0,0.05),0_16px_60px_rgba(0,0,0,0.04)] p-6 md:p-8 mb-8">
          <header className="mb-6">
            <h1 className="font-display text-[36px] md:text-[48px] leading-[1.06] font-semibold text-gray-900 tracking-tight">
              Memórias
            </h1>
            <p className="mt-3 text-[13px] md:text-[14px] leading-[1.7] text-gray-600 font-medium max-w-2xl">
              Padrões, insights e reflexões organizados pela Eco.
            </p>
          </header>

          <MemoriesFilterBar
            emotionOptions={emotionOptions}
            filters={filters}
            filtersActive={filtersActive}
            onEmotionChange={setEmotionFilter}
            onQueryChange={setQueryFilter}
            onReset={resetFilters}
          />
        </section>

        {filteredMemories.length ? (
          <motion.div layout className="space-y-8">
            {BUCKET_ORDER.filter((bucket) => limitedGroups[bucket]?.length).map((bucket) => (
              <motion.section
                key={bucket}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h3 className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-4">{bucket}</h3>
                <ul className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
                  {limitedGroups[bucket]!.map((memory) => (
                    <MemoryCard key={memory.id} mem={memory} />
                  ))}
                </ul>
              </motion.section>
            ))}
            {hasMore ? (
              <div className="flex justify-center pt-4">
                <button
                  type="button"
                  onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                  className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-white"
                >
                  Carregar mais
                </button>
              </div>
            ) : null}
          </motion.div>
        ) : (
          <MemoryEmptyState hasFilters={filtersActive} />
        )}
      </div>
    </div>
  );
};

export default MemoriesSection;

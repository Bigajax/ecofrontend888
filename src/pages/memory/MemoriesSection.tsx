import React from 'react';
import { motion } from 'framer-motion';

import { useMemoryData } from './memoryData';
import EcoBubbleLoading from '../../components/EcoBubbleLoading';
import MemoryCard from '../../components/memory/MemoryCard';
import MemoriesFilterBar from '../../components/memory/MemoriesFilterBar';
import MemoryEmptyState from '../../components/memory/MemoryEmptyState';
import { useMemoriesFilters } from './useMemoriesFilters';
import { getCreatedAt, getEmotion, Memoria } from './utils';

const BUCKET_ORDER = ['Hoje', 'Ontem', 'Esta semana', 'Este mês', 'Anteriores'] as const;

const MemoriesSection: React.FC = () => {
  const { memories, memoriesLoading, memoriesError } = useMemoryData();

  const {
    emotionOptions,
    filteredMemories,
    groupedMemories,
    filters,
    filtersActive,
    setEmotionFilter,
    setQueryFilter,
    resetFilters,
  } = useMemoriesFilters(memories as Memoria[]);

  if (memoriesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <EcoBubbleLoading size={120} text="Carregando memórias..." breathingSec={2} />
      </div>
    );
  }

  if (memoriesError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500 text-[15px]">{memoriesError}</div>
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
            {BUCKET_ORDER.filter((bucket) => groupedMemories[bucket]?.length).map((bucket) => (
              <motion.section
                key={bucket}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h3 className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-4">{bucket}</h3>
                <ul className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
                  {groupedMemories[bucket]!.map((memory, index) => (
                    <MemoryCard
                      key={
                        memory.id
                          ? String(memory.id)
                          : `${getCreatedAt(memory) ?? 'sem-data'}-${getEmotion(memory)}-${index}`
                      }
                      mem={memory}
                    />
                  ))}
                </ul>
              </motion.section>
            ))}
          </motion.div>
        ) : (
          <MemoryEmptyState hasFilters={filtersActive} />
        )}
      </div>
    </div>
  );
};

export default MemoriesSection;

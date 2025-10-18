import React, { useMemo } from 'react';

import type { Memoria } from '../../../api/memoriaApi';
import MemoryCardBase from '../../../components/memory/MemoryCard';
import { normalizeMemoryCard } from '../memoryCardDto';

type MemoryCardProps = {
  mem: Memoria;
};

const MemoryCard: React.FC<MemoryCardProps> = ({ mem }) => {
  const dto = useMemo(() => normalizeMemoryCard(mem), [mem]);
  return <MemoryCardBase mem={dto} />;
};

export default MemoryCard;

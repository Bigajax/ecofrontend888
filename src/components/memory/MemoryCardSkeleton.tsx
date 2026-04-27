import React from 'react';

const MemoryCardSkeleton: React.FC = () => (
  <div
    className="relative flex flex-col overflow-hidden rounded-2xl bg-white"
    style={{ border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 4px 24px rgba(13,52,97,0.05)' }}
  >
    {/* Header */}
    <div className="flex items-start gap-4 px-5 pt-5 pb-4 border-b border-black/[0.06]">
      <div
        className="h-14 w-14 shrink-0 rounded-2xl animate-pulse"
        style={{ background: 'linear-gradient(135deg, #c8daff 0%, #a5c0ff 100%)' }}
      />
      <div className="flex-1 space-y-2.5 pt-1">
        <div className="h-4 w-3/4 rounded-full animate-pulse" style={{ backgroundColor: 'rgba(0,0,0,0.06)' }} />
        <div className="h-3 w-1/3 rounded-full animate-pulse" style={{ backgroundColor: 'rgba(0,0,0,0.04)' }} />
      </div>
      <div className="h-8 w-8 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: 'rgba(0,0,0,0.04)' }} />
    </div>

    {/* Intensity */}
    <div className="px-5 pt-4 pb-3 border-b border-black/[0.06]">
      <div className="flex justify-between mb-2.5">
        <div className="h-3 w-20 rounded-full animate-pulse" style={{ backgroundColor: 'rgba(0,0,0,0.05)' }} />
        <div className="h-3 w-10 rounded-full animate-pulse" style={{ backgroundColor: 'rgba(0,0,0,0.05)' }} />
      </div>
      <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}>
        <div
          className="h-full w-2/3 rounded-full animate-pulse"
          style={{ background: 'linear-gradient(90deg, #c8daff, #a5c0ff)' }}
        />
      </div>
    </div>

    {/* Tags */}
    <div className="px-5 py-4 flex flex-wrap gap-2">
      <div className="h-6 w-20 rounded-full animate-pulse" style={{ backgroundColor: '#EDF4FF' }} />
      <div className="h-6 w-16 rounded-full animate-pulse" style={{ backgroundColor: '#EDF4FF' }} />
      <div className="h-6 w-12 rounded-full animate-pulse" style={{ backgroundColor: '#EDF4FF' }} />
    </div>
  </div>
);

export default MemoryCardSkeleton;

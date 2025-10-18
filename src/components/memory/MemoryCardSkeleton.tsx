import React from 'react';

const shimmer = 'bg-gradient-to-r from-white/40 via-white/90 to-white/40';

const MemoryCardSkeleton: React.FC = () => (
  <div className="relative flex flex-col gap-5 overflow-hidden rounded-[26px] border border-white/60 bg-white/70 px-5 py-5 backdrop-blur-2xl shadow-[0_16px_38px_rgba(15,23,42,0.08)]">
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-[26px] bg-gradient-to-br from-slate-100/70 to-white/50"
    />
    <div className="relative flex items-start gap-4">
      <div className="h-14 w-14 rounded-full bg-slate-200/70" />
      <div className="flex-1 space-y-3">
        <div className="h-4 w-2/3 rounded-full bg-slate-200/80" />
        <div className="h-3 w-1/2 rounded-full bg-slate-200/70" />
      </div>
    </div>
    <div className="relative">
      <div className="mb-2 flex items-center justify-between text-[12px] text-slate-400">
        <div className="h-3 w-20 rounded-full bg-slate-200/60" />
        <div className="h-3 w-10 rounded-full bg-slate-200/60" />
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/50">
        <span className={`block h-full w-1/2 rounded-full ${shimmer} animate-pulse`} />
      </div>
    </div>
    <div className="flex flex-wrap gap-2">
      <div className="h-6 w-20 rounded-full bg-slate-200/60" />
      <div className="h-6 w-16 rounded-full bg-slate-200/60" />
      <div className="h-6 w-12 rounded-full bg-slate-200/50" />
    </div>
  </div>
);

export default MemoryCardSkeleton;

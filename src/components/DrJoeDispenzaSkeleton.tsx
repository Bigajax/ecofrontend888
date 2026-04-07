function Shimmer({ className }: { className: string }) {
  return (
    <div
      className={`rounded-xl bg-white/[0.07] ${className}`}
      style={{
        background:
          'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.04) 100%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-shimmer 1.6s ease-in-out infinite',
      }}
    />
  );
}

export default function DrJoeDispenzaSkeleton() {
  return (
    <>
      <style>{`
        @keyframes skeleton-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <main className="pb-20">
        {/* ── Hero ── */}
        <section className="relative flex min-h-[640px] flex-col items-center justify-end overflow-hidden sm:min-h-[720px]">
          <div className="absolute inset-0 bg-[#0B1220]" />
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 60% 50% at 50% 35%, rgba(59,130,246,0.08) 0%, transparent 70%)',
            }}
          />

          <div className="relative z-10 mx-auto w-full max-w-2xl px-6 pb-16 pt-28 text-center sm:px-8 sm:pb-20">
            <div
              className="w-full rounded-3xl px-5 py-7 sm:px-8 sm:py-8"
              style={{
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {/* Badge */}
              <div className="mb-6 flex justify-center">
                <Shimmer className="h-6 w-36 rounded-full" />
              </div>
              {/* H1 line 1 */}
              <Shimmer className="mx-auto h-10 w-4/5 sm:h-12" />
              {/* H1 line 2 */}
              <Shimmer className="mx-auto mt-3 h-10 w-3/5 sm:h-12" />
              {/* Subtitle */}
              <Shimmer className="mx-auto mt-6 h-4 w-full max-w-sm" />
              <Shimmer className="mx-auto mt-2 h-4 w-2/3 max-w-xs" />
            </div>

            {/* Benefits */}
            <div
              className="mt-8 w-full max-w-xl rounded-2xl px-5 py-5"
              style={{
                background: 'rgba(0,0,0,0.28)',
                border: '1px solid rgba(255,255,255,0.10)',
              }}
            >
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 py-1.5">
                  <Shimmer className="h-6 w-6 flex-shrink-0 rounded-full" />
                  <Shimmer className={`h-4 ${i === 2 ? 'w-40' : 'w-56'}`} />
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="mt-10 flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:justify-center">
              <Shimmer className="h-12 w-full rounded-full sm:w-52" />
              <Shimmer className="h-12 w-full rounded-full sm:w-36" />
            </div>
          </div>
        </section>

        {/* ── Section divider ── */}
        <div className="mx-auto max-w-4xl px-4 py-10 md:px-8">
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-white/10" />
            <Shimmer className="h-7 w-40 rounded-full" />
            <div className="h-px flex-1 bg-white/10" />
          </div>
        </div>

        {/* ── Intro emocional ── */}
        <div className="mx-auto max-w-2xl space-y-14 px-6 pb-10 md:px-4">
          {[
            { h: 'w-3/4', lines: ['w-48', 'w-40'] },
            { h: 'w-1/2', lines: ['w-64'] },
            { h: 'w-2/3', lines: ['w-52', 'w-40'] },
          ].map((block, i) => (
            <div key={i} className="space-y-3 text-center">
              <Shimmer className={`mx-auto h-8 ${block.h}`} />
              {block.lines.map((w, j) => (
                <Shimmer key={j} className={`mx-auto h-4 ${w}`} />
              ))}
            </div>
          ))}
        </div>

        {/* ── Card explicativo ── */}
        <div className="mx-auto max-w-4xl px-4 pb-10 md:px-8">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
            <Shimmer className="mb-7 h-3 w-40" />
            <div className="space-y-7">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4">
                  <Shimmer className="h-4 w-5 flex-shrink-0 rounded" />
                  <div className="flex-1 space-y-2 border-l border-white/10 pl-4">
                    <Shimmer className="h-3 w-32" />
                    <Shimmer className="h-4 w-full" />
                    <Shimmer className="h-4 w-4/5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Etapa cards ── */}
        <div className="mx-auto max-w-4xl space-y-10 px-4 py-4 md:px-8">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05]"
            >
              {/* Image header skeleton */}
              <div className="relative" style={{ minHeight: 220 }}>
                <div className="absolute inset-0 bg-[#0B1220]" />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'radial-gradient(ellipse 55% 55% at 50% 35%, rgba(59,130,246,0.07) 0%, transparent 68%)',
                  }}
                />
                <div className="relative z-10 px-6 py-8 sm:px-8">
                  <Shimmer className="mb-3 h-5 w-20 rounded-full" />
                  <Shimmer className="h-8 w-3/5 sm:h-9" />
                  <Shimmer className="mt-3 h-4 w-full max-w-xs" />
                </div>
              </div>
              {/* Content area */}
              <div className="px-5 py-5 sm:px-8 sm:py-6">
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-3 sm:p-4">
                  <div className="flex items-center gap-3">
                    <Shimmer className="h-7 w-7 flex-shrink-0 rounded-full" />
                    <div className="space-y-2">
                      <Shimmer className="h-4 w-36 sm:w-48" />
                      <Shimmer className="h-3 w-28 sm:w-40" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Shimmer className="h-3 w-10" />
                    <Shimmer className="h-9 w-9 rounded-full sm:h-10 sm:w-10" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}

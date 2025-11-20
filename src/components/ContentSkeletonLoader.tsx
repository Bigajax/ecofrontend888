export default function ContentSkeletonLoader() {
  return (
    <main className="md:pt-0">
      {/* Hero Section Skeleton */}
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
        <div className="grid gap-6 md:grid-cols-2 md:h-96">
          {/* Left Card */}
          <div className="rounded-3xl border border-gray-200 bg-gray-100 p-8 animate-pulse">
            <div className="h-12 w-3/4 rounded-lg bg-gray-200 mb-4" />
            <div className="h-12 w-2/3 rounded-lg bg-gray-200 mb-6" />
            <div className="h-4 w-1/2 rounded bg-gray-200 mb-6" />
            <div className="h-10 w-48 rounded bg-gray-200" />
          </div>

          {/* Right Card */}
          <div className="rounded-3xl border border-gray-200 bg-gray-100 animate-pulse" />
        </div>
      </div>

      {/* Cards Grid Skeleton */}
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
        {/* Section Title */}
        <div className="mb-8 pb-6 border-b border-gray-200">
          <div className="h-7 w-48 rounded bg-gray-200 animate-pulse mb-2" />
          <div className="h-4 w-64 rounded bg-gray-200 animate-pulse" />
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-200 overflow-hidden animate-pulse"
            >
              <div className="h-40 bg-gray-200" />
              <div className="bg-gray-100 p-4 space-y-3">
                <div className="h-6 w-3/4 rounded bg-gray-200" />
                <div className="h-4 w-1/2 rounded bg-gray-200" />
                <div className="h-4 w-full rounded bg-gray-200" />
                <div className="h-10 w-full rounded-lg bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Another Section */}
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
        <div className="mb-8 pb-6 border-b border-gray-200">
          <div className="h-7 w-40 rounded bg-gray-200 animate-pulse mb-2" />
          <div className="h-4 w-72 rounded bg-gray-200 animate-pulse" />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-200 overflow-hidden animate-pulse"
            >
              <div className="h-40 bg-gray-200" />
              <div className="bg-gray-100 p-4 space-y-3">
                <div className="h-5 w-2/3 rounded bg-gray-200" />
                <div className="h-4 w-full rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

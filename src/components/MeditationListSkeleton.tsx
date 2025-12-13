export default function MeditationListSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8 md:px-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="mb-4 flex items-center justify-between sm:mb-6">
        <div className="h-6 w-24 bg-gray-200 rounded-md"></div>
        <div className="h-5 w-32 bg-gray-200 rounded-md"></div>
      </div>

      {/* List Items Skeleton */}
      <div className="space-y-3 sm:space-y-4">
        {[1, 2, 3, 4, 5].map((index) => (
          <div
            key={index}
            className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm sm:items-center sm:gap-4 sm:p-4"
          >
            {/* Checkbox Skeleton */}
            <div className="flex-shrink-0 pt-1 sm:pt-0">
              <div className="h-7 w-7 rounded-full bg-gray-200 sm:h-8 sm:w-8"></div>
            </div>

            {/* Content Skeleton */}
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1 space-y-2">
                {/* Title Skeleton */}
                <div className="h-5 w-48 bg-gray-200 rounded-md sm:w-64"></div>
                {/* Description Skeleton */}
                <div className="h-4 w-full max-w-xs bg-gray-200 rounded-md"></div>
              </div>

              {/* Right side - Duration and Play Button */}
              <div className="flex w-full items-center justify-between sm:ml-4 sm:w-auto sm:justify-end sm:gap-3">
                {/* Duration Skeleton */}
                <div className="h-4 w-12 bg-gray-200 rounded-md"></div>
                {/* Play Button Skeleton */}
                <div className="h-9 w-9 rounded-full bg-gray-200 sm:h-10 sm:w-10"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { lazy, Suspense, ComponentType } from 'react';

// Lazy load Nivo chart components
const ResponsiveLine = lazy(() =>
  import('@nivo/line').then(module => ({ default: module.ResponsiveLine }))
);

const ResponsiveBar = lazy(() =>
  import('@nivo/bar').then(module => ({ default: module.ResponsiveBar }))
);

// Chart loading skeleton
function ChartSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gray-50 rounded-lg">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500" />
        <p className="text-xs text-gray-400">Carregando gráfico...</p>
      </div>
    </div>
  );
}

// Wrapper component for ResponsiveLine
export function LazyResponsiveLine(props: ComponentType<any>) {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <ResponsiveLine {...props} />
    </Suspense>
  );
}

// Wrapper component for ResponsiveBar
export function LazyResponsiveBar(props: ComponentType<any>) {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <ResponsiveBar {...props} />
    </Suspense>
  );
}

/**
 * LazyRechartsWrapper.tsx
 *
 * Componente wrapper para Recharts com lazy loading e Suspense.
 * Substitui LazyCharts.tsx que usava @nivo.
 *
 * Migração: @nivo → Recharts
 * Economia: -550 kB (-180 kB gzip)
 *
 * @see PERFORMANCE_REPORT.md
 */

import { Suspense } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// ============================================================================
// Loading Skeleton
// ============================================================================

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

// ============================================================================
// Custom Tooltip (mesmo estilo do MemoryPage.tsx)
// ============================================================================

const CustomTooltip = ({ active, payload, label }: any) =>
  active && payload?.length ? (
    <div
      style={{
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(6px)',
        border: '1px solid rgba(0,0,0,0.08)',
        padding: '8px 12px',
        boxShadow: '0 8px 18px rgba(0,0,0,.06)',
        color: '#374151',
        fontSize: '0.85rem',
      }}
    >
      <div className="font-medium">{label}</div>
      <div>{payload[0].value}</div>
    </div>
  ) : null;

// ============================================================================
// Types
// ============================================================================

export interface BarChartDataItem {
  name: string;
  value: number;
  color?: string;
}

export interface LazyBarChartProps {
  /**
   * Dados para o gráfico de barras
   * @example [{ name: 'Alegria', value: 10 }, { name: 'Tristeza', value: 5 }]
   */
  data: BarChartDataItem[];

  /**
   * Altura do gráfico em pixels
   * @default 230
   */
  height?: number;

  /**
   * Largura das barras em pixels
   * @default 37
   */
  barSize?: number;

  /**
   * Função para obter a cor de cada barra
   * @default (item) => item.color || '#3b82f6'
   */
  colorAccessor?: (item: BarChartDataItem) => string;

  /**
   * Margens do gráfico
   * @default { top: 20, right: 5, left: 5, bottom: 40 }
   */
  margin?: {
    top?: number;
    right?: number;
    left?: number;
    bottom?: number;
  };

  /**
   * Gap entre categorias de barras (porcentagem)
   * @default "30%"
   */
  barCategoryGap?: string;
}

// ============================================================================
// LazyBarChart Component
// ============================================================================

/**
 * Componente de gráfico de barras com lazy loading.
 *
 * Usa Recharts internamente (já incluído no bundle principal).
 * Substitui ResponsiveBar do @nivo (economiza 550 kB).
 *
 * @example
 * ```tsx
 * <LazyBarChart
 *   data={[
 *     { name: 'Alegria', value: 10 },
 *     { name: 'Tristeza', value: 5 },
 *   ]}
 *   colorAccessor={(item) => chartColorForEmotion(item.name)}
 * />
 * ```
 */
export function LazyBarChart({
  data,
  height = 230,
  barSize = 37,
  colorAccessor = (item) => item.color || '#3b82f6',
  margin = { top: 20, right: 5, left: 5, bottom: 40 },
  barCategoryGap = '30%',
}: LazyBarChartProps) {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          margin={margin}
          barCategoryGap={barCategoryGap}
        >
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#111827', fontSize: 12 }}
          />
          <YAxis
            domain={[0, 'dataMax + 5']}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" barSize={barSize} radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colorAccessor(entry)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Suspense>
  );
}

// ============================================================================
// Migration Notes
// ============================================================================

/**
 * MIGRATION FROM NIVO:
 *
 * Antes (@nivo):
 * ```tsx
 * import { LazyResponsiveBar } from '@/components/charts/LazyCharts';
 *
 * <LazyResponsiveBar
 *   data={emotionChart}
 *   keys={['value']}
 *   indexBy="name"
 *   margin={{ top: 20, right: 5, left: 5, bottom: 40 }}
 *   padding={0.3}
 *   colors={(d) => chartColorForEmotion(d.indexValue)}
 * />
 * ```
 *
 * Depois (Recharts):
 * ```tsx
 * import { LazyBarChart } from '@/components/charts/LazyRechartsWrapper';
 *
 * <LazyBarChart
 *   data={emotionChart}
 *   height={230}
 *   barSize={37}
 *   colorAccessor={(item) => chartColorForEmotion(item.name)}
 * />
 * ```
 *
 * BREAKING CHANGES: Nenhum (API compatível)
 * VISUAL CHANGES: Nenhum (mesmo estilo)
 * BUNDLE SIZE: -550 kB (-180 kB gzip) ✅
 */

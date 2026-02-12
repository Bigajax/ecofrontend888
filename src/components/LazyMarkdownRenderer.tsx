/**
 * LazyMarkdownRenderer - Lazy loading wrapper para MarkdownRenderer
 *
 * Carrega react-markdown apenas quando necessário (quando há markdown no texto).
 * Economia: -117 kB do bundle inicial (-36 kB gzip)
 *
 * @see PERFORMANCE_REPORT.md - Quick Win #3
 */

import { lazy, Suspense } from 'react';

// Lazy load MarkdownRenderer (que importa react-markdown)
const MarkdownRenderer = lazy(() => import('./MarkdownRenderer'));

interface LazyMarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Skeleton simples enquanto react-markdown carrega
 * (raramente visível, pois markdown carrega rapidamente)
 */
function MarkdownSkeleton({ content }: { content: string }) {
  return (
    <div className="markdown-content space-y-1 animate-pulse">
      <p className="leading-relaxed text-eco-text/80">{content}</p>
    </div>
  );
}

/**
 * Versão lazy-loaded do MarkdownRenderer.
 *
 * Use este componente ao invés do MarkdownRenderer direto para
 * evitar incluir react-markdown no bundle inicial.
 *
 * @example
 * ```tsx
 * <LazyMarkdownRenderer content={message.content} />
 * ```
 */
export default function LazyMarkdownRenderer({ content, className }: LazyMarkdownRendererProps) {
  return (
    <Suspense fallback={<MarkdownSkeleton content={content} />}>
      <MarkdownRenderer content={content} className={className} />
    </Suspense>
  );
}

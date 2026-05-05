import { useEffect, useRef } from 'react';

interface PageContainerProps {
  children: React.ReactNode;
  hasBottomNav?: boolean;
  hasTopBar?: boolean;
  scrollable?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function PageContainer({
  children,
  hasBottomNav = true,
  hasTopBar = false,
  scrollable = true,
  className = '',
  style,
}: PageContainerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    };
    const el = ref.current;
    el?.addEventListener('focusin', handleFocus);
    return () => el?.removeEventListener('focusin', handleFocus);
  }, []);

  return (
    <div
      ref={ref}
      className={[
        'w-full',
        scrollable ? 'overflow-y-scroll overscroll-contain' : 'overflow-hidden',
        className,
      ].join(' ')}
      style={{
        minHeight: '100dvh',
        paddingTop: hasTopBar
          ? 'calc(56px + env(safe-area-inset-top))'
          : 'env(safe-area-inset-top)',
        paddingBottom: hasBottomNav
          ? 'calc(72px + env(safe-area-inset-bottom))'
          : 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
        ...({ WebkitOverflowScrolling: 'touch' } as React.CSSProperties),
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

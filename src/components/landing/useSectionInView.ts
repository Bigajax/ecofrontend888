import { useEffect, useRef } from 'react';
import { trackLandingSectionViewed } from './trackLandingCta';

export function useSectionInView(section: string, headlineVariant?: '1' | '2') {
  const ref = useRef<HTMLElement | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || fired.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && !fired.current) {
          fired.current = true;
          trackLandingSectionViewed(section, headlineVariant);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [section, headlineVariant]);

  return ref;
}

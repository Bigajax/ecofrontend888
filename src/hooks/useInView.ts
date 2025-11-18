import { useEffect, useRef, useState } from 'react';

interface UseInViewOptions {
  threshold?: number | number[];
  rootMargin?: string;
  triggerOnce?: boolean;
}

export function useInView(options: UseInViewOptions = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const hasTriggered = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Debug logging
        if (process.env.NODE_ENV === 'development') {
          console.log('IntersectionObserver fired:', {
            isIntersecting: entry.isIntersecting,
            hasTriggered: hasTriggered.current,
            boundingClientRect: entry.boundingClientRect
          });
        }

        if (entry.isIntersecting && !hasTriggered.current) {
          setIsInView(true);
          hasTriggered.current = true;

          if (options.triggerOnce !== false) {
            observer.unobserve(entry.target);
          }
        }
      },
      {
        threshold: options.threshold ?? 0.15,
        rootMargin: options.rootMargin ?? '0px 0px -100px 0px',
      }
    );

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [options.threshold, options.rootMargin, options.triggerOnce]);

  return { ref, isInView };
}

import { useState, useEffect, useRef, ImgHTMLAttributes } from 'react';

interface LazyImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  /**
   * Low-quality placeholder image (base64 or tiny image)
   * Shows while main image loads
   */
  placeholder?: string;
  /**
   * Threshold for IntersectionObserver (0-1)
   * 0 = load when entering viewport
   * 0.1 = load when 10% visible
   * Default: 0.1
   */
  threshold?: number;
  /**
   * Root margin for IntersectionObserver
   * Positive = load before entering viewport
   * Example: "200px" loads 200px before visible
   * Default: "50px"
   */
  rootMargin?: string;
}

export function LazyImage({
  src,
  alt,
  placeholder,
  threshold = 0.1,
  rootMargin = '50px',
  className = '',
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    // Early return if no IntersectionObserver support
    if (!('IntersectionObserver' in window)) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin]);

  // Actually load the image once in view
  useEffect(() => {
    if (!isInView) return;

    const img = new Image();
    img.src = src;
    img.onload = () => {
      setIsLoaded(true);
    };
  }, [isInView, src]);

  return (
    <img
      ref={imgRef}
      src={isLoaded ? src : placeholder || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'}
      alt={alt}
      className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
      loading="lazy" // Native lazy loading as fallback
      {...props}
    />
  );
}

export default LazyImage;

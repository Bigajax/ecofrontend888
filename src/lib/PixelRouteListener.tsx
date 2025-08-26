// src/lib/PixelRouteListener.tsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function PixelRouteListener() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'PageView');
    }
  }, [location.pathname, location.search]);

  return null;
}

// src/lib/fbpixel.ts
export const FB_PIXEL_ID = import.meta.env.VITE_FB_PIXEL_ID as string;

export function initFacebookPixel() {
  if (!FB_PIXEL_ID) {
    console.warn('VITE_FB_PIXEL_ID não definido');
    return;
  }
  if (typeof window === 'undefined') return;
  if ((window as any).fbq) return; // evita reinicializar

  (function(f:any,b:any,e:any,v:any,n?:any,t?:any,s?:any){
    if(f.fbq) return; n=f.fbq=function(){ n.callMethod ?
      n.callMethod.apply(n,arguments) : n.queue.push(arguments) };
    if(!f._fbq) f._fbq=n; n.push=n; n.loaded=!0; n.version='2.0';
    n.queue=[]; t=b.createElement(e); t.async=!0;
    t.src=v; s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

  (window as any).fbq('init', FB_PIXEL_ID);
  (window as any).fbq('track', 'PageView');
}

export function fbq(event: string, params?: Record<string, any>) {
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', event, params || {});
  }
}

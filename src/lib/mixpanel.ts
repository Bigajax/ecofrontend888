import mixpanel from 'mixpanel-browser';

const PROD_HOST = 'ecofrontend888.vercel.app';

// Só produção emite eventos. Previews da Vercel (`<projeto>-<hash>-<scope>.vercel.app`,
// geradas a cada push) e localhost NÃO devem poluir o projeto Mixpanel — bots
// varrem essas URLs de preview e inflavam os eventos de topo de funil (Landing ·).
// Domínio próprio (não-.vercel.app) continua emitindo. Override de dev opcional:
// localStorage.setItem('ECO_FORCE_ANALYTICS','1').
function analyticsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (localStorage.getItem('ECO_FORCE_ANALYTICS') === '1') return true;
  } catch {
    // localStorage indisponível — segue na checagem de host
  }
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return false;
  // qualquer .vercel.app que NÃO seja o host de produção = preview
  if (host.endsWith('.vercel.app') && host !== PROD_HOST) return false;
  return true;
}

mixpanel.init(import.meta.env.VITE_MIXPANEL_TOKEN || '', {
  debug: false, // Desabilitado para evitar travamento
  api_host: 'https://api-eu.mixpanel.com',

  // Otimizações para evitar mutex timeout e flood de eventos
  batch_requests: true,           // Agrupar eventos em lotes
  batch_size: 50,                 // Enviar a cada 50 eventos
  batch_flush_interval_ms: 5000,  // OU a cada 5 segundos (o que vier primeiro)

  // Persistência otimizada
  persistence: 'localStorage',
  persistence_name: 'mp_eco_',

  // Evitar race conditions
  track_pageview: false,          // Já fazemos manualmente com MixpanelRouteListener
});

if (!analyticsEnabled()) {
  // Preview/localhost: desarma todo tracking (mixpanel.* viram no-op).
  mixpanel.disable();
}

if (!import.meta.env.VITE_MIXPANEL_TOKEN) {
  console.warn('Mixpanel token is not configured.');
}

export default mixpanel;

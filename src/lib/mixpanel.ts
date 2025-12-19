import mixpanel from 'mixpanel-browser';

mixpanel.init(import.meta.env.VITE_MIXPANEL_TOKEN || '', {
  debug: true, // opcional para ver no console
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

if (!import.meta.env.VITE_MIXPANEL_TOKEN) {
  console.warn('Mixpanel token is not configured.');
}

export default mixpanel;

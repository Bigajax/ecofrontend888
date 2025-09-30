import mixpanel from 'mixpanel-browser';

mixpanel.init(import.meta.env.VITE_MIXPANEL_TOKEN || '', {
  debug: true, // opcional para ver no console
  api_host: 'https://api-eu.mixpanel.com'
});

if (!import.meta.env.VITE_MIXPANEL_TOKEN) {
  console.warn('Mixpanel token is not configured.');
}

export default mixpanel;

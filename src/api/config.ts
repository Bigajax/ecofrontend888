export const API_BASE =
  import.meta.env.MODE === 'production'
    ? 'https://ecobackend888.onrender.com'
    : (import.meta.env.VITE_API_BASE || 'http://localhost:3001');

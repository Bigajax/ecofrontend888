// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

import { ensureGuestId, ensureSessionId } from './lib/guestId';

import { initFacebookPixel } from './lib/fbpixel';
import { syncEcoStorageDomain } from './utils/ecoStorage';

// Garante que guest_id e session_id existam antes de qualquer requisição
syncEcoStorageDomain();
ensureGuestId();
ensureSessionId();

// inicia o Pixel uma única vez
initFacebookPixel();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// ✅ StrictMode permanece; os envios agora são idempotentes e fora do setState.

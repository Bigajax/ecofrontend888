// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

import { ensureGuestId, ensureSessionId } from './lib/guestId';

import { initFacebookPixel } from './lib/fbpixel';
import PixelRouteListener from './lib/PixelRouteListener';
import MixpanelRouteListener from './lib/MixpanelRouteListener';
import RootErrorBoundary from './components/RootErrorBoundary';

// Garante que guest_id e session_id existam antes de qualquer requisição
ensureGuestId();
ensureSessionId();

// inicia o Pixel uma única vez
initFacebookPixel();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <BrowserRouter>
        {/* dispara PageView em cada navegação */}
        <PixelRouteListener />
        <MixpanelRouteListener />
        <App />
      </BrowserRouter>
    </RootErrorBoundary>
  </StrictMode>,
);

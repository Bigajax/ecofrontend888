// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

import { ECO_GUEST_ID } from './lib/guestId';

import { initFacebookPixel } from './lib/fbpixel';
import PixelRouteListener from './lib/PixelRouteListener';
import MixpanelRouteListener from './lib/MixpanelRouteListener';

// Garante que o guestId seja resolvido logo no boot do app
void ECO_GUEST_ID;

// inicia o Pixel uma única vez
initFacebookPixel();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      {/* dispara PageView em cada navegação */}
      <PixelRouteListener />
      <MixpanelRouteListener />
      <App />
    </BrowserRouter>
  </StrictMode>
);

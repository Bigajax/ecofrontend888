// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

import { initFacebookPixel } from './lib/fbpixel';
import PixelRouteListener from './lib/PixelRouteListener';
import MixpanelRouteListener from './lib/MixpanelRouteListener';

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

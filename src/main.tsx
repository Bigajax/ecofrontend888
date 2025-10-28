console.log('============================================');
console.log('[MAIN.TSX] CARREGADO - VERSÃO DEBUG ATIVA');
console.log('============================================');

const OriginalAbortController = window.AbortController;

class DebugAbortController extends OriginalAbortController {
  private _createdAt = new Date().toISOString();
  private _createdStack = new Error().stack;
  
  constructor() {
    super();
    console.log('[AbortController] CRIADO', {
      timestamp: this._createdAt,
      stack: this._createdStack?.split('\n').slice(0, 6).join('\n')
    });
  }
  
  abort(reason?: any) {
    console.error('[AbortController] ⚠️ ABORT CHAMADO', {
      reason: reason ?? 'no reason',
      createdAt: this._createdAt,
      abortedAt: new Date().toISOString(),
      abortStack: new Error().stack?.split('\n').slice(0, 8).join('\n')
    });
    super.abort(reason);
  }
}

(window as any).AbortController = DebugAbortController;
console.log('[DEBUG] Interceptor instalado ✓');

// AGORA SIM os imports normais...

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

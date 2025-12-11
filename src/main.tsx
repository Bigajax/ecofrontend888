console.log('============================================');
console.log('[MAIN.TSX] CARREGADO - VERSÃO DEBUG ATIVA');
console.log('============================================');

const OriginalAbortController = window.AbortController;

const formatAbortReason = (input: unknown): string => {
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed) return trimmed.toLowerCase();
  }
  if (typeof input === 'number' && Number.isFinite(input)) {
    return String(input);
  }
  if (input instanceof DOMException) {
    const domReason = (input as DOMException & { reason?: unknown }).reason;
    if (typeof domReason === 'string' && domReason.trim()) {
      return domReason.trim().toLowerCase();
    }
    if (input.message?.trim()) return input.message.trim().toLowerCase();
    if (input.name?.trim()) return input.name.trim().toLowerCase();
    return 'domexception';
  }
  if (input instanceof Error) {
    if (input.message?.trim()) return input.message.trim().toLowerCase();
    if (input.name?.trim()) return input.name.trim().toLowerCase();
    return 'error';
  }
  if (typeof input === 'object' && input !== null) {
    const nested = (input as { reason?: unknown }).reason;
    if (nested !== undefined) {
      const nestedReason = formatAbortReason(nested);
      if (nestedReason !== 'unknown') return nestedReason;
    }
  }
  return 'unknown';
};

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
    const normalizedReason = formatAbortReason(reason);
    const expectedReasons = new Set([
      'finalize',
      'user_cancelled',
      'watchdog_timeout',
      'visibilitychange',
      'pagehide',
      'hidden',
      'timeout'
    ]);
    const logPayload = {
      reason: reason ?? 'no reason',
      normalizedReason,
      createdAt: this._createdAt,
      abortedAt: new Date().toISOString(),
      abortStack: new Error().stack?.split('\n').slice(0, 8).join('\n')
    };
    const logFn = expectedReasons.has(normalizedReason) ? console.debug : console.error;
    logFn.call(console, '[AbortController] ⚠️ ABORT CHAMADO', logPayload);
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
import './eco-design-system.css';

import { getOrCreateSessionId } from './utils/identity';

import { initFacebookPixel } from './lib/fbpixel';
import { syncEcoStorageDomain } from './utils/ecoStorage';

// Sync storage domain (for cookies/localStorage compatibility)
syncEcoStorageDomain();

// Session ID is still created on bootstrap (per-session identifier)
const sessionId = getOrCreateSessionId();
console.info('[IDENTITY] Session initialized', { sessionId });

// IMPORTANT: Guest ID is NO LONGER created automatically on bootstrap.
// Guest mode is now activated explicitly when user completes the tour
// by clicking "Criar minha nova realidade" button in HomePageTour.tsx
// This ensures guest mode is intentional, not automatic.

// inicia o Pixel uma única vez
initFacebookPixel();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// ✅ StrictMode permanece; os envios agora são idempotentes e fora do setState.

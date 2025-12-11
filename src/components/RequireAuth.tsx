import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface RequireAuthProps {
  children: React.ReactNode;
}

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

const loadingSkeleton = (
  <div className="flex min-h-screen w-full items-center justify-center bg-slate-50">
    <div className="space-y-3 text-center">
      <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-300 border-t-slate-500" />
      <p className="text-sm font-medium text-slate-600">Validando sessão…</p>
    </div>
  </div>
);

/**
 * RequireAuth - Componente de proteção de rotas
 *
 * Garante que:
 * 1. Nunca retorna null (sempre mostra algo)
 * 2. Tem timeout de segurança (máx 20s em loading)
 * 3. Redireciona para login se não autenticado
 * 4. Permite acesso se autenticado ou guest mode
 *
 * Crítico para Safari Mobile que pode descarregar a aba.
 */
const RequireAuth: React.FC<RequireAuthProps> = ({ children }) => {
  const { user, loading, isGuestMode } = useAuth();
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [timedOut, setTimedOut] = useState(false);

  // 🛡️ PROTEÇÃO: Timeout de segurança para evitar loading infinito
  // Se RequireAuth ficar travado em loading, força redirect após 20s
  useEffect(() => {
    if (!loading) {
      setTimedOut(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('[RequireAuth] ⚠️ TIMEOUT DE SEGURANÇA ATIVADO');
      console.error('[RequireAuth] Loading estava travado há 20s');
      console.error('[RequireAuth] Forçando redirect para /login');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      setTimedOut(true);
      setAuthStatus('unauthenticated');
    }, 20000); // 20 segundos máximo

    return () => clearTimeout(timeoutId);
  }, [loading]);

  useEffect(() => {
    // Se timeout disparou, forçar unauthenticated
    if (timedOut) {
      setAuthStatus('unauthenticated');
      return;
    }

    if (loading) {
      setAuthStatus('loading');
      return;
    }

    // Allow access if user is authenticated OR in guest mode
    if (user || isGuestMode) {
      setAuthStatus('authenticated');
    } else {
      setAuthStatus('unauthenticated');
    }
  }, [user, loading, isGuestMode, timedOut]);

  // NUNCA retorna null - sempre mostra algo
  // Show loading skeleton while checking auth
  if (authStatus === 'loading') {
    return loadingSkeleton;
  }

  // Redirect to login if not authenticated and not in guest mode
  if (authStatus === 'unauthenticated') {
    console.info('[RequireAuth] Redirecionando para /login (unauthenticated)');
    return <Navigate to="/login" replace />;
  }

  // User is authenticated or in guest mode - allow access
  return <>{children}</>;
};

export default RequireAuth;

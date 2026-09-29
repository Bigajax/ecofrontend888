import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GUEST_EXPERIENCE_FEATURES } from '@/constants/guestExperience';
import ReinoCarregando from '@/components/reino/ReinoCarregando';

interface RequireAuthProps {
  children: React.ReactNode;
}

type AuthStatus = 'loading' | 'authenticated' | 'guest' | 'unauthenticated';

const loadingSkeleton = (
  <div style={{ pointerEvents: 'none' }}>
    {/* 🛡️ CRÍTICO: Nunca bloquear cliques */}
    <ReinoCarregando texto="Abrindo o portão do reino" />
  </div>
);

/**
 * RequireAuth - Componente de proteção de rotas
 *
 * Garante que:
 * 1. Nunca retorna null (sempre mostra algo)
 * 2. Tem timeout de segurança (máx 60s em loading)
 * 3. Ativa guest mode automaticamente se não logado (novo!)
 * 4. Permite acesso se autenticado ou guest mode
 *
 * Crítico para Safari Mobile que pode descarregar a aba.
 */
const RequireAuth: React.FC<RequireAuthProps> = ({ children }) => {
  const { user, loading, isGuestMode, loginAsGuest } = useAuth();
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [timedOut, setTimedOut] = useState(false);

  // 🛡️ PROTEÇÃO: Timeout de segurança para evitar loading infinito
  // Se RequireAuth ficar travado em loading, apenas para o loading
  // MAS NÃO força logout - permite acesso mesmo com erro
  useEffect(() => {
    if (!loading) {
      setTimedOut(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.warn('[RequireAuth] ⚠️ TIMEOUT DE SEGURANÇA ATIVADO');
      console.warn('[RequireAuth] Loading estava travado há 60s');
      console.warn('[RequireAuth] Parando loading mas PERMITINDO acesso');
      console.warn('[RequireAuth] Timestamp:', new Date().toISOString());
      console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      setTimedOut(true);
      // Permite acesso em vez de forçar unauthenticated
      setAuthStatus('authenticated');
    }, 60000); // 60 segundos máximo

    return () => clearTimeout(timeoutId);
  }, [loading]);

  useEffect(() => {
    // Se timeout disparou, permite acesso (não força logout)
    if (timedOut) {
      setAuthStatus('authenticated');
      return;
    }

    if (loading) {
      setAuthStatus('loading');
      return;
    }

    // Se tem user autenticado, status = authenticated
    if (user) {
      setAuthStatus('authenticated');
      return;
    }

    // Se não tem user, verificar guest mode
    if (isGuestMode) {
      // Já está em guest mode
      setAuthStatus('guest');
    } else {
      // Não está logado nem em guest mode
      // Ativar guest mode automaticamente (se feature habilitada)
      if (GUEST_EXPERIENCE_FEATURES.AUTO_GUEST_MODE) {
        console.info('[RequireAuth] Ativando guest mode automaticamente');
        loginAsGuest();
        setAuthStatus('guest');
      } else {
        // Feature desabilitada, redirecionar para login
        setAuthStatus('unauthenticated');
      }
    }
  }, [user, loading, isGuestMode, timedOut, loginAsGuest]);

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

  // User is authenticated OR in guest mode - allow access
  if (authStatus === 'authenticated' || authStatus === 'guest') {
    return <>{children}</>;
  }

  // Fallback (nunca deve chegar aqui)
  console.warn('[RequireAuth] Estado inesperado, permitindo acesso');
  return <>{children}</>;
};

export default RequireAuth;

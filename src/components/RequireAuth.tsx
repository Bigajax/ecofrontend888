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

const RequireAuth: React.FC<RequireAuthProps> = ({ children }) => {
  const { user, loading, isGuestMode } = useAuth();
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
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
  }, [user, loading, isGuestMode]);

  // Show loading skeleton while checking auth
  if (authStatus === 'loading') {
    return loadingSkeleton;
  }

  // Redirect to login if not authenticated and not in guest mode
  if (authStatus === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  // User is authenticated or in guest mode - allow access
  return <>{children}</>;
};

export default RequireAuth;

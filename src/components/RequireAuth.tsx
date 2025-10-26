import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  disableGuestAutoEntry,
  isGuestAutoEntryEnabled,
} from '../constants/guest';

interface RequireAuthProps {
  children: React.ReactNode;
}

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'guest';

const isGuestChatPath = (pathname: string): boolean => {
  return pathname === '/app' || pathname === '/app/';
};

const loadingSkeleton = (
  <div className="flex min-h-screen w-full items-center justify-center bg-slate-50">
    <div className="space-y-3 text-center">
      <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-300 border-t-slate-500" />
      <p className="text-sm font-medium text-slate-600">Validando sessão…</p>
    </div>
  </div>
);

const RequireAuth: React.FC<RequireAuthProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [guestAllowed, setGuestAllowed] = useState(() => isGuestAutoEntryEnabled());
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    setGuestAllowed(isGuestAutoEntryEnabled());
  }, [location.pathname]);

  useEffect(() => {
    if (loading) {
      setStatus('loading');
    } else if (user) {
      setStatus('authenticated');
    } else if (guestAllowed && isGuestChatPath(location.pathname)) {
      setStatus('guest');
    } else {
      setStatus('unauthenticated');
    }
  }, [guestAllowed, loading, location.pathname, user]);

  useEffect(() => {
    if (!user) return;
    disableGuestAutoEntry();
    setGuestAllowed(false);
  }, [user]);

  const content = useMemo(() => {
    switch (status) {
      case 'loading':
        return loadingSkeleton;
      case 'guest':
      case 'authenticated':
        return <>{children}</>;
      case 'unauthenticated':
        return <Navigate to="/" replace />;
      default:
        return loadingSkeleton;
    }
  }, [children, status]);

  return <>{content}</>;
};

export default RequireAuth;

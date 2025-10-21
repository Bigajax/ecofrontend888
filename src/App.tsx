// src/App.tsx
import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ChatProvider } from './contexts/ChatContext';

const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const ResetSenha = React.lazy(() => import('./pages/ResetSenha'));
const ChatPage = React.lazy(() => import('./pages/ChatPage'));
const CreateProfilePage = React.lazy(() => import('./pages/CreateProfilePage'));
const WelcomePage = React.lazy(() => import('./pages/WelcomePage'));
const VoicePage = React.lazy(() => import('./pages/VoicePage'));

// MEMÓRIAS
const MemoryLayout = React.lazy(() => import('./pages/memory/MemoryLayout'));
const MemoriesSection = React.lazy(() => import('./pages/memory/MemoriesSection'));
const ProfileSection = React.lazy(() => import('./pages/memory/ProfileSection'));
const ReportSection = React.lazy(() => import('./pages/memory/ReportSection'));

import RequireAuth from './components/RequireAuth';
import mixpanel from './lib/mixpanel';
import MainLayout from './layouts/MainLayout';
import { DEFAULT_API_BASE, EFFECTIVE_API_BASE, IS_API_BASE_EMPTY, RAW_API_BASE } from './constants/api';

const lazyFallback = <div>Carregando…</div>;

type HealthStatus = 'idle' | 'ok' | 'error';

const renderWithSuspense = (element: React.ReactElement) => (
  <Suspense fallback={lazyFallback}>{element}</Suspense>
);

/** Wrapper para dar key por usuário ao ChatProvider */
function ChatProviderWithKey({ children }: { children: React.ReactNode }) {
  const { userId } = useAuth();
  return <ChatProvider key={userId || 'anon'}>{children}</ChatProvider>;
}

function PublicShell() {
  return (
    <div className="flex min-h-[100dvh] w-screen flex-col bg-white font-sans">
      <Outlet />
    </div>
  );
}

function PublicHome() {
  const location = useLocation();
  const fromAdsOrTour = useMemo(
    () => /(\bfbclid=|\butm_|tour=1)/.test(location.search),
    [location.search],
  );

  return fromAdsOrTour
    ? renderWithSuspense(<WelcomePage />)
    : renderWithSuspense(<LoginPage />);
}

function AppProtectedShell() {
  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
}

function AppRoutes() {
  useEffect(() => {
    mixpanel.track('App iniciado', { origem: 'App.tsx', data: new Date().toISOString() });
  }, []);

  return (
    <Routes>
      <Route path="/" element={<PublicShell />}>
        <Route index element={<PublicHome />} />
        <Route path="welcome" element={renderWithSuspense(<WelcomePage />)} />
        <Route path="register" element={renderWithSuspense(<CreateProfilePage />)} />
        <Route path="reset-senha" element={renderWithSuspense(<ResetSenha />)} />
        <Route path="login" element={<Navigate to="/" replace />} />
        <Route path="login/tour" element={<Navigate to="/?tour=1" replace />} />
      </Route>
      <Route
        path="/app/*"
        element={
          <RequireAuth>
            <AppProtectedShell />
          </RequireAuth>
        }
      >
        <Route index element={renderWithSuspense(<ChatPage />)} />
        <Route path="chat" element={<Navigate to="/app" replace />} />
        <Route path="voice" element={renderWithSuspense(<VoicePage />)} />
        <Route path="memory" element={renderWithSuspense(<MemoryLayout />)}>
          <Route index element={renderWithSuspense(<MemoriesSection />)} />
          <Route path="profile" element={renderWithSuspense(<ProfileSection />)} />
          <Route path="report" element={renderWithSuspense(<ReportSection />)} />
          <Route path="*" element={<Navigate to="/app/memory" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppChrome() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>('idle');
  const [hasCapturedError, setHasCapturedError] = useState(false);
  const rawApiBaseDisplay =
    typeof RAW_API_BASE === 'string'
      ? RAW_API_BASE.trim().length === 0
        ? '""'
        : RAW_API_BASE
      : 'indefinido';

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const checkHealth = async () => {
      try {
        const response = await fetch(`${EFFECTIVE_API_BASE}/api/health`, {
          credentials: 'include',
          signal: controller.signal,
        });
        if (!active) return;
        setHealthStatus(response.ok ? 'ok' : 'error');
      } catch (error) {
        if (!active) return;
        if ((error as Error)?.name !== 'AbortError') {
          console.warn('[App] Falha ao verificar saúde do backend', error);
        }
        setHealthStatus('error');
      }
    };

    checkHealth();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const previousOnError = window.onerror;
    const previousOnUnhandledRejection = window.onunhandledrejection;

    const handleWindowError: OnErrorEventHandler = function (message, source, lineno, colno, error) {
      console.error('[App] window.onerror capturado', { message, source, lineno, colno, error });
      setHasCapturedError(true);
      if (typeof previousOnError === 'function') {
        return previousOnError.call(window, message, source, lineno, colno, error);
      }
      return false;
    };

    const handleUnhandledRejection = function (event: PromiseRejectionEvent) {
      console.error('[App] window.onunhandledrejection capturado', event.reason, event);
      setHasCapturedError(true);
      if (typeof previousOnUnhandledRejection === 'function') {
        return previousOnUnhandledRejection.call(window, event);
      }
      return undefined;
    };

    window.onerror = handleWindowError;
    window.onunhandledrejection = handleUnhandledRejection;

    return () => {
      window.onerror = previousOnError ?? null;
      window.onunhandledrejection = previousOnUnhandledRejection ?? null;
    };
  }, []);

  const showHealthBanner = healthStatus === 'error';
  const showApiBaseWarning = IS_API_BASE_EMPTY;
  const showErrorChip = hasCapturedError;

  const handleErrorChipClick = () => {
    console.info('Abra o console do navegador (F12) para inspecionar o erro capturado.');
    setHasCapturedError(false);
  };

  return (
    <div className="relative min-h-[100dvh] w-screen bg-white">
      {showHealthBanner && (
        <div className="fixed inset-x-0 top-0 z-50 bg-rose-600 px-4 py-2 text-center text-sm font-semibold text-white shadow">
          Sem conexão com o servidor
        </div>
      )}

      {showApiBaseWarning && (
        <div className="fixed bottom-4 left-4 z-40 max-w-sm rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 shadow">
          <p className="font-semibold">API_BASE não configurado</p>
          <p className="mt-1 text-xs leading-relaxed">
            Valor configurado: {rawApiBaseDisplay}. Usando padrão {DEFAULT_API_BASE}.
          </p>
          <p className="mt-1 text-xs leading-relaxed">Endpoint ativo: {EFFECTIVE_API_BASE}</p>
        </div>
      )}

      {showErrorChip && (
        <button
          type="button"
          onClick={handleErrorChipClick}
          className="fixed bottom-4 right-4 z-50 rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-lg hover:bg-amber-600"
        >
          Erro capturado
        </button>
      )}

      <div className={showHealthBanner ? 'pt-12' : ''}>
        <AppRoutes />
      </div>
    </div>
  );
}

function AppChrome() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>('idle');
  const [hasCapturedError, setHasCapturedError] = useState(false);
  const rawApiBaseDisplay =
    typeof RAW_API_BASE === 'string'
      ? RAW_API_BASE.trim().length === 0
        ? '""'
        : RAW_API_BASE
      : 'indefinido';

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const checkHealth = async () => {
      try {
        const response = await fetch(`${EFFECTIVE_API_BASE}/api/health`, {
          credentials: 'include',
          signal: controller.signal,
        });
        if (!active) return;
        setHealthStatus(response.ok ? 'ok' : 'error');
      } catch (error) {
        if (!active) return;
        if ((error as Error)?.name !== 'AbortError') {
          console.warn('[App] Falha ao verificar saúde do backend', error);
        }
        setHealthStatus('error');
      }
    };

    checkHealth();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const previousOnError = window.onerror;
    const previousOnUnhandledRejection = window.onunhandledrejection;

    const handleWindowError: OnErrorEventHandler = function (message, source, lineno, colno, error) {
      console.error('[App] window.onerror capturado', { message, source, lineno, colno, error });
      setHasCapturedError(true);
      if (typeof previousOnError === 'function') {
        return previousOnError.call(window, message, source, lineno, colno, error);
      }
      return false;
    };

    const handleUnhandledRejection = function (event: PromiseRejectionEvent) {
      console.error('[App] window.onunhandledrejection capturado', event.reason, event);
      setHasCapturedError(true);
      if (typeof previousOnUnhandledRejection === 'function') {
        return previousOnUnhandledRejection.call(window, event);
      }
      return undefined;
    };

    window.onerror = handleWindowError;
    window.onunhandledrejection = handleUnhandledRejection;

    return () => {
      window.onerror = previousOnError ?? null;
      window.onunhandledrejection = previousOnUnhandledRejection ?? null;
    };
  }, []);

  const showHealthBanner = healthStatus === 'error';
  const showApiBaseWarning = IS_API_BASE_EMPTY;
  const showErrorChip = hasCapturedError;

  const handleErrorChipClick = () => {
    console.info('Abra o console do navegador (F12) para inspecionar o erro capturado.');
    setHasCapturedError(false);
  };

  return (
    <div className="relative min-h-[100dvh] w-screen bg-white">
      {showHealthBanner && (
        <div className="fixed inset-x-0 top-0 z-50 bg-rose-600 px-4 py-2 text-center text-sm font-semibold text-white shadow">
          Sem conexão com o servidor
        </div>
      )}

      {showApiBaseWarning && (
        <div className="fixed bottom-4 left-4 z-40 max-w-sm rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 shadow">
          <p className="font-semibold">API_BASE não configurado</p>
          <p className="mt-1 text-xs leading-relaxed">
            Valor configurado: {rawApiBaseDisplay}. Usando padrão {DEFAULT_API_BASE}.
          </p>
          <p className="mt-1 text-xs leading-relaxed">Endpoint ativo: {EFFECTIVE_API_BASE}</p>
        </div>
      )}

      {showErrorChip && (
        <button
          type="button"
          onClick={handleErrorChipClick}
          className="fixed bottom-4 right-4 z-50 rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-lg hover:bg-amber-600"
        >
          Erro capturado
        </button>
      )}

      <div className={showHealthBanner ? 'pt-12' : ''}>
        <AppRoutes />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ChatProviderWithKey>
        <AppChrome />
      </ChatProviderWithKey>
    </AuthProvider>
  );
}

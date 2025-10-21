// src/App.tsx
import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
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
import { DEFAULT_API_BASE, IS_API_BASE_EMPTY, RAW_API_BASE, getApiBase } from './constants/api';
import RootErrorBoundary from './components/RootErrorBoundary';
import HealthBanner from './components/HealthBanner';
import ApiBaseWarningCard from './components/ApiBaseWarningCard';
import GlobalErrorChip from './components/GlobalErrorChip';
import { HealthCheckResult, HealthStatus, pingWithRetry } from './utils/health';

const lazyFallback = <div>Carregando…</div>;

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
  const healthMetaRef = useRef<Pick<HealthCheckResult, 'aborted' | 'responseOk'>>({
    aborted: false,
    responseOk: true,
  });
  const rawEnvApiBase = RAW_API_BASE;
  const rawApiBaseDisplay =
    typeof rawEnvApiBase === 'string'
      ? rawEnvApiBase.length === 0
        ? '""'
        : rawEnvApiBase
      : 'indefinido';
  const effectiveApiBase = getApiBase();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    let alive = true;
    const BASE_DELAY = 20_000;
    const STEP = 20_000;
    const MAX_DELAY = 120_000;
    let nextDelay = BASE_DELAY;
    let timeoutId: number | null = null;

    const runCheck = async () => {
      const delayForThisCycle = nextDelay;
      let result: HealthCheckResult;
      try {
        result = await pingWithRetry();
      } catch (error) {
        console.error('[App] Falha na verificação de saúde', error);
        if (!alive) return;
        result = { status: 'down', aborted: false, responseOk: false };
      }
      if (!alive) return;
      healthMetaRef.current = { aborted: result.aborted, responseOk: result.responseOk };
      setHealthStatus(result.status);

      if (result.status === 'ok') {
        nextDelay = BASE_DELAY;
      } else {
        nextDelay = Math.min(delayForThisCycle + STEP, MAX_DELAY);
      }

      if (!alive) return;
      const delay = result.status === 'ok' ? BASE_DELAY : delayForThisCycle;
      timeoutId = window.setTimeout(runCheck, delay);
    };

    runCheck();

    return () => {
      alive = false;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
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

  const showHealthBanner =
    (healthStatus === 'degraded' || healthStatus === 'down') &&
    !(healthStatus === 'down' && healthMetaRef.current.aborted);
  const showApiBaseWarning = IS_API_BASE_EMPTY;
  const showErrorChip = hasCapturedError;

  const handleErrorChipClick = () => {
    console.info('Abra o console do navegador (F12) para inspecionar o erro capturado.');
    setHasCapturedError(false);
  };

  return (
    <AuthProvider>
      <ChatProviderWithKey>
        <div className="relative min-h-[100dvh] w-screen bg-white">
          <HealthBanner status={healthStatus} visible={showHealthBanner} />

          <ApiBaseWarningCard
            visible={showApiBaseWarning}
            rawApiBaseDisplay={rawApiBaseDisplay}
            defaultApiBase={DEFAULT_API_BASE}
            effectiveApiBase={effectiveApiBase}
          />

          <GlobalErrorChip visible={showErrorChip} onClick={handleErrorChipClick} />

          <div className={showHealthBanner ? 'pt-12' : ''}>
            <AppRoutes />
          </div>
        </div>
      </ChatProviderWithKey>
    </AuthProvider>
  );
}

export default function App() {
  return (
    <RootErrorBoundary>
      <Suspense fallback="Carregando…">
        <AppChrome />
      </Suspense>
    </RootErrorBoundary>
  );
}

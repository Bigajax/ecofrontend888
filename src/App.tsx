import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from "react";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import { RootProviders } from "@/providers/RootProviders";
import RequireAuth from "@/components/RequireAuth";
import RootErrorBoundary from "@/components/RootErrorBoundary";
import HealthBanner from "@/components/HealthBanner";
import ApiBaseWarningCard from "@/components/ApiBaseWarningCard";
import GlobalErrorChip from "@/components/GlobalErrorChip";
import MainLayout from "@/layouts/MainLayout";
import PixelRouteListener from "@/lib/PixelRouteListener";
import MixpanelRouteListener from "@/lib/MixpanelRouteListener";
import mixpanel from "@/lib/mixpanel";
import { DEFAULT_API_BASE, RAW_API_BASE } from "@/constants/api";
import { getApiBase } from "@/config/apiBase";
import { HealthCheckResult, HealthStatus, pingWithRetry } from "@/utils/health";

const LoginPage = lazy(() => import("@/pages/LoginPage"));
const ResetSenha = lazy(() => import("@/pages/ResetSenha"));
const HomePage = lazy(() => import("@/pages/HomePage"));
const ChatPage = lazy(() => import("@/pages/ChatPage"));
const CreateProfilePage = lazy(() => import("@/pages/CreateProfilePage"));
const WelcomePage = lazy(() => import("@/pages/WelcomePage"));
const VoicePage = lazy(() => import("@/pages/VoicePage"));

const MemoryLayout = lazy(() => import("@/pages/memory/MemoryLayout"));
const MemoriesSection = lazy(() => import("@/pages/memory/MemoriesSection"));
const ProfileSection = lazy(() => import("@/pages/memory/ProfileSection"));
const ReportSection = lazy(() => import("@/pages/memory/ReportSection"));

const FiveRingsHub = lazy(() => import("@/pages/rings/FiveRingsHub"));
const DailyRitual = lazy(() => import("@/pages/rings/DailyRitual"));
const Timeline = lazy(() => import("@/pages/rings/Timeline"));
const Progress = lazy(() => import("@/pages/rings/Progress"));
const RingDetail = lazy(() => import("@/pages/rings/RingDetail"));
const RiquezaMentalProgram = lazy(() => import("@/pages/programs/RiquezaMentalProgram"));
const SleepArticle = lazy(() => import("@/pages/articles/SleepArticle"));
const GoodNightSleepArticle = lazy(() => import("@/pages/articles/GoodNightSleepArticle"));
const DiarioEstoicoPage = lazy(() => import("@/pages/diario-estoico/DiarioEstoicoPage"));
const EnergyBlessingsPage = lazy(() => import("@/pages/energy-blessings/EnergyBlessingsPage"));
const MeditationPlayerPage = lazy(() => import("@/pages/energy-blessings/MeditationPlayerPage"));

// Lightweight loading fallback (no heavy dependencies)
function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500" />
        <p className="text-sm text-gray-500">Carregando...</p>
      </div>
    </div>
  );
}

const lazyFallback = <LoadingFallback />;

function renderWithSuspense(element: ReactElement) {
  return <Suspense fallback={lazyFallback}>{element}</Suspense>;
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

function AppProtectedShellNoLayout() {
  return <Outlet />;
}

function AppRoutes() {
  useEffect(() => {
    mixpanel.track("App iniciado", { origem: "App.tsx", data: new Date().toISOString() });
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
        <Route index element={renderWithSuspense(<HomePage />)} />
        <Route path="chat" element={renderWithSuspense(<ChatPage />)} />
        <Route path="voice" element={renderWithSuspense(<VoicePage />)} />
        <Route path="memory" element={renderWithSuspense(<MemoryLayout />)}>
          <Route index element={renderWithSuspense(<MemoriesSection />)} />
          <Route path="profile" element={renderWithSuspense(<ProfileSection />)} />
          <Route path="report" element={renderWithSuspense(<ReportSection />)} />
          <Route path="*" element={<Navigate to="/app/memory" replace />} />
        </Route>
        <Route path="rings" element={renderWithSuspense(<FiveRingsHub />)} />
        <Route path="rings/ritual" element={renderWithSuspense(<DailyRitual />)} />
        <Route path="rings/timeline" element={renderWithSuspense(<Timeline />)} />
        <Route path="rings/progress" element={renderWithSuspense(<Progress />)} />
        <Route path="rings/detail/:ringId" element={renderWithSuspense(<RingDetail />)} />
        <Route path="riqueza-mental" element={renderWithSuspense(<RiquezaMentalProgram />)} />
        <Route path="articles/sleep" element={renderWithSuspense(<SleepArticle />)} />
        <Route path="articles/good-night-sleep" element={renderWithSuspense(<GoodNightSleepArticle />)} />
        <Route path="diario-estoico" element={renderWithSuspense(<DiarioEstoicoPage />)} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Route>
      <Route
        path="/app/energy-blessings"
        element={
          <RequireAuth>
            <AppProtectedShellNoLayout />
          </RequireAuth>
        }
      >
        <Route index element={renderWithSuspense(<EnergyBlessingsPage />)} />
      </Route>
      <Route
        path="/app/meditation-player"
        element={
          <RequireAuth>
            <AppProtectedShellNoLayout />
          </RequireAuth>
        }
      >
        <Route index element={renderWithSuspense(<MeditationPlayerPage />)} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppChrome() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>("idle");
  const [hasCapturedError, setHasCapturedError] = useState(false);
  const healthMetaRef = useRef<{
    aborted: boolean;
    responseOk: boolean;
    consecutiveFailures: number;
  }>({
    aborted: false,
    responseOk: true,
    consecutiveFailures: 0,
  });
  const healthControllerRef = useRef<AbortController | null>(null);
  const consecutiveFailureRef = useRef(0);
  const rawEnvApiBase = RAW_API_BASE;
  const rawApiBaseDisplay =
    typeof rawEnvApiBase === "string"
      ? rawEnvApiBase.trim().length > 0
        ? rawEnvApiBase
        : "não definido (string vazia)"
      : "indefinido";
  const effectiveApiBase = getApiBase();
  const defaultApiBaseDisplay =
    DEFAULT_API_BASE && DEFAULT_API_BASE.trim().length > 0
      ? DEFAULT_API_BASE
      : "mesmo host (/)";

  useEffect(() => {
    if (typeof window === "undefined") {
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
      const controller = new AbortController();
      healthControllerRef.current = controller;
      try {
        result = await pingWithRetry(2, 800, controller.signal);
      } catch (error) {
        console.error("[App] Falha na verificação de saúde", error);
        if (!alive) return;
        result = { status: "down", aborted: false, responseOk: false };
      }
      if (healthControllerRef.current === controller) {
        healthControllerRef.current = null;
      }
      if (!alive) return;
      if (result.status === "ok") {
        consecutiveFailureRef.current = 0;
      } else if (!result.aborted && result.status === "down") {
        consecutiveFailureRef.current += 1;
      } else if (!result.aborted) {
        consecutiveFailureRef.current = 0;
      }
      healthMetaRef.current = {
        aborted: result.aborted,
        responseOk: result.responseOk,
        consecutiveFailures: consecutiveFailureRef.current,
      };
      setHealthStatus(result.status);

      if (result.status === "ok") {
        nextDelay = BASE_DELAY;
      } else {
        nextDelay = Math.min(delayForThisCycle + STEP, MAX_DELAY);
      }

      if (!alive) return;
      const delay = result.status === "ok" ? BASE_DELAY : delayForThisCycle;
      timeoutId = window.setTimeout(runCheck, delay);
    };

    runCheck();

    return () => {
      alive = false;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      const controller = healthControllerRef.current;
      if (controller) {
        try {
          controller.abort();
        } catch {
          /* noop */
        }
        healthControllerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleWindowError = (event: ErrorEvent) => {
      console.error("[App] window error capturado", {
        message: event.message,
        source: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      });
      setHasCapturedError(true);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      event.preventDefault?.();
      // Suppress AbortError rejections - they're benign and expected during normal stream cancellation
      const isAbortError =
        event.reason?.name === 'AbortError' ||
        event.reason?.message?.includes('aborted') ||
        (event.reason instanceof DOMException && event.reason.name === 'AbortError');

      if (isAbortError) {
        try {
          console.debug("[App] benign_abort_rejection_suppressed", event.reason);
        } catch {}
        return;
      }

      console.debug("[App] onunhandledrejection", event.reason);
      console.error("[App] window.unhandledrejection capturado", event.reason, event);
      setHasCapturedError(true);
    };

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  const showHealthBanner =
    (healthStatus === "degraded" && !healthMetaRef.current.aborted) ||
    (healthStatus === "down" &&
      !healthMetaRef.current.aborted &&
      healthMetaRef.current.consecutiveFailures >= 3);
  const showErrorChip = hasCapturedError;

  const handleErrorChipClick = () => {
    console.info("Abra o console do navegador (F12) para inspecionar o erro capturado.");
    setHasCapturedError(false);
  };

  return (
    <div className="relative min-h-[100dvh] w-screen bg-white">
      <HealthBanner status={healthStatus} visible={showHealthBanner} />

      <ApiBaseWarningCard
        rawApiBaseDisplay={rawApiBaseDisplay}
        defaultApiBase={defaultApiBaseDisplay}
        effectiveApiBase={effectiveApiBase}
      />

      <GlobalErrorChip visible={showErrorChip} onClick={handleErrorChipClick} />

      <div className={showHealthBanner ? "pt-12" : ""}>
        <AppRoutes />
      </div>
    </div>
  );
}

export default function App(): JSX.Element {
  return (
    <RootProviders>
      <BrowserRouter basename="/">
        <PixelRouteListener />
        <MixpanelRouteListener />
        <RootErrorBoundary>
          <Suspense fallback="Carregando…">
            <AppChrome />
          </Suspense>
        </RootErrorBoundary>
      </BrowserRouter>
    </RootProviders>
  );
}

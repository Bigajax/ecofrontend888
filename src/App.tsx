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
  useNavigate,
} from "react-router-dom";

import { RootProviders } from "@/providers/RootProviders";
import RequireAuth from "@/components/RequireAuth";
import RootErrorBoundary from "@/components/RootErrorBoundary";
import HealthBanner from "@/components/HealthBanner";
import ApiBaseWarningCard from "@/components/ApiBaseWarningCard";
import GlobalErrorChip from "@/components/GlobalErrorChip";
import GuestSignupModal from "@/components/GuestSignupModal";
import MainLayout from "@/layouts/MainLayout";
import PixelRouteListener from "@/lib/PixelRouteListener";
import MixpanelRouteListener from "@/lib/MixpanelRouteListener";
import { GuestExperienceTracker } from "@/lib/GuestExperienceTracker";
import mixpanel from "@/lib/mixpanel";
import { DEFAULT_API_BASE, RAW_API_BASE } from "@/constants/api";
import { getApiBase } from "@/config/apiBase";
import { HealthCheckResult, HealthStatus, pingWithRetry } from "@/utils/health";
import { useAuth } from "@/contexts/AuthContext";
import { useGuestExperience } from "@/contexts/GuestExperienceContext";
import { GUEST_EXPERIENCE_CONFIG } from "@/constants/guestExperience";

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
const ConversionDashboard = lazy(() => import("@/pages/admin/ConversionDashboard"));

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
const DrJoeDispenzaPage = lazy(() => import("@/pages/DrJoeDispenzaPage"));
const IntroducaoMeditacaoPage = lazy(() => import("@/pages/IntroducaoMeditacaoPage"));
const MeditacoesSonoPage = lazy(() => import("@/pages/MeditacoesSonoPage"));
const ProgramasPage = lazy(() => import("@/pages/ProgramasPage"));
const CaleidoscopioMindMovieProgramPage = lazy(() => import("@/pages/CaleidoscopioMindMovieProgramPage"));
const ManifestacaoSaudePage = lazy(() => import("@/pages/ManifestacaoSaudePage"));
const ManifestacaoDinheiroPage = lazy(() => import("@/pages/ManifestacaoDinheiroPage"));
const SonsPage = lazy(() => import("@/pages/SonsPage"));
const SoundPlayerPage = lazy(() => import("@/pages/SoundPlayerPage"));
const ConfiguracoesPage = lazy(() => import("@/pages/ConfiguracoesPage"));
const SubscriptionCallbackPage = lazy(() => import("@/pages/SubscriptionCallbackPage"));
const FluxoAssinaturaDemo = lazy(() => import("@/pages/FluxoAssinaturaDemo"));
const GuestMeditationPage = lazy(() => import("@/pages/GuestMeditationPage"));
const MemoryPageGuestTeaser = lazy(() => import("@/pages/memory/MemoryPageGuestTeaser"));
const UpgradeModalTest = lazy(() => import("@/pages/UpgradeModalTest"));

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
  // Homepage pública sempre mostra HomePage
  return renderWithSuspense(<HomePage />);
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
        <Route path="login" element={renderWithSuspense(<LoginPage />)} />
        <Route path="login/tour" element={<Navigate to="/login?tour=1" replace />} />
        <Route path="diario-estoico" element={renderWithSuspense(<DiarioEstoicoPage />)} />
        <Route path="meditacao-primeiros-passos" element={renderWithSuspense(<IntroducaoMeditacaoPage />)} />
        <Route path="meditacao/sintonize-novos-potenciais" element={renderWithSuspense(<GuestMeditationPage />)} />
        <Route path="guest/meditation-player" element={renderWithSuspense(<MeditationPlayerPage />)} />
        <Route path="memory-preview" element={renderWithSuspense(<MemoryPageGuestTeaser />)} />
        <Route path="test-upgrade-modal" element={renderWithSuspense(<UpgradeModalTest />)} />
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
        <Route path="home" element={renderWithSuspense(<HomePage />)} />
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
        <Route path="programas" element={renderWithSuspense(<ProgramasPage />)} />
        <Route path="sons" element={renderWithSuspense(<SonsPage />)} />
        <Route path="configuracoes" element={renderWithSuspense(<ConfiguracoesPage />)} />
        <Route path="admin/conversion" element={renderWithSuspense(<ConversionDashboard />)} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Route>
      <Route
        path="/app/dr-joe-dispenza"
        element={
          <RequireAuth>
            <AppProtectedShellNoLayout />
          </RequireAuth>
        }
      >
        <Route index element={renderWithSuspense(<DrJoeDispenzaPage />)} />
      </Route>
      <Route
        path="/app/introducao-meditacao"
        element={
          <RequireAuth>
            <AppProtectedShellNoLayout />
          </RequireAuth>
        }
      >
        <Route index element={renderWithSuspense(<IntroducaoMeditacaoPage />)} />
      </Route>
      <Route
        path="/app/meditacoes-sono"
        element={
          <RequireAuth>
            <AppProtectedShellNoLayout />
          </RequireAuth>
        }
      >
        <Route index element={renderWithSuspense(<MeditacoesSonoPage />)} />
      </Route>
      <Route
        path="/app/programas/caleidoscopio-mind-movie"
        element={
          <RequireAuth>
            <AppProtectedShellNoLayout />
          </RequireAuth>
        }
      >
        <Route index element={renderWithSuspense(<CaleidoscopioMindMovieProgramPage />)} />
      </Route>
      <Route
        path="/app/programas/caleidoscopio-mind-movie/manifestacao-saude"
        element={
          <RequireAuth>
            <AppProtectedShellNoLayout />
          </RequireAuth>
        }
      >
        <Route index element={renderWithSuspense(<ManifestacaoSaudePage />)} />
      </Route>
      <Route
        path="/app/programas/caleidoscopio-mind-movie/manifestacao-dinheiro"
        element={
          <RequireAuth>
            <AppProtectedShellNoLayout />
          </RequireAuth>
        }
      >
        <Route index element={renderWithSuspense(<ManifestacaoDinheiroPage />)} />
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
      <Route
        path="/app/sound-player"
        element={
          <RequireAuth>
            <AppProtectedShellNoLayout />
          </RequireAuth>
        }
      >
        <Route index element={renderWithSuspense(<SoundPlayerPage />)} />
      </Route>
      <Route
        path="/app/subscription/callback"
        element={
          <RequireAuth>
            <AppProtectedShellNoLayout />
          </RequireAuth>
        }
      >
        <Route index element={renderWithSuspense(<SubscriptionCallbackPage />)} />
      </Route>
      <Route
        path="/app/subscription/demo"
        element={
          <RequireAuth>
            <AppProtectedShellNoLayout />
          </RequireAuth>
        }
      >
        <Route index element={renderWithSuspense(<FluxoAssinaturaDemo />)} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppChrome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { shouldShowModal, markModalShown, dismissModal, state } = useGuestExperience();

  const [healthStatus, setHealthStatus] = useState<HealthStatus>("idle");
  const [hasCapturedError, setHasCapturedError] = useState(false);
  const [guestModalOpen, setGuestModalOpen] = useState(false);

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

  // Guest Experience Modal - Verificar periodicamente se deve mostrar
  useEffect(() => {
    if (user) return; // Só para guests

    const interval = setInterval(() => {
      if (shouldShowModal()) {
        setGuestModalOpen(true);
        markModalShown();

        // Analytics
        mixpanel.track('Guest Signup Modal Shown', {
          trigger: state.totalTimeMs >= state.timeLimitMs ? 'time' : 'interactions',
          time_spent_ms: state.totalTimeMs,
          time_spent_minutes: Math.floor(state.totalTimeMs / 60000),
          interaction_count: state.interactionCount,
          page_views: state.pageViews,
          unique_pages_visited: state.visitedPages.size,
          guest_id: state.guestId,
        });
      }
    }, GUEST_EXPERIENCE_CONFIG.MODAL_CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [user, shouldShowModal, markModalShown, state]);

  // Handlers do modal
  const handleGuestSignup = () => {
    mixpanel.track('Guest Signup Modal - Signup Clicked', {
      time_spent_ms: state.totalTimeMs,
      time_spent_minutes: Math.floor(state.totalTimeMs / 60000),
      interaction_count: state.interactionCount,
      page_views: state.pageViews,
      guest_id: state.guestId,
    });

    setGuestModalOpen(false);
    navigate('/register', { state: { from: 'guest-experience' } });
  };

  const handleGuestContinue = () => {
    mixpanel.track('Guest Signup Modal - Continued', {
      time_spent_ms: state.totalTimeMs,
      time_spent_minutes: Math.floor(state.totalTimeMs / 60000),
      interaction_count: state.interactionCount,
      guest_id: state.guestId,
    });

    setGuestModalOpen(false);
    dismissModal();
  };

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
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error("[App] 🚨 WINDOW ERROR CAPTURADO");
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error("[App] Mensagem:", event.message);
      console.error("[App] Arquivo:", event.filename);
      console.error("[App] Linha:Coluna:", `${event.lineno}:${event.colno}`);
      console.error("[App] Erro:", event.error);
      console.error("[App] Timestamp:", new Date().toISOString());
      console.error("[App] User Agent:", navigator.userAgent);
      console.error("[App] URL:", window.location.href);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      setHasCapturedError(true);

      // Se erro crítico (não pode continuar), considerar reload automático
      const isCriticalError =
        event.message?.includes('ChunkLoadError') ||
        event.message?.includes('Failed to fetch') ||
        event.message?.includes('Loading chunk');

      if (isCriticalError) {
        console.error("[App] ⚠️ Erro crítico detectado. Sugerindo reload ao usuário.");
        // O ErrorChip vai aparecer e o usuário pode decidir
      }
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

      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error("[App] 🚨 UNHANDLED PROMISE REJECTION");
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error("[App] Reason:", event.reason);
      console.error("[App] Promise:", event.promise);
      console.error("[App] Timestamp:", new Date().toISOString());
      console.error("[App] User Agent:", navigator.userAgent);
      console.error("[App] URL:", window.location.href);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      setHasCapturedError(true);
    };

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    // 🛡️ PROTEÇÃO SAFARI: Detectar quando a aba volta de inatividade
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.info('[App] 👁️ TAB VOLTOU A ESTAR VISÍVEL');
        console.info('[App] Safari pode ter descarregado recursos');
        console.info('[App] Timestamp:', new Date().toISOString());
        console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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

      <GuestSignupModal
        open={guestModalOpen}
        onClose={handleGuestContinue}
        onSignup={handleGuestSignup}
        trigger={state.totalTimeMs >= state.timeLimitMs ? 'time' : 'interactions'}
        stats={{
          timeSpentMinutes: Math.floor(state.totalTimeMs / 60000),
          interactionCount: state.interactionCount,
          pagesVisited: state.pageViews,
        }}
      />

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
        <GuestExperienceTracker />
        <RootErrorBoundary>
          <Suspense fallback="Carregando…">
            <AppChrome />
          </Suspense>
        </RootErrorBoundary>
      </BrowserRouter>
    </RootProviders>
  );
}

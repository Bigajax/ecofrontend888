import {
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

import { lazyWithReload } from "@/utils/lazyWithReload";
import { RootProviders } from "@/providers/RootProviders";
import RequireAuth from "@/components/RequireAuth";
import RootErrorBoundary from "@/components/RootErrorBoundary";
import ScrollToTop from "@/components/ScrollToTop";
import PageErrorBoundary from "@/components/PageErrorBoundary";
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

const LoginPage = lazyWithReload(() => import("@/pages/LoginPage"));
const ResetSenha = lazyWithReload(() => import("@/pages/ResetSenha"));
const HomePage = lazyWithReload(() => import("@/pages/HomePage"));
const ChatPage = lazyWithReload(() => import("@/pages/ChatPage"));
const CreateProfilePage = lazyWithReload(() => import("@/pages/CreateProfilePage"));
const WelcomePage = lazyWithReload(() => import("@/pages/WelcomePage"));
const VoicePage = lazyWithReload(() => import("@/pages/VoicePage"));
const MemoryLayout = lazyWithReload(() => import("@/pages/memory/MemoryLayout"));
const MemoriesSection = lazyWithReload(() => import("@/pages/memory/MemoriesSection"));
const ProfileSection = lazyWithReload(() => import("@/pages/memory/ProfileSection"));
const ReportSection = lazyWithReload(() => import("@/pages/memory/ReportSection"));
const ConversionDashboard = lazyWithReload(() => import("@/pages/admin/ConversionDashboard"));

const FiveRingsHub = lazyWithReload(() => import("@/pages/rings/FiveRingsHub"));
const DailyRitual = lazyWithReload(() => import("@/pages/rings/DailyRitual"));
const Timeline = lazyWithReload(() => import("@/pages/rings/Timeline"));
const Progress = lazyWithReload(() => import("@/pages/rings/Progress"));
const RingDetail = lazyWithReload(() => import("@/pages/rings/RingDetail"));
const RiquezaMentalProgram = lazyWithReload(() => import("@/pages/programs/RiquezaMentalProgram"));
const SleepArticle = lazyWithReload(() => import("@/pages/articles/SleepArticle"));
const GoodNightSleepArticle = lazyWithReload(() => import("@/pages/articles/GoodNightSleepArticle"));
const DiarioEstoicoPage = lazyWithReload(() => import("@/pages/diario-estoico/DiarioEstoicoPage"));
const EnergyBlessingsPage = lazyWithReload(() => import("@/pages/energy-blessings/EnergyBlessingsPage"));
const MeditationPlayerPage = lazyWithReload(() => import("@/pages/energy-blessings/MeditationPlayerPage"));
const DrJoeDispenzaPage = lazyWithReload(() => import("@/pages/DrJoeDispenzaPage"));
const MinigamePotencialPage = lazyWithReload(() => import("@/pages/MinigamePotencialPage"));
const RecondicioneCorpoMentePage = lazyWithReload(() => import("@/pages/RecondicioneCorpoMentePage"));
const IntroPotencialPage = lazyWithReload(() => import("@/pages/guest/IntroPotencialPage"));
const DrJoePreviewPage = lazyWithReload(() => import("@/pages/guest/DrJoePreviewPage"));
const RecondicioneAntesDeComecarPage = lazyWithReload(() => import("@/pages/RecondicioneAntesDeComecarPage"));
const IntroducaoMeditacaoPage = lazyWithReload(() => import("@/pages/IntroducaoMeditacaoPage"));
const SleepMeditationsPage = lazyWithReload(() => import("@/pages/sleep/SleepMeditationsPage"));
const SleepGuestExperiencePage = lazyWithReload(() => import("@/pages/sleep/SleepGuestExperiencePage"));
const CodigoDaAbundanciaPage = lazyWithReload(() => import("@/pages/CodigoDaAbundanciaPage"));
const ProgramasPage = lazyWithReload(() => import("@/pages/ProgramasPage"));
const CaleidoscopioMindMovieProgramPage = lazyWithReload(() => import("@/pages/CaleidoscopioMindMovieProgramPage"));
const ManifestacaoSaudePage = lazyWithReload(() => import("@/pages/ManifestacaoSaudePage"));
const ManifestacaoDinheiroPage = lazyWithReload(() => import("@/pages/ManifestacaoDinheiroPage"));
const SonsPage = lazyWithReload(() => import("@/pages/SonsPage"));
const SoundPlayerPage = lazyWithReload(() => import("@/pages/SoundPlayerPage"));
const ConfiguracoesPage = lazyWithReload(() => import("@/pages/ConfiguracoesPage"));
const SubscriptionCallbackPage = lazyWithReload(() => import("@/pages/SubscriptionCallbackPage"));
const CancelarAssinaturaPage = lazyWithReload(() => import("@/pages/CancelarAssinaturaPage"));
const FluxoAssinaturaDemo = lazyWithReload(() => import("@/pages/FluxoAssinaturaDemo"));
const GuestMeditationPage = lazyWithReload(() => import("@/pages/GuestMeditationPage"));
const MemoryPageGuestTeaser = lazyWithReload(() => import("@/pages/memory/MemoryPageGuestTeaser"));
const UpgradeModalTest = lazyWithReload(() => import("@/pages/UpgradeModalTest"));
const EcotopiaLandingPage = lazyWithReload(() => import("@/pages/EcotopiaLandingPage"));
const EcotopiaPrecosPage = lazyWithReload(() => import("@/pages/EcotopiaPrecosPage"));
const EcotopiaMeditacaoPage = lazyWithReload(() => import("@/pages/EcotopiaMeditacaoPage"));
const EcotopiaSonoPage = lazyWithReload(() => import("@/pages/EcotopiaSonoPage"));
const EcotopiaEcoIAPage = lazyWithReload(() => import("@/pages/EcotopiaEcoIAPage"));
const EcotopiaDiarioPage = lazyWithReload(() => import("@/pages/EcotopiaDiarioPage"));
const EcotopiaAneisPage = lazyWithReload(() => import("@/pages/EcotopiaAneisPage"));
const EcotopiaDispenzaPage = lazyWithReload(() => import("@/pages/EcotopiaDispenzaPage"));
const EcotopiaAnsiedadePage = lazyWithReload(() => import("@/pages/EcotopiaAnsiedadePage"));
const DrJoeAdCreativePage = lazyWithReload(() => import("@/pages/DrJoeAdCreativePage"));
const EcoDreamPage = lazyWithReload(() => import("@/pages/EcoDreamPage"));
const EcoDreamGuestPage = lazyWithReload(() => import("@/pages/guest/EcoDreamGuestPage"));
const CheckoutAnualPage = lazyWithReload(() => import("@/pages/CheckoutAnualPage"));
const AssinarPage = lazyWithReload(() => import("@/pages/AssinarPage"));

// Lightweight loading fallback (no heavy dependencies)
// Conceito "ECO": ondas que partem do símbolo no ritmo de uma respiração lenta.
function LoadingFallback() {
  return (
    <div className="eco-loader flex min-h-screen items-center justify-center bg-white px-6">
      <style>{`
        @keyframes ecoBreathe {
          0%, 100% { transform: scale(1);    filter: drop-shadow(0 8px 18px rgba(54,168,232,0.20)); }
          50%      { transform: scale(1.05); filter: drop-shadow(0 12px 30px rgba(54,168,232,0.34)); }
        }
        @keyframes ecoEcho {
          0%   { transform: scale(0.55); opacity: 0; }
          14%  { opacity: 0.5; }
          100% { transform: scale(2.15); opacity: 0; }
        }
        @keyframes ecoAura {
          0%, 100% { transform: scale(1);    opacity: 0.55; }
          50%      { transform: scale(1.12); opacity: 0.9; }
        }
        @keyframes ecoCaption {
          0%, 100% { opacity: 0.45; }
          50%      { opacity: 0.95; }
        }
        @media (prefers-reduced-motion: reduce) {
          .eco-loader * { animation: none !important; }
        }
      `}</style>

      <div className="flex flex-col items-center gap-10">
        <div className="relative flex h-[200px] w-[200px] items-center justify-center">
          {/* Aura — profundidade, evita o branco chapado */}
          <span
            className="absolute rounded-full"
            style={{
              width: 260,
              height: 260,
              background:
                'radial-gradient(circle, rgba(110,200,255,0.18) 0%, rgba(110,200,255,0) 68%)',
              animation: 'ecoAura 5.6s ease-in-out infinite',
            }}
          />
          {/* Ondas-eco: 3 anéis escalonados, easing desacelerado (eco que se dissipa) */}
          {[0, 1.6, 3.2].map((delay) => (
            <span
              key={delay}
              className="absolute rounded-full"
              style={{
                width: 118,
                height: 118,
                border: '1px solid rgba(110,200,255,0.45)',
                animation: 'ecoEcho 4.8s cubic-bezier(0.22,0.61,0.36,1) infinite',
                animationDelay: `${delay}s`,
              }}
            />
          ))}
          {/* Símbolo respirando */}
          <img
            src="/images/ecotopia-logo-mark.webp"
            alt="Ecotopia"
            width={74}
            height={74}
            className="relative h-[74px] w-[74px] object-contain"
            style={{ animation: 'ecoBreathe 5.6s ease-in-out infinite' }}
          />
        </div>

        <p
          style={{
            fontFamily: "'Lora', Georgia, serif",
            fontStyle: 'italic',
            fontSize: '15px',
            letterSpacing: '0.01em',
            color: '#6B8099',
            animation: 'ecoCaption 4.4s ease-in-out infinite',
          }}
        >
          carregando…
        </p>
      </div>
    </div>
  );
}

const lazyFallback = <LoadingFallback />;

function renderWithSuspense(element: ReactElement) {
  return <Suspense fallback={lazyFallback}>{element}</Suspense>;
}

function renderWithBoundary(element: ReactElement) {
  return (
    <PageErrorBoundary>
      <Suspense fallback={lazyFallback}>{element}</Suspense>
    </PageErrorBoundary>
  );
}

// Forces MeditationPlayerPage to fully remount on every navigation
// (even same-route), so audio state resets correctly when playing next night.
function MeditationPlayerKeyed() {
  const location = useLocation();
  return renderWithBoundary(<MeditationPlayerPage key={location.key} />);
}

function PublicShell() {
  return (
    <div className="flex min-h-[100dvh] w-screen flex-col bg-white font-sans">
      <Outlet />
    </div>
  );
}

function PublicHome() {
  const { user, isGuestMode, loading } = useAuth();

  // Authenticated users (não-guest) sempre vão direto para o dashboard.
  // Não-auth e guest mode veem a Landing de venda.
  if (!loading && user && !isGuestMode) {
    return <Navigate to="/app" replace />;
  }

  return renderWithSuspense(<EcotopiaLandingPage />);
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

function MinigameGuestShell() {
  const { initGuestSession } = useAuth();
  useEffect(() => {
    initGuestSession('landing');
  }, [initGuestSession]);
  return <Outlet />;
}

// Legacy /app/meditacoes/sono — preserva query params no redirect pra
// rota canônica /sono/experiencia (caso contrário source/utm_* somem).
function LegacySonoRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/sono/experiencia${search}`} replace />;
}

function GuestFunnelShell() {
  const { initGuestSession } = useAuth();
  useEffect(() => {
    initGuestSession('landing');
  }, [initGuestSession]);
  return <Outlet />;
}

function SonoGuestShell() {
  const { initGuestSession } = useAuth();
  useEffect(() => {
    initGuestSession('sono');
  }, [initGuestSession]);
  return <Outlet />;
}

// "App · Iniciado" deve significar page load real. AppRoutes remonta quando o
// userId muda (ChatProvider/RingsProvider têm key por usuário no RootProviders),
// então sem este guard o evento re-dispara em todo login/signup e polui a
// leitura dos funis (parecia reload no meio do cadastro do /assinar).
let appStartTracked = false;

function AppRoutes() {
  useEffect(() => {
    if (appStartTracked) return;
    appStartTracked = true;
    mixpanel.track("App · Iniciado", { origem: "App.tsx", data: new Date().toISOString() });
  }, []);

  return (
    <Routes>
      <Route path="/" element={<PublicShell />}>
        <Route index element={<PublicHome />} />
        <Route path="welcome" element={renderWithSuspense(<WelcomePage />)} />
        <Route path="register" element={renderWithSuspense(<CreateProfilePage />)} />
        <Route path="assinar" element={renderWithSuspense(<AssinarPage />)} />
        <Route path="cancelar-assinatura" element={renderWithSuspense(<CancelarAssinaturaPage />)} />
        <Route path="reset-senha" element={renderWithSuspense(<ResetSenha />)} />
        <Route path="precos" element={renderWithSuspense(<EcotopiaPrecosPage />)} />
        <Route path="meditacao" element={renderWithSuspense(<EcotopiaMeditacaoPage />)} />
        <Route path="sono" element={renderWithSuspense(<EcotopiaSonoPage />)} />
        <Route path="eco-ia" element={renderWithSuspense(<EcotopiaEcoIAPage />)} />
        <Route path="estoicismo" element={renderWithSuspense(<EcotopiaDiarioPage />)} />
        <Route path="disciplina" element={renderWithSuspense(<EcotopiaAneisPage />)} />
        <Route path="dr-joe-dispenza" element={renderWithSuspense(<EcotopiaDispenzaPage />)} />
        <Route path="ansiedade" element={renderWithSuspense(<EcotopiaAnsiedadePage />)} />
        <Route path="login" element={renderWithSuspense(<LoginPage />)} />
        <Route path="login/tour" element={<Navigate to="/login?tour=1" replace />} />
        {/* Modo guest do Diário Estoico — URL canônica /guest/diario-estoico.
            Mantém /diario-estoico como redirect para não quebrar links já divulgados. */}
        <Route path="guest/diario-estoico" element={renderWithBoundary(<DiarioEstoicoPage />)} />
        <Route path="diario-estoico" element={<Navigate to="/guest/diario-estoico" replace />} />
        <Route path="meditacao-primeiros-passos" element={renderWithSuspense(<IntroducaoMeditacaoPage />)} />
        <Route path="meditacao/sintonize-novos-potenciais" element={renderWithSuspense(<GuestMeditationPage />)} />
        <Route path="guest/meditation-player" element={renderWithBoundary(<MeditationPlayerPage />)} />
        <Route path="memory-preview" element={renderWithSuspense(<MemoryPageGuestTeaser />)} />
        <Route path="test-upgrade-modal" element={renderWithSuspense(<UpgradeModalTest />)} />
        <Route path="dr-joe/criativo" element={renderWithSuspense(<DrJoeAdCreativePage />)} />
      </Route>
      {/* ── Rotas guest (sem autenticação) — devem vir ANTES do /app/* para não
          serem capturadas pelo catch-all filho do bloco RequireAuth ── */}
      {/* ── /sono/experiencia — public guest funnel (official) ── */}
      <Route path="/sono/experiencia" element={<SonoGuestShell />}>
        <Route index element={renderWithSuspense(<SleepGuestExperiencePage />)} />
      </Route>

      {/* ── /sonhos — funil guest de interpretação de sonhos (tráfego pago) ── */}
      <Route path="/sonhos" element={<GuestFunnelShell />}>
        <Route index element={renderWithSuspense(<EcoDreamGuestPage />)} />
      </Route>

      {/* ── /app/meditacoes/sono — legacy redirect (preserva ?source=&utm_*) ── */}
      <Route path="/app/meditacoes/sono" element={<LegacySonoRedirect />} />
      <Route path="/app/minigame-potencial" element={<MinigameGuestShell />}>
        <Route index element={renderWithSuspense(<MinigamePotencialPage />)} />
      </Route>
      <Route path="/app/guest" element={<GuestFunnelShell />}>
        <Route path="intro-potencial" element={renderWithBoundary(<IntroPotencialPage />)} />
        <Route path="dr-joe-preview" element={renderWithBoundary(<DrJoePreviewPage />)} />
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
        <Route path="chat" element={renderWithBoundary(<ChatPage />)} />
        <Route path="voice" element={renderWithSuspense(<VoicePage />)} />
        <Route path="memory" element={renderWithSuspense(<MemoryLayout />)}>
          <Route index element={renderWithSuspense(<MemoriesSection />)} />
          <Route path="profile" element={renderWithSuspense(<ProfileSection />)} />
          <Route path="report" element={renderWithSuspense(<ReportSection />)} />
          <Route path="*" element={<Navigate to="/app/memory" replace />} />
        </Route>
        <Route path="rings" element={renderWithSuspense(<FiveRingsHub />)} />
        <Route path="rings/ritual" element={renderWithBoundary(<DailyRitual />)} />
        <Route path="rings/timeline" element={renderWithSuspense(<Timeline />)} />
        <Route path="rings/progress" element={renderWithSuspense(<Progress />)} />
        <Route path="rings/detail/:ringId" element={renderWithSuspense(<RingDetail />)} />
        <Route path="riqueza-mental" element={renderWithSuspense(<RiquezaMentalProgram />)} />
        <Route path="articles/sleep" element={renderWithSuspense(<SleepArticle />)} />
        <Route path="articles/good-night-sleep" element={renderWithSuspense(<GoodNightSleepArticle />)} />
        <Route path="diario-estoico" element={renderWithBoundary(<DiarioEstoicoPage />)} />
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
        path="/app/recondicione-corpo-mente"
        element={
          <RequireAuth>
            <AppProtectedShellNoLayout />
          </RequireAuth>
        }
      >
        <Route index element={renderWithSuspense(<RecondicioneCorpoMentePage />)} />
      </Route>
      <Route
        path="/app/recondicione-antes-de-comecar"
        element={
          <RequireAuth>
            <AppProtectedShellNoLayout />
          </RequireAuth>
        }
      >
        <Route index element={renderWithSuspense(<RecondicioneAntesDeComecarPage />)} />
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
        <Route index element={renderWithSuspense(<SleepMeditationsPage />)} />
      </Route>
      <Route
        path="/app/codigo-da-abundancia"
        element={
          <RequireAuth>
            <AppProtectedShellNoLayout />
          </RequireAuth>
        }
      >
        <Route index element={renderWithSuspense(<CodigoDaAbundanciaPage />)} />
      </Route>
      <Route
        path="/app/checkout-anual"
        element={
          <RequireAuth>
            <AppProtectedShellNoLayout />
          </RequireAuth>
        }
      >
        <Route index element={renderWithSuspense(<CheckoutAnualPage />)} />
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
        <Route index element={<MeditationPlayerKeyed />} />
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
      <Route
        path="/app/dream"
        element={
          <RequireAuth>
            <AppProtectedShellNoLayout />
          </RequireAuth>
        }
      >
        <Route index element={renderWithBoundary(<EcoDreamPage />)} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppChrome() {
  const navigate = useNavigate();
  const location = useLocation();
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
    if (location.pathname === '/sono/experiencia') return; // Funil Sono guest sem cadastro/interrupções

    const interval = setInterval(() => {
      if (shouldShowModal()) {
        setGuestModalOpen(true);
        markModalShown();

        // Analytics
        mixpanel.track('Convidado · Modal cadastro exibido', {
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
  }, [user, location.pathname, shouldShowModal, markModalShown, state]);

  // Keepalive ping — mantém o backend Render acordado (evita cold start)
  useEffect(() => {
    const TEN_MINUTES = 10 * 60 * 1000;
    const keepalive = setInterval(() => {
      pingWithRetry(1, 0).catch(() => {/* silencioso */});
    }, TEN_MINUTES);
    return () => clearInterval(keepalive);
  }, []);

  // Handlers do modal
  const handleGuestSignup = () => {
    mixpanel.track('Convidado · Modal cadastro signup', {
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
    mixpanel.track('Convidado · Modal cadastro continuou', {
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
          controller.abort('component_unmount');
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
        <ScrollToTop />
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

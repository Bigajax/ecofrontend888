// src/App.tsx
import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ChatProvider } from './contexts/ChatContext';
import { LLMSettingsProvider } from './contexts/LLMSettingsContext';

import LoginPage from './pages/LoginPage';
import ResetSenha from './pages/ResetSenha';
import ChatPage from './pages/ChatPage';
import VoicePage from './pages/VoicePage';
import CreateProfilePage from './pages/CreateProfilePage';
import ProtectedRoute from './components/ProtectedRoute';
import mixpanel from './lib/mixpanel';
import MainLayout from './layouts/MainLayout';
import EcoBubbleLoading from './components/EcoBubbleLoading';
import WelcomePage from './pages/WelcomePage'; // ✅ NOVO

// MEMÓRIAS
const MemoryLayout = React.lazy(() => import('./pages/memory/MemoryLayout'));
const MemoriesSection = React.lazy(() => import('./pages/memory/MemoriesSection'));
const ProfileSection = React.lazy(() => import('./pages/memory/ProfileSection'));
const ReportSection = React.lazy(() => import('./pages/memory/ReportSection'));

const memorySuspenseFallback = (
  <div className="flex min-h-[320px] items-center justify-center py-10">
    <EcoBubbleLoading size={120} text="Carregando memórias..." />
  </div>
);

/** Wrapper para dar key por usuário ao ChatProvider */
function ChatProviderWithKey({ children }: { children: React.ReactNode }) {
  const { userId } = useAuth();
  return <ChatProvider key={userId || 'anon'}>{children}</ChatProvider>;
}

/** Redireciona "/" para /welcome quando há fbclid/utm_* ou ?tour=1; senão vai para /login */
function RootRedirect() {
  const search = typeof window !== 'undefined' ? window.location.search : '';
  const fromAdsOrTour = /(\bfbclid=|\butm_|tour=1)/.test(search);
  return fromAdsOrTour ? (
    <Navigate to={`/welcome${search}`} replace />
  ) : (
    <Navigate to="/login" replace />
  );
}

function AppInner() {
  useEffect(() => {
    mixpanel.track('App iniciado', { origem: 'App.tsx', data: new Date().toISOString() });
  }, []);

  return (
    <div className="min-h-screen w-screen bg-white font-sans flex flex-col">
      <Routes>
        {/* Raiz inteligente → /welcome (ads/tour) ou /login */}
        <Route path="/" element={<RootRedirect />} />

        {/* Rotas públicas */}
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/login" element={<LoginPage />} />
        {/* Atalho para forçar tour via /login/tour */}
        <Route path="/login/tour" element={<Navigate to="/welcome?tour=1" replace />} />

        <Route path="/register" element={<CreateProfilePage />} />
        <Route path="/reset-senha" element={<ResetSenha />} />

        {/* Rotas protegidas */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <MainLayout>
                <ChatPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <MainLayout>
                <ChatPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/voice"
          element={
            <ProtectedRoute>
              <MainLayout>
                <VoicePage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* MEMÓRIAS — PAI COM * */}
        <Route
          path="/memory/*"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={memorySuspenseFallback}>
                  <MemoryLayout />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={
              <Suspense fallback={memorySuspenseFallback}>
                <MemoriesSection />
              </Suspense>
            }
          />
          <Route
            path="profile"
            element={
              <Suspense fallback={memorySuspenseFallback}>
                <ProfileSection />
              </Suspense>
            }
          />
          <Route
            path="report"
            element={
              <Suspense fallback={memorySuspenseFallback}>
                <ReportSection />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/memory" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LLMSettingsProvider>
        <ChatProviderWithKey>
          <AppInner />
        </ChatProviderWithKey>
      </LLMSettingsProvider>
    </AuthProvider>
  );
}

// src/App.tsx
import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ChatProvider } from './contexts/ChatContext';

import LoginPage from './pages/LoginPage';
import ResetSenha from './pages/ResetSenha';
import ChatPage from './pages/ChatPage';
import VoicePage from './pages/VoicePage';
import CreateProfilePage from './pages/CreateProfilePage';
import ProtectedRoute from './components/ProtectedRoute';
import mixpanel from './lib/mixpanel';
import MainLayout from './layouts/MainLayout';
import EcoBubbleLoading from './components/EcoBubbleLoading';

// MEMÓRIAS
const MemoryLayout = React.lazy(() => import('./pages/memory/MemoryLayout'));
const MemoriesSection = React.lazy(() => import('./pages/memory/MemoriesSection'));
const ProfileSection = React.lazy(() => import('./pages/memory/ProfileSection'));
const ReportSection = React.lazy(() => import('./pages/memory/ReportSection'));

const memorySuspenseFallback = (
  <div className="flex min-h-[320px] items-center justify-center py-10">
    <EcoBubbleLoading variant="memories" size={120} text="Carregando memórias..." />
  </div>
);

/** Wrapper para dar key por usuário ao ChatProvider */
function ChatProviderWithKey({ children }: { children: React.ReactNode }) {
  const { userId } = useAuth();
  return <ChatProvider key={userId || 'anon'}>{children}</ChatProvider>;
}

function AppInner() {
  useEffect(() => {
    mixpanel.track('App iniciado', { origem: 'App.tsx', data: new Date().toISOString() });
  }, []);

  return (
    <div className="min-h-screen w-screen bg-white font-sans flex flex-col">
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Login + rota amigável para abrir o Tour */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/login/tour" element={<LoginPage />} />

        <Route path="/register" element={<CreateProfilePage />} />
        <Route path="/reset-senha" element={<ResetSenha />} />

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
      <ChatProviderWithKey>
        <AppInner />
      </ChatProviderWithKey>
    </AuthProvider>
  );
}

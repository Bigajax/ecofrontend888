// src/App.tsx
import React, { useEffect } from 'react';
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

// MEMÓRIAS
import MemoryLayout from './pages/memory/MemoryLayout';
import MemoriesSection from './pages/memory/MemoriesSection';
import ProfileSection from './pages/memory/ProfileSection';
import ReportSection from './pages/memory/ReportSection';

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
                <MemoryLayout />
              </MainLayout>
            </ProtectedRoute>
          }
        >
          <Route index element={<MemoriesSection />} />
          <Route path="profile" element={<ProfileSection />} />
          <Route path="report" element={<ReportSection />} />
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

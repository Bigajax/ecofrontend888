// src/layouts/MainLayout.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { clearMessages } = useChat();

  const handleSignOut = async () => {
    try {
      await signOut();
      clearMessages();
    } finally {
      navigate('/');
    }
  };

  return (
    <>
      <Header onSignOut={user ? handleSignOut : undefined} />

      <main className="min-h-[100dvh] bg-transparent text-[color:var(--color-text-primary)]">
        <div className="mx-auto w-full max-w-[1140px] px-4 sm:px-6 md:px-8">
          {children}
        </div>
      </main>
    </>
  );
}

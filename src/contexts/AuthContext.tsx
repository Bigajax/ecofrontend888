// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userId?: string;
  userName?: string;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  register: (email: string, password: string, nome: string, telefone: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Limpa dados locais associados à sessão/usuário */
function clearClientState() {
  try {
    // mensagens do chat por usuário (ajuste o prefixo conforme seu ChatContext)
    Object.keys(localStorage).forEach((k) => {
      if (
        k.startsWith('eco.chat.v1.') || // histórico do chat
        k === 'eco.session' ||          // ids de sessão locais (se você usa)
        k === 'eco.sidebar.collapsed'   // estado da sidebar
      ) {
        localStorage.removeItem(k);
      }
    });

    // flags de sessão/feedback
    sessionStorage.removeItem('eco_feedback_given');
    sessionStorage.removeItem('eco.session');
  } catch {}

  // Opcional: limpar caches PWA (se usar service worker)
  try {
    if ('caches' in window) {
      caches.keys().then((keys) => {
        keys
          .filter((k) => /eco|app|static/i.test(k))
          .forEach((k) => caches.delete(k).catch(() => {}));
      });
    }
  } catch {}
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const getSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) console.error('Erro ao obter sessão:', error.message);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getSession();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session) => {
        if (!mounted) return;
        setSession(session ?? null);
        setUser(session?.user ?? null);

        // Se o logout ocorrer em outra aba/expirar, garantimos a limpeza local
        if (event === 'SIGNED_OUT') {
          clearClientState();
        }
      }
    );

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    // Opcional: mostrar loading durante o processo
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } finally {
      // Zera estado local SEMPRE, independente do retorno do supabase
      clearClientState();
      setUser(null);
      setSession(null);
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, nome: string, telefone: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: nome },
      },
    });
    if (error) throw error;

    const newUserId = data.user?.id;
    if (newUserId) {
      await supabase.from('usuarios').insert([
        {
          id: newUserId,
          nome,
          email,
          telefone,
          data_criacao: new Date().toISOString(),
          tipo_plano: 'free',
          ativo: true,
        },
      ]);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        userId: user?.id,
        userName: user?.user_metadata?.full_name || user?.user_metadata?.name,
        signIn,
        signOut,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  return context;
};

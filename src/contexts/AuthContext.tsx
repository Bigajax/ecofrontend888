import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ensureProfile } from '../lib/ensureProfile';
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import mixpanel from '../lib/mixpanel';
import { clearGuestStorage } from '../hooks/useGuestGate';
import { isEcoStreamActive, runWhenStreamIdle } from '../hooks/useEcoStream/streamStatus';

const AUTH_TOKEN_KEY = 'auth_token';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userId?: string;
  userName?: string;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
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

function persistAuthToken(token: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (token) {
      window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch {}
}

function syncMixpanelIdentity(authUser?: User | null) {
  if (!authUser) return;

  mixpanel.identify(authUser.id);

  const fullName = authUser.user_metadata?.full_name || authUser.user_metadata?.name;
  const userData: Record<string, string> = {};

  if (fullName) userData.$name = fullName;
  if (authUser.email) userData.$email = authUser.email;

  if (Object.keys(userData).length > 0) {
    if (mixpanel.people && typeof mixpanel.people.set === 'function') {
      mixpanel.people.set(userData);
    } else {
      mixpanel.register(userData);
    }
  }
}

async function safelyEnsureProfile(user: User | null | undefined, context: string) {
  if (!user) return null;
  try {
    await ensureProfile(user);
    return user;
  } catch (error) {
    console.error('[Auth] Profile error', { context, error });
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
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
      persistAuthToken(session?.access_token ?? null);
      setLoading(false);

      if (session?.user) {
        // logou => zera dados do modo guest
        clearGuestStorage();
        await safelyEnsureProfile(session.user, 'getSession');
      }
    };

    getSession().catch((error) => {
      console.error('[Auth] Session bootstrap error', error);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session) => {
        if (!mounted) return;
        setSession(session ?? null);
        setUser(session?.user ?? null);
        persistAuthToken(session?.access_token ?? null);

        // Logout em outra aba/expiração da sessão
        if (event === 'SIGNED_OUT') {
          const signedOutCleanup = () => {
            clearClientState();
            clearGuestStorage(); // <— garante limpeza do modo guest
            persistAuthToken(null);
            if (typeof mixpanel.unregister_all === 'function') {
              mixpanel.unregister_all();
            }
            mixpanel.reset();
          };

          if (isEcoStreamActive()) {
            console.info('[Auth] SIGNED_OUT deferred until stream idle');
            runWhenStreamIdle(signedOutCleanup);
          } else {
            signedOutCleanup();
          }

          return;
        }

        if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
          clearGuestStorage(); // <— ao logar, limpa storage de guest
          syncMixpanelIdentity(session.user);
        }

        const handleSessionChange = async () => {
          if (event === 'SIGNED_IN') {
            try {
              const { data } = await supabase.auth.getUser();
              await safelyEnsureProfile(data.user, 'postOAuth');
            } catch (error) {
              console.error('[Auth] Session change error', error);
            }
            return;
          }

          if (session?.user) {
            await safelyEnsureProfile(session.user, 'sessionChange');
          }
        };

        handleSessionChange().catch((error) => {
          console.error('[Auth] Session change error', error);
        });
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

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const envAppUrl = import.meta.env.VITE_APP_URL;
      const fallbackOrigin =
        typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
      const baseUrl = (envAppUrl || fallbackOrigin).replace(/\/+$/, '');

      if (!baseUrl) {
        throw new Error('URL de redirecionamento inválida. Configure VITE_APP_URL.');
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${baseUrl}/app` },
      });

      if (error) throw error;
    } catch (err) {
      setLoading(false);
      throw err;
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
      clearGuestStorage(); // <— limpa ID/contadores do guest ao sair
      persistAuthToken(null);
      if (typeof mixpanel.unregister_all === 'function') {
        mixpanel.unregister_all();
      }
      mixpanel.reset();
      setUser(null);
      setSession(null);
      setLoading(false);
    }
  };

  const lastIdentitySignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      lastIdentitySignatureRef.current = null;
      return;
    }

    const signature = [
      user.id ?? '',
      user.email ?? '',
      user.user_metadata?.full_name ?? '',
      user.user_metadata?.name ?? '',
    ].join('|');

    if (lastIdentitySignatureRef.current === signature) {
      return;
    }

    lastIdentitySignatureRef.current = signature;
    syncMixpanelIdentity(user);
  }, [user?.id, user?.email, user?.user_metadata?.full_name, user?.user_metadata?.name]);

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
        signInWithGoogle,
        signOut,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  return context;
};

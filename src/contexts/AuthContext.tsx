import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ensureProfile } from '../lib/ensureProfile';
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import mixpanel from '../lib/mixpanel';
import { clearGuestStorage } from '../hooks/useGuestGate';
import { isStreamActive, onStreamActivityChange } from '../hooks/useEcoStream/streamStatus';
import { getOrCreateGuestId, readPersistedGuestId } from '../api/guestIdentity';

const AUTH_TOKEN_KEY = 'auth_token';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userId?: string;
  userName?: string;
  isGuestMode: boolean;
  guestId: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  register: (email: string, password: string, nome: string, telefone: string) => Promise<void>;
  loginAsGuest: () => Promise<void>;
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

async function waitForIdle(timeoutMs = 4000) {
  if (!isStreamActive()) return;

  await new Promise<void>((resolve) => {
    let resolved = false;
    let cleanup = () => {};
    const finish = () => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve();
    };
    const off = onStreamActivityChange(() => {
      if (!isStreamActive()) {
        finish();
      }
    });
    const timeoutId = setTimeout(() => {
      finish();
    }, Math.max(0, timeoutMs));
    cleanup = () => {
      clearTimeout(timeoutId);
      off();
    };

    if (!isStreamActive()) {
      finish();
    }
  });
}

async function safeCleanupAfterSignout(runCleanup: () => void) {
  if (isStreamActive()) {
    await waitForIdle(4000);
  }
  runCleanup();
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

  // Guest mode state - persisted in localStorage
  const [isGuestMode, setIsGuestMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('eco.auth.guestMode') === '1';
    } catch {
      return false;
    }
  });

  const [guestId, setGuestId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const guestModeActive = localStorage.getItem('eco.auth.guestMode') === '1';
      if (guestModeActive) {
        return readPersistedGuestId();
      }
    } catch {
      // Ignore errors
    }
    return null;
  });

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
          // Limpa localStorage imediatamente
          clearClientState();
          clearGuestStorage();
          persistAuthToken(null);

          const signedOutCleanup = () => {
            // Cleanup adicional após stream terminar
            if (typeof mixpanel.unregister_all === 'function') {
              mixpanel.unregister_all();
            }
            mixpanel.reset();
          };

          if (isStreamActive()) {
            console.info('[Auth] SIGNED_OUT deferred until stream idle');
          }

          void safeCleanupAfterSignout(signedOutCleanup);

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

      // Clear guest mode on successful login
      setIsGuestMode(false);
      setGuestId(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('eco.auth.guestMode');
      }
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

      // Clear guest mode on successful OAuth login
      setIsGuestMode(false);
      setGuestId(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('eco.auth.guestMode');
      }
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      // Aguarda stream terminar antes de fazer logout
      if (isStreamActive()) {
        await waitForIdle(2000);
      }

      // IMPORTANTE: Limpa localStorage ANTES de fazer logout
      // Isso garante que o histórico do chat seja removido imediatamente
      clearClientState();
      clearGuestStorage();
      persistAuthToken(null);

      // Clear guest mode
      setIsGuestMode(false);
      setGuestId(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('eco.auth.guestMode');
      }

      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } finally {
      // Garantir limpeza mesmo se o logout falhar
      clearClientState();
      clearGuestStorage();
      persistAuthToken(null);

      // Clear guest mode (fallback)
      setIsGuestMode(false);
      setGuestId(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('eco.auth.guestMode');
      }

      if (typeof mixpanel.unregister_all === 'function') {
        mixpanel.unregister_all();
      }
      mixpanel.reset();

      // Força a limpeza de user/session
      setUser(null);
      setSession(null);
      setLoading(false);
    }
  };

  const lastIdentitySignatureRef = useRef<string | null>(null);

  // Sync guest mode across tabs via storage events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'eco.auth.guestMode') {
        const newValue = e.newValue === '1';
        setIsGuestMode(newValue);

        if (newValue) {
          // Guest mode was activated in another tab
          const persistedGuestId = readPersistedGuestId();
          setGuestId(persistedGuestId);
        } else {
          // Guest mode was cleared in another tab
          setGuestId(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

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

  const loginAsGuest = async () => {
    // Already authenticated? Nothing to do
    if (user) {
      console.info('[Auth] Already authenticated, skipping guest mode');
      return;
    }

    setLoading(true);
    try {
      // Create guest ID (ONLY place where this happens intentionally)
      const newGuestId = getOrCreateGuestId();

      // Activate guest mode
      setIsGuestMode(true);
      setGuestId(newGuestId);

      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('eco.auth.guestMode', '1');
      }

      // Track analytics
      mixpanel.identify(`guest_${newGuestId}`);
      mixpanel.track('Guest Mode Activated', {
        guestId: newGuestId,
        timestamp: new Date().toISOString(),
      });

      console.info('[Auth] Guest mode activated', { guestId: newGuestId });
    } catch (error) {
      console.error('[Auth] Failed to activate guest mode:', error);
      throw error;
    } finally {
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
        isGuestMode,
        guestId,
        signIn,
        signInWithGoogle,
        signOut,
        register,
        loginAsGuest,
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

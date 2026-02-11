import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ensureProfile } from '../lib/ensureProfile';
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import mixpanel from '../lib/mixpanel';
import { clearGuestStorage } from '../hooks/useGuestGate';
import { isStreamActive, onStreamActivityChange } from '../hooks/useEcoStream/streamStatus';
import { getOrCreateGuestId, readPersistedGuestId } from '../api/guestIdentity';
import type { SubscriptionState } from '../types/subscription';
import { getSubscriptionStatus } from '../api/subscription';
import * as ringsApi from '../api/ringsApi';
import { isVipUser as checkIsVipUser } from '../constants/vipUsers';
import { apiFetch } from '../api/apiFetch';

const AUTH_TOKEN_KEY = 'auth_token';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userId?: string;
  userName?: string;
  isGuestMode: boolean;
  guestId: string | null;
  isVipUser: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithGoogleIdToken: (idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  register: (email: string, password: string, nome: string, telefone: string) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  migrateGuestData: (newUserId: string) => Promise<PreservedData>;

  // Subscription fields
  subscription: SubscriptionState;
  isPremiumUser: boolean;
  isTrialActive: boolean;
  trialDaysRemaining: number;
  refreshSubscription: () => Promise<void>;
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

export interface PreservedData {
  chatMessages?: number;
  favorites?: number;
  ringsDay?: number;
  meditationProgress?: boolean;
}

/**
 * Migra dados de guest mode para conta autenticada
 * Deve ser chamado IMEDIATAMENTE após signup bem-sucedido, ANTES de clearGuestStorage
 */
export async function migrateGuestData(newUserId: string): Promise<PreservedData> {
  const preservedData: PreservedData = {};

  try {
    // 1. Ler guestId
    const guestId = readPersistedGuestId();
    if (!guestId) {
      console.info('[Auth] No guest ID found, skipping migration');
      return preservedData;
    }

    console.info('[Auth] Starting guest data migration', { guestId, newUserId });

    // 2. Migrar histórico chat
    const guestChatKey = `eco.chat.v1.${guestId}`;
    const guestChat = localStorage.getItem(guestChatKey);
    if (guestChat) {
      try {
        const messages = JSON.parse(guestChat);
        if (Array.isArray(messages) && messages.length > 0) {
          // Copiar para key do novo usuário
          const userChatKey = `eco.chat.v1.${newUserId}`;
          localStorage.setItem(userChatKey, guestChat);

          preservedData.chatMessages = messages.length;
          console.info('[Auth] Chat history migrated', { messageCount: messages.length });
        }
      } catch (err) {
        console.error('[Auth] Failed to migrate chat history:', err);
      }
    }

    // 3. Migrar progresso Five Rings
    const guestRingsKey = `eco.rings.v1.rituals.${guestId}`;
    const guestRings = localStorage.getItem(guestRingsKey);
    if (guestRings) {
      try {
        const ringsData = JSON.parse(guestRings);
        if (ringsData && Array.isArray(ringsData)) {
          // Copiar para key do novo usuário (localStorage)
          const userRingsKey = `eco.rings.v1.rituals.${newUserId}`;
          localStorage.setItem(userRingsKey, guestRings);

          // NOVO: Migrar para backend
          try {
            await ringsApi.migrateFromLocalStorage({ rituals: ringsData });
            console.info('[Auth] Rings migrated to backend', { count: ringsData.length });
          } catch (backendError) {
            console.error('[Auth] Failed to migrate rings to backend:', backendError);
            // Continue anyway - data is in localStorage
          }

          // Encontrar o dia atual (último ritual)
          const lastRitual = ringsData[ringsData.length - 1];
          if (lastRitual?.date) {
            preservedData.ringsDay = ringsData.length; // Count of rituals
          }

          console.info('[Auth] Rings progress migrated', { ritualsCount: ringsData.length });
        }
      } catch (err) {
        console.error('[Auth] Failed to migrate rings progress:', err);
      }
    }

    // 4. Migrar progresso meditação (se existir em sessionStorage)
    // Nota: meditações geralmente não são persistidas para guests, mas verificamos
    const guestMeditationKey = `eco.meditation.${guestId}`;
    const guestMeditation = sessionStorage.getItem(guestMeditationKey);
    if (guestMeditation) {
      try {
        const meditationData = JSON.parse(guestMeditation);
        if (meditationData) {
          const userMeditationKey = `eco.meditation.${newUserId}`;
          sessionStorage.setItem(userMeditationKey, guestMeditation);

          preservedData.meditationProgress = true;
          console.info('[Auth] Meditation progress migrated');
        }
      } catch (err) {
        console.error('[Auth] Failed to migrate meditation progress:', err);
      }
    }

    // 5. Chamar backend para migrar referencias_temporarias
    try {
      console.info('[Auth] Calling /api/guest/claim to migrate backend data', { guestId, newUserId });

      await apiFetch('/api/guest/claim', {
        method: 'POST',
        json: { guestId },
      });

      console.info('[Auth] Backend data migration successful');
    } catch (claimError) {
      console.error('[Auth] Failed to claim guest data on backend:', claimError);
      // Continue anyway - localStorage data is already migrated
    }

    // 6. Track sucesso migração
    mixpanel.track('Guest Data Migrated', {
      guestId,
      newUserId,
      chat_messages: preservedData.chatMessages || 0,
      favorites_count: preservedData.favorites || 0,
      rings_day: preservedData.ringsDay || 0,
      meditation_progress: preservedData.meditationProgress || false,
      timestamp: new Date().toISOString(),
    });

    console.info('[Auth] Guest data migration completed', preservedData);
  } catch (error) {
    console.error('[Auth] Error during guest data migration:', error);
  }

  return preservedData;
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

  // Subscription state
  const [subscription, setSubscription] = useState<SubscriptionState>({
    plan: 'free',
    status: 'active',
    trialStartDate: null,
    trialEndDate: null,
    subscriptionId: null,
    provider: 'mercadopago',
    providerPreapprovalId: null,
    providerPaymentId: null,
    planType: null,
    currentPeriodEnd: null,
    accessUntil: null,
    nextBillingDate: null,
  });

  // Computed VIP status
  const isVipUser = checkIsVipUser(user?.email);

  // Computed subscription values
  const isPremiumUser = (() => {
    // VIP users have full access
    if (isVipUser) return true;
    if (!subscription.accessUntil) return false;
    const now = new Date();
    const accessUntil = new Date(subscription.accessUntil);
    return now <= accessUntil && subscription.status === 'active';
  })();

  const isTrialActive = (() => {
    if (subscription.plan !== 'trial') return false;
    if (!subscription.trialEndDate) return false;
    const now = new Date();
    const endDate = new Date(subscription.trialEndDate);
    return now <= endDate && subscription.status === 'active';
  })();

  const trialDaysRemaining = (() => {
    if (!isTrialActive || !subscription.trialEndDate) return 0;
    const now = new Date();
    const endDate = new Date(subscription.trialEndDate);
    const diffMs = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  })();

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    // 🛡️ PROTEÇÃO: Timeout de segurança para evitar loading infinito
    // Se após 60s ainda estiver loading, apenas para o loading
    // MAS NÃO faz logout - mantém o usuário autenticado
    timeoutId = setTimeout(() => {
      if (mounted && loading) {
        console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.warn('[AuthProvider] ⚠️ TIMEOUT DE SEGURANÇA ATIVADO');
        console.warn('[AuthProvider] Loading estava travado há 60s');
        console.warn('[AuthProvider] Parando loading mas MANTENDO usuário autenticado');
        console.warn('[AuthProvider] Timestamp:', new Date().toISOString());
        console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        setLoading(false);
        // NÃO limpa session/user - mantém autenticado
      }
    }, 60000); // 60 segundos máximo

    const getSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error('[AuthProvider] Erro ao obter sessão:', error.message);
          // Mesmo com erro, não pode ficar travado em loading
          setLoading(false);
          setSession(null);
          setUser(null);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        persistAuthToken(session?.access_token ?? null);
        setLoading(false);

        if (session?.user) {
          // logou => zera dados do modo guest
          clearGuestStorage();
          await safelyEnsureProfile(session.user, 'getSession');
        }
      } catch (error) {
        console.error('[AuthProvider] Exceção durante getSession:', error);
        if (mounted) {
          // Nunca deixar travado, mesmo com exceção
          setLoading(false);
          setSession(null);
          setUser(null);
        }
      }
    };

    getSession().catch((error) => {
      console.error('[Auth] Session bootstrap error', error);
      if (mounted) {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session) => {
        if (!mounted) return;

        // 🛡️ LOG DETALHADO: Rastrear todas as mudanças de autenticação
        console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.info('[Auth] 🔐 AUTH STATE CHANGE DETECTADO');
        console.info('[Auth] Evento:', event);
        console.info('[Auth] Session presente:', !!session);
        console.info('[Auth] User presente:', !!session?.user);
        console.info('[Auth] Timestamp:', new Date().toISOString());
        console.info('[Auth] URL:', window.location.href);
        console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        setSession(session ?? null);
        setUser(session?.user ?? null);
        persistAuthToken(session?.access_token ?? null);

        // 🛡️ PROTEÇÃO: Detecta SIGNED_OUT mas NÃO faz logout automático
        // Apenas faz logout se foi o PRÓPRIO USUÁRIO que clicou em "Sair"
        if (event === 'SIGNED_OUT') {
          console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.warn('[Auth] ⚠️ SIGNED_OUT DETECTADO');
          console.warn('[Auth] Tentando recuperar sessão automaticamente...');
          console.warn('[Auth] Timestamp:', new Date().toISOString());
          console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

          // Tentar recuperar a sessão automaticamente
          supabase.auth.getSession().then(({ data: { session: recoveredSession }, error }) => {
            if (error) {
              console.error('[Auth] ❌ Erro ao tentar recuperar sessão:', error);
              // Não faz logout, apenas registra o erro
              // O usuário pode continuar usando o app
              return;
            }

            if (recoveredSession) {
              console.info('[Auth] ✅ Sessão recuperada com sucesso!');
              setSession(recoveredSession);
              setUser(recoveredSession.user);
              persistAuthToken(recoveredSession.access_token);
            } else {
              console.warn('[Auth] ⚠️ Não foi possível recuperar a sessão');
              console.warn('[Auth] Mas NÃO vamos fazer logout automático');
              console.warn('[Auth] Usuário pode continuar usando o app');
              // Não limpa nada - mantém o usuário logado localmente
            }
          }).catch((err) => {
            console.error('[Auth] Exceção ao recuperar sessão:', err);
            // Não faz logout mesmo com erro
          });

          return;
        }

        // 🛡️ PROTEÇÃO: Log quando o token é renovado automaticamente
        if (event === 'TOKEN_REFRESHED') {
          console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.info('[Auth] ✅ TOKEN RENOVADO COM SUCESSO');
          console.info('[Auth] Session válida até:', new Date(session?.expires_at ? session.expires_at * 1000 : 0).toISOString());
          console.info('[Auth] Timestamp:', new Date().toISOString());
          console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
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
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      sub.subscription.unsubscribe();
    };
  }, []);

  // Refresh subscription from backend
  const refreshSubscription = async () => {
    if (!user) {
      // Reset to free if no user
      setSubscription({
        plan: 'free',
        status: 'active',
        trialStartDate: null,
        trialEndDate: null,
        subscriptionId: null,
        provider: 'mercadopago',
        providerPreapprovalId: null,
        providerPaymentId: null,
        planType: null,
        currentPeriodEnd: null,
        accessUntil: null,
        nextBillingDate: null,
      });
      return;
    }

    try {
      const status = await getSubscriptionStatus();

      setSubscription({
        plan: status.plan,
        status: status.status,
        trialStartDate: status.trialStartDate,
        trialEndDate: status.trialEndDate,
        subscriptionId: null, // Will be set by backend if needed
        provider: 'mercadopago',
        providerPreapprovalId: null,
        providerPaymentId: null,
        planType: status.planType,
        currentPeriodEnd: status.currentPeriodEnd,
        accessUntil: status.accessUntil,
        nextBillingDate: null,
      });
    } catch (error) {
      console.error('[Auth] Failed to refresh subscription:', error);
      // Keep current state on error
    }
  };

  // Refresh subscription when user changes
  useEffect(() => {
    if (user) {
      refreshSubscription();
    }
  }, [user?.id]);

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

  const signInWithGoogleIdToken = async (idToken: string) => {
    setLoading(true);
    try {
      // Sign in with Google ID token using Supabase
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) throw error;

      // Clear guest mode on successful login
      setIsGuestMode(false);
      setGuestId(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('eco.auth.guestMode');
      }

      // Sync with Mixpanel
      if (data.user) {
        syncMixpanelIdentity(data.user);
        await safelyEnsureProfile(data.user, 'googleOneTap');
      }
    } finally {
      setLoading(false);
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
        isVipUser,
        signIn,
        signInWithGoogle,
        signInWithGoogleIdToken,
        signOut,
        register,
        loginAsGuest,
        migrateGuestData,

        // Subscription
        subscription,
        isPremiumUser,
        isTrialActive,
        trialDaysRemaining,
        refreshSubscription,
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

// AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userId?: string;
  userName?: string;
  accessToken: string | null;                          // ➕
  getAuthHeader: () => Promise<Record<string,string>>; // ➕
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  register: (email: string, password: string, nome: string, telefone: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null); // ➕
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) console.error('Erro ao obter sessão:', error.message);
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setAccessToken(data.session?.access_token ?? null); // ➕
      setLoading(false);
    };
    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setAccessToken(newSession?.access_token ?? null); // ➕ mantém o token atualizado (inclui TOKEN_REFRESHED)
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // garante que pegamos o token imediatamente após sign-in
    const { data } = await supabase.auth.getSession();
    setAccessToken(data.session?.access_token ?? null);
    setLoading(false);
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setSession(null);
    setAccessToken(null);
  };

  const register = async (email: string, password: string, nome: string, telefone: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: nome } },
    });
    if (error) throw error;

    // ⚠️ Obs.: se a confirmação de email estiver ativa, pode não haver sessão aqui.
    const newUserId = data.user?.id;
    if (newUserId) {
      const { error: insertErr } = await supabase.from('usuarios').insert([{
        id: newUserId, nome, email, telefone,
        data_criacao: new Date().toISOString(), tipo_plano: 'free', ativo: true,
      }]);
      if (insertErr) console.warn('Falha ao criar registro em usuarios:', insertErr.message);
    }
  };

  const getAuthHeader = async () => {
    // sempre pega o token mais recente (auto refresh do Supabase)
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token ?? accessToken;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        userId: user?.id,
        userName: user?.user_metadata?.full_name,
        accessToken,
        getAuthHeader, // ➕
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

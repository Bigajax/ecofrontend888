// src/pages/CreateProfilePage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth, type PreservedData } from '../contexts/AuthContext';
import PhoneFrame from '../components/PhoneFrame';
import WelcomeScreen from '../components/WelcomeScreen';
import { fbq } from '../lib/fbpixel';
import mixpanel from '../lib/mixpanel';
import { supabase as supabaseClient } from '../lib/supabaseClient';

// Declaração de tipo para Google Identity Services
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (callback?: (notification: any) => void) => void;
          renderButton: (element: HTMLElement, config: any) => void;
        };
      };
    };
  }
}

/* Bolha igual ao login (uma só) */
const BubbleIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 96 96" className={className} aria-hidden="true">
    <defs>
      <radialGradient id="bgCore" cx="38%" cy="32%" r="62%">
        <stop offset="0%"  stopColor="#ffffff" stopOpacity="0.95"/>
        <stop offset="45%" stopColor="#CDE6F0" stopOpacity="0.9"/>
        <stop offset="100%" stopColor="#B5A8FF" stopOpacity="0.95"/>
      </radialGradient>
      <radialGradient id="spec" cx="28%" cy="22%" r="20%">
        <stop offset="0%" stopColor="#fff" stopOpacity="0.95"/>
        <stop offset="100%" stopColor="#fff" stopOpacity="0"/>
      </radialGradient>
    </defs>
    <g>
      <circle cx="48" cy="48" r="30" fill="url(#bgCore)"/>
      <circle cx="48" cy="48" r="30" fill="url(#spec)"/>
      <circle cx="48" cy="48" r="30" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="1.4"/>
      <circle cx="48" cy="48" r="30" fill="none" stroke="rgba(2,6,23,.22)" strokeWidth="0.8"/>
      <ellipse cx="38" cy="34" rx="12" ry="8" fill="#fff" opacity=".55"/>
    </g>
  </svg>
);

/* --- Tradução de erros comuns de cadastro (Supabase/Firebase) --- */
function translateRegisterError(err: any): string {
  const raw = [
    err?.code,
    err?.error?.message,
    err?.error_description,
    err?.data?.message,
    err?.message,
  ]
    .filter(Boolean)
    .join(' | ')
    .toLowerCase();

  if (/email.*already|already.*in.*use|duplicate.*email/.test(raw)) {
    return 'Este email já está em uso.';
  }
  if (/invalid[-_\s]*email/.test(raw)) {
    return 'Email inválido.';
  }
  if (/password.*weak|weak.*password|least.*6|minimum.*6/.test(raw)) {
    return 'A senha deve ter pelo menos 6 caracteres.';
  }
  if (/rate.*limit|too.*many.*request/.test(raw)) {
    return 'Muitas tentativas. Tente novamente em alguns minutos.';
  }
  if (/network|failed\s*to\s*fetch|timeout|net::/i.test(raw)) {
    return 'Falha de rede. Verifique sua conexão.';
  }
  return 'Falha ao criar conta. Tente novamente.';
}

// Função para gerar senha segura
const generateSecurePassword = (): string => {
  const length = 16;
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*';
  let password = '';
  const array = new Uint32Array(length);
  window.crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length];
  }
  return password;
};

const CreateProfilePage: React.FC = () => {
  const { register, migrateGuestData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [useAutoPassword, setUseAutoPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Estados para WelcomeScreen
  const [showWelcome, setShowWelcome] = useState(false);
  const [preservedData, setPreservedData] = useState<PreservedData | undefined>(undefined);

  const basicValid = email.trim().length > 3 && password.length >= 6;

  const canSubmit = basicValid && !loading;

  // Extrair returnTo da URL se existir
  const searchParams = new URLSearchParams(location.search);
  const returnTo = searchParams.get('returnTo') || '/app';

  const handleGeneratePassword = () => {
    const newPassword = generateSecurePassword();
    setPassword(newPassword);
    setUseAutoPassword(true);
    setShowPwd(true);
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    } catch (err) {
      console.error('Falha ao copiar senha:', err);
    }
  };

  // Handler para Google One Tap
  const handleGoogleOneTap = async (response: any) => {
    try {
      mixpanel.track('Front-end: Google One Tap Iniciado');

      // O token JWT vem em response.credential
      const { data, error: authError } = await supabaseClient.auth.signInWithIdToken({
        provider: 'google',
        token: response.credential,
      });

      if (authError) throw authError;

      if (data.user) {
        mixpanel.track('Front-end: Google One Tap Concluído', { userId: data.user.id });
        fbq('CompleteRegistration', { value: 1, currency: 'BRL' });

        // Migrar dados guest
        const migrated = await migrateGuestData(data.user.id);

        // Mostrar WelcomeScreen se houver dados preservados
        if (
          (migrated.chatMessages ?? 0) > 0 ||
          (migrated.favorites ?? 0) > 0 ||
          (migrated.ringsDay ?? 0) > 0 ||
          migrated.meditationProgress
        ) {
          setPreservedData(migrated);
          setShowWelcome(true);
        } else {
          navigate(returnTo);
        }
      } else {
        navigate(returnTo);
      }
    } catch (err: any) {
      const translatedError = translateRegisterError(err);
      mixpanel.track('Front-end: Google One Tap Falhou', { reason: translatedError });
      setError(translatedError);
    }
  };

  // Inicializar Google One Tap
  useEffect(() => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!googleClientId || googleClientId.includes('your-google')) {
      console.warn('[CreateProfile] Google Client ID não configurado');
      return;
    }

    // Aguardar script Google carregar
    const initGoogleOneTap = () => {
      if (!window.google?.accounts?.id) {
        console.warn('[CreateProfile] Google Identity Services não carregado');
        return;
      }

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleOneTap,
        auto_select: false, // Não auto-select para permitir escolha
        cancel_on_tap_outside: true,
        context: 'signup',
      });

      // Mostrar One Tap prompt automaticamente
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed()) {
          console.info('[CreateProfile] One Tap não mostrado:', notification.getNotDisplayedReason());
        } else if (notification.isSkippedMoment()) {
          console.info('[CreateProfile] One Tap dismissed:', notification.getSkippedReason());
        }
      });
    };

    // Se script já carregou, inicializar agora
    if (window.google?.accounts?.id) {
      initGoogleOneTap();
    } else {
      // Aguardar script carregar
      const checkInterval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(checkInterval);
          initGoogleOneTap();
        }
      }, 100);

      // Timeout de segurança após 5s
      setTimeout(() => clearInterval(checkInterval), 5000);

      return () => clearInterval(checkInterval);
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setLoading(true);
    try {
      mixpanel.track('Front-end: Cadastro Iniciado', { email: email.trim() });

      // 1. Registrar usuário
      await register(email.trim(), password, '', '');

      // 2. Obter user recém-criado
      const { data: { user: newUser } } = await supabaseClient.auth.getUser();

      if (newUser) {
        mixpanel.track('Front-end: Cadastro Concluído', { userId: newUser.id });
        fbq('CompleteRegistration', { value: 1, currency: 'BRL' });

        // 3. Migrar dados guest
        const migrated = await migrateGuestData(newUser.id);

        // 4. Mostrar WelcomeScreen se houver dados preservados
        if (
          (migrated.chatMessages ?? 0) > 0 ||
          (migrated.favorites ?? 0) > 0 ||
          (migrated.ringsDay ?? 0) > 0 ||
          migrated.meditationProgress
        ) {
          setPreservedData(migrated);
          setShowWelcome(true);
        } else {
          // Sem dados preservados, redirecionar diretamente
          navigate(returnTo);
        }
      } else {
        // Fallback se não conseguir obter user
        navigate(returnTo);
      }
    } catch (err: any) {
      const translatedError = translateRegisterError(err);
      mixpanel.track('Front-end: Cadastro Falhou', { reason: translatedError });
      setError(translatedError);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError('');
    try {
      mixpanel.track('Front-end: Google Sign-up Iniciado');
      const { error: authError } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${returnTo}`,
          queryParams: {
            prompt: 'consent',
          },
        },
      });
      if (authError) throw authError;
      mixpanel.track('Front-end: Google Sign-up Iniciado com Sucesso');
      fbq('CompleteRegistration', { value: 1, currency: 'BRL' });

      // Nota: A migração será feita no callback OAuth via AuthContext
      // quando o usuário retornar após autorização
    } catch (err: any) {
      const translatedError = translateRegisterError(err);
      mixpanel.track('Front-end: Google Sign-up Falhou', { reason: translatedError });
      setError(translatedError);
    }
  };

  // Se deve mostrar WelcomeScreen, renderizá-lo
  if (showWelcome) {
    return (
      <WelcomeScreen
        preservedData={preservedData}
        onContinue={() => navigate(returnTo)}
      />
    );
  }

  // Formulário de signup normal
  return (
    <PhoneFrame backgroundImage="/images/login-background.webp">
      <div className="relative min-h-[100dvh] w-full overflow-hidden text-slate-900">
        <div className="relative flex flex-col items-center justify-center min-h-[100dvh] px-4 pt-[env(safe-area-inset-top)] pb-[calc(16px+env(safe-area-inset-bottom))] gap-8">
          {/* Logo no topo */}
          <div className="flex-shrink-0">
            <img
              src="/images/ECOTOPIA.webp"
              alt="Ecotopia"
              className="w-32 h-32 object-contain drop-shadow-lg"
            />
          </div>

          <motion.div
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="w-full max-w-md space-y-6 rounded-3xl border border-[var(--eco-line)] bg-white/60 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.04)] p-6 sm:p-8"
          >
            {/* Header */}
            <div className="text-center space-y-2">
              <h1 className="font-display text-2xl font-normal text-[var(--eco-text)]">
                Crie sua conta
              </h1>
              <p className="text-sm text-[var(--eco-muted)]">
                Leva menos de 30 segundos • Sempre gratuito
              </p>
            </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="sr-only" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="Seu email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  inputMode="email"
                  autoFocus
                  className="w-full h-12 rounded-xl border border-[var(--eco-line)] bg-white/80 backdrop-blur-sm px-4 text-base text-[var(--eco-text)] placeholder:text-[var(--eco-muted)] transition-all duration-300 ease-out focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--eco-accent)]/40"
                />
              </div>

              <div className="space-y-1">
                <label className="sr-only" htmlFor="password">Senha</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPwd ? 'text' : 'password'}
                    placeholder="Crie uma senha"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setUseAutoPassword(false);
                    }}
                    required
                    autoComplete="new-password"
                    disabled={useAutoPassword}
                    className="w-full h-12 rounded-xl border border-[var(--eco-line)] bg-white/80 backdrop-blur-sm px-4 pr-12 text-base text-[var(--eco-text)] placeholder:text-[var(--eco-muted)] transition-all duration-300 ease-out focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--eco-accent)]/40 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    className="absolute inset-y-0 right-1.5 my-1.5 flex items-center rounded-xl px-2 text-[var(--eco-muted)] transition-all duration-300 ease-out hover:bg-[var(--eco-bubble)] hover:text-[var(--eco-text)] focus:outline-none focus:ring-2 focus:ring-[var(--eco-accent)]/40"
                    aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
                    aria-pressed={showPwd}
                    title={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Botão gerar senha automaticamente */}
                {!useAutoPassword && (
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-xs text-[var(--eco-accent)] hover:text-[var(--eco-user)] transition-colors duration-200 underline underline-offset-2"
                  >
                    Gerar senha automaticamente
                  </button>
                )}

                {/* Senha gerada - mostrar e copiar */}
                {useAutoPassword && (
                  <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-green-50 border border-green-200">
                    <p className="text-xs text-green-700 font-medium">
                      Senha gerada! {copiedPassword ? '✓ Copiada' : 'Guarde em local seguro'}
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      className="text-xs text-green-700 hover:text-green-900 underline underline-offset-2 transition-colors"
                    >
                      {copiedPassword ? '✓ Copiada' : 'Copiar'}
                    </button>
                  </div>
                )}

                {!useAutoPassword && password && password.length < 6 && (
                  <p className="text-xs text-[var(--eco-muted)] mt-1">
                    Mínimo de 6 caracteres
                  </p>
                )}
              </div>
            </div>

            <div role="alert" id="register-error" aria-live="assertive" className="min-h-[1.25rem] text-center text-sm text-rose-500">
              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {error}
                </motion.p>
              )}
            </div>

            <div className="space-y-4">
              <button
                type="submit"
                disabled={!canSubmit}
                className={[
                  'flex h-12 w-full items-center justify-center rounded-xl text-sm font-normal transition-all duration-300 ease-out',
                  'bg-eco-baby text-white shadow-[0_4px_30px_rgba(0,0,0,0.04)]',
                  'hover:bg-gradient-to-r hover:from-eco-babyDark hover:to-eco-baby hover:-translate-y-0.5 hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)]',
                  'focus:outline-none focus:ring-2 focus:ring-eco-baby/40 focus:ring-offset-2',
                  'active:translate-y-0',
                  'disabled:cursor-not-allowed disabled:opacity-60 disabled:transform-none',
                ].join(' ')}
              >
                {loading ? 'Criando…' : 'Criar conta'}
              </button>

              {/* Divider "ou" */}
              <div className="relative flex items-center gap-3">
                <div className="flex-1 h-px bg-[var(--eco-line)]" />
                <span className="text-xs text-[var(--eco-muted)]">ou</span>
                <div className="flex-1 h-px bg-[var(--eco-line)]" />
              </div>

              <button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={loading}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[var(--eco-line)] bg-white/80 backdrop-blur-sm text-sm font-normal text-[var(--eco-text)] shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all duration-300 ease-out hover:bg-white hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] focus:outline-none focus:ring-2 focus:ring-[var(--eco-accent)]/40 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {loading ? 'Entrando…' : 'Continuar com Google'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            Já possui uma conta?{' '}
            <button
              type="button"
              className="text-slate-800 font-medium underline underline-offset-2 hover:text-slate-900"
              onClick={() => navigate('/login')}
            >
              Entrar
            </button>
          </div>
        </motion.div>
        </div>
      </div>
    </PhoneFrame>
  );
};

export default CreateProfilePage;

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

  if (/email.*already|already.*in.*use|duplicate.*email|already.*registered|user.*already/.test(raw)) {
    return 'Este email já está em uso. Tente entrar com ele.';
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
  const { register, migrateGuestData, signOut, user, userName } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [useAutoPassword, setUseAutoPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Estados para WelcomeScreen e confirmação de email
  const [showWelcome, setShowWelcome] = useState(false);
  const [preservedData, setPreservedData] = useState<PreservedData | undefined>(undefined);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [confirmedEmail, setConfirmedEmail] = useState('');
  const [signingOut, setSigningOut] = useState(false);

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
      // Se veio de compra do protocolo sono, passar emailRedirectTo para que o link
      // de confirmação do Supabase leve direto à página de claim após a verificação.
      const emailRedirectTo = returnTo.includes('/sono/')
        ? `${window.location.origin}${returnTo}`
        : undefined;
      const { needsConfirmation } = await register(email.trim(), password, '', '', emailRedirectTo);

      // 2. Supabase requer confirmação de email → mostrar tela de aviso
      if (needsConfirmation) {
        setConfirmedEmail(email.trim());
        setShowEmailConfirmation(true);
        mixpanel.track('Front-end: Cadastro Pendente Confirmação', { email: email.trim() });
        return;
      }

      // 3. Conta criada e sessão ativa → obter user e prosseguir
      const { data: { user: newUser } } = await supabaseClient.auth.getUser();

      if (newUser) {
        mixpanel.track('Front-end: Cadastro Concluído', { userId: newUser.id });
        fbq('CompleteRegistration', { value: 1, currency: 'BRL' });

        const migrated = await migrateGuestData(newUser.id);

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

  // Guarda: usuário já está logado → não mostrar formulário de cadastro
  if (user) {
    const displayName = userName || user.email || 'sua conta';
    return (
      <PhoneFrame backgroundImage="/images/login-background.webp">
        <div className="relative flex flex-col items-center justify-center min-h-[100dvh] px-4 pt-[env(safe-area-inset-top)] pb-[calc(16px+env(safe-area-inset-bottom))]">
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            className="w-full max-w-sm"
          >
            <div className="rounded-3xl border border-white/30 bg-white/88 backdrop-blur-xl shadow-[0_12px_48px_rgba(0,0,0,0.14)] overflow-hidden">
              <div className="flex flex-col items-center px-6 pt-7 pb-5 text-center"
                style={{ background: 'linear-gradient(160deg, #FDF8F2 0%, #FAF6F0 60%, #FFFFFF 100%)' }}>
                <div className="text-3xl mb-2">👤</div>
                <h1 className="font-display text-[1.35rem] font-bold leading-tight text-eco-text">
                  Você já está logado
                </h1>
                <p className="text-[12px] text-eco-muted mt-1">
                  Sessão de <span className="font-medium text-eco-text">{displayName}</span>
                </p>
              </div>
              <div className="px-6 pb-6 pt-4 space-y-3">
                <button
                  type="button"
                  onClick={() => navigate(returnTo)}
                  className="flex h-12 w-full items-center justify-center rounded-xl text-[15px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, #4A3F35 0%, #38322A 100%)', boxShadow: '0 4px 20px rgba(56,50,42,0.28)' }}
                >
                  Continuar como {userName || 'eu'}
                </button>
                <button
                  type="button"
                  disabled={signingOut}
                  onClick={async () => {
                    setSigningOut(true);
                    try { await signOut(); } finally { setSigningOut(false); }
                  }}
                  className="flex h-12 w-full items-center justify-center rounded-xl border border-[var(--eco-line)] bg-white text-[14px] font-medium text-eco-text transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {signingOut ? 'Saindo…' : 'Sair e criar nova conta'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </PhoneFrame>
    );
  }

  // Tela de confirmação de email
  if (showEmailConfirmation) {
    return (
      <PhoneFrame backgroundImage="/images/login-background.webp">
        <div className="relative flex flex-col items-center justify-center min-h-[100dvh] px-4 pt-[env(safe-area-inset-top)] pb-[calc(16px+env(safe-area-inset-bottom))]">
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            className="w-full max-w-sm"
          >
            <div className="rounded-3xl border border-white/30 bg-white/88 backdrop-blur-xl shadow-[0_12px_48px_rgba(0,0,0,0.14)] overflow-hidden">
              <div className="flex flex-col items-center px-6 pt-7 pb-5 text-center"
                style={{ background: 'linear-gradient(160deg, #FDF8F2 0%, #FAF6F0 60%, #FFFFFF 100%)' }}>
                <div className="text-3xl mb-2">📬</div>
                <h1 className="font-display text-[1.35rem] font-bold leading-tight text-eco-text">
                  Confirme seu email
                </h1>
                <p className="text-[12px] text-eco-muted mt-1">
                  Link enviado para{' '}
                  <span className="font-medium text-eco-text">{confirmedEmail}</span>
                </p>
              </div>
              <div className="px-6 pb-6 pt-4 space-y-4 text-center">
                <p className="text-[13px] text-eco-muted leading-relaxed">
                  Clique no link para ativar sua conta.
                  {returnTo.includes('/sono/') && ' Seu acesso ao Protocolo Sono será liberado automaticamente.'}
                </p>
                <p className="text-[11px] text-eco-muted/70">
                  Não recebeu? Verifique a pasta de spam.
                </p>
                {returnTo.includes('/sono/') && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
                    Acesso ao Protocolo Sono reservado — liberado após confirmação.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`)}
                  className="flex h-12 w-full items-center justify-center rounded-xl text-[15px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, #4A3F35 0%, #38322A 100%)', boxShadow: '0 4px 20px rgba(56,50,42,0.28)' }}
                >
                  Já confirmei — Entrar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </PhoneFrame>
    );
  }

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
        <div className="relative flex flex-col items-center justify-center min-h-[100dvh] px-4 pt-[env(safe-area-inset-top)] pb-[calc(16px+env(safe-area-inset-bottom))]">

          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            className="w-full max-w-sm"
          >
            {/* Card principal */}
            <div className="rounded-3xl border border-white/30 bg-white/88 backdrop-blur-xl shadow-[0_12px_48px_rgba(0,0,0,0.14)] overflow-hidden">

              {/* Topo: logo + título */}
              <div className="flex flex-col items-center px-6 pt-7 pb-5"
                style={{ background: 'linear-gradient(160deg, #FDF8F2 0%, #FAF6F0 60%, #FFFFFF 100%)' }}>
                <img
                  src="/images/ECOTOPIA.webp"
                  alt="Ecotopia"
                  className="w-16 h-16 object-contain mb-3"
                  loading="lazy"
                />
                <h1 className="font-display text-[1.35rem] font-bold leading-tight text-eco-text">
                  Crie sua conta
                </h1>
                <p className="text-[12px] text-eco-muted mt-1 font-primary">
                  Menos de 30 segundos · sempre gratuito
                </p>
              </div>

              <div className="px-6 pb-6 space-y-4">
                {/* Google primeiro */}
                <button
                  type="button"
                  onClick={handleGoogleSignUp}
                  disabled={loading}
                  className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-[var(--eco-line)] bg-white text-[14px] font-medium text-eco-text shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[var(--eco-accent)]/40"
                >
                  <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {loading ? 'Aguarde…' : 'Continuar com Google'}
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3" aria-hidden="true">
                  <span className="h-px flex-1 bg-[var(--eco-line)]" />
                  <span className="text-[10px] uppercase tracking-[0.4em] text-eco-muted">ou cadastre com email</span>
                  <span className="h-px flex-1 bg-[var(--eco-line)]" />
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-3" noValidate>
                  <div>
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
                      className="w-full h-12 rounded-xl border border-[var(--eco-line)] bg-white/90 px-4 text-[15px] text-eco-text placeholder:text-eco-muted transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-eco-baby/40"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-semibold tracking-wide text-eco-muted uppercase" htmlFor="password">
                        Senha
                      </label>
                      {!useAutoPassword && (
                        <button
                          type="button"
                          onClick={handleGeneratePassword}
                          className="text-[12px] font-medium text-eco-user hover:text-eco-text transition-colors duration-200"
                        >
                          Gerar senha
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPwd ? 'text' : 'password'}
                        placeholder="Mínimo 6 caracteres"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setUseAutoPassword(false); }}
                        required
                        autoComplete="new-password"
                        disabled={useAutoPassword}
                        className="w-full h-12 rounded-xl border border-[var(--eco-line)] bg-white/90 px-4 pr-12 text-[15px] text-eco-text placeholder:text-eco-muted/50 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-eco-baby/40 disabled:opacity-60"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((s) => !s)}
                        className="absolute inset-y-0 right-0 flex items-center px-3.5 text-eco-muted hover:text-eco-text transition-colors duration-200"
                        aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
                        aria-pressed={showPwd}
                      >
                        {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>

                    {useAutoPassword && (
                      <div className="mt-2 flex items-center justify-between gap-2 px-3 py-2 rounded-lg"
                        style={{ background: 'rgba(198,169,149,0.12)', border: '1px solid rgba(198,169,149,0.25)' }}>
                        <p className="text-[11px] font-medium text-eco-user">
                          {copiedPassword ? '✓ Senha copiada!' : 'Guarde em local seguro'}
                        </p>
                        <button
                          type="button"
                          onClick={handleCopyPassword}
                          className="text-[11px] font-semibold text-eco-user hover:text-eco-text underline underline-offset-2 transition-colors"
                        >
                          {copiedPassword ? '✓' : 'Copiar'}
                        </button>
                      </div>
                    )}

                    {!useAutoPassword && password && password.length < 6 && (
                      <p className="text-[11px] text-eco-muted mt-1.5">Mínimo de 6 caracteres</p>
                    )}
                  </div>

                  {/* Feedback */}
                  <div className="min-h-[1rem]">
                    <div role="alert" id="register-error" aria-live="assertive">
                      {error && (
                        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                          className="text-[12px] text-rose-500 text-center">
                          {error}
                        </motion.p>
                      )}
                    </div>
                  </div>

                  {/* CTA principal */}
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="flex h-12 w-full items-center justify-center rounded-xl text-[15px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-eco-text/30 focus:ring-offset-2"
                    style={{
                      background: 'linear-gradient(135deg, #4A3F35 0%, #38322A 100%)',
                      boxShadow: canSubmit ? '0 4px 20px rgba(56,50,42,0.30)' : 'none',
                      opacity: canSubmit ? 1 : 0.45,
                      cursor: canSubmit ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {loading ? 'Criando…' : 'Criar conta'}
                  </button>
                </form>
              </div>
            </div>

            {/* Link abaixo do card */}
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={() => navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`)}
                disabled={loading}
                className="text-[13px] font-medium text-eco-text/70 hover:text-eco-text transition-colors duration-200 disabled:opacity-60"
                style={{ textShadow: '0 1px 4px rgba(255,255,255,0.8)' }}
              >
                Já tem conta?{' '}
                <span className="font-semibold text-eco-text" style={{ textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                  Entrar
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </PhoneFrame>
  );
};

export default CreateProfilePage;

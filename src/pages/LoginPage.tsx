// src/pages/LoginPage.tsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useMatch } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import PhoneFrame from '../components/PhoneFrame';
import { useAuth } from '../contexts/AuthContext';
import TourInicial from '../components/TourInicial';
import mixpanel from '../lib/mixpanel';
import { supabase } from '@/lib/supabaseClient';

/* Divisor com traço mais marcado */
const Divider: React.FC<{ label?: string }> = ({ label = 'ou' }) => (
  <div className="flex items-center gap-3" aria-hidden="true">
    <span className="h-px flex-1 bg-[var(--eco-line)]" />
    <span className="text-xs uppercase tracking-[0.4em] text-[var(--eco-muted)] font-normal">
      {label}
    </span>
    <span className="h-px flex-1 bg-[var(--eco-line)]" />
  </div>
);

/** Ícone Google (SVG oficial simplificado) */
const GoogleIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12S17.4 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C33.6 6 29 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c10.5 0 19.5-7.6 19.5-20 0-1.2-.1-2.4-.3-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.4 16 18.8 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C33.6 6 29 4 24 4 16.1 4 9.2 8.6 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.7 13.5-4.7l-6.2-5.1C29.3 36 26.8 37 24 37c-5.3 0-9.7-3.1-11.6-7.5L5.6 34.2C8.5 40.3 15 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1 2.9-3.8 5-7.3 5-3 0-5.6-1.9-6.5-4.6l-6.6 5C17 37 20.3 39 24 39c9 0 15.5-6.1 15.5-15.5 0-1.2-.1-2.4-.3-3.5z"/>
  </svg>
);

/* ---- Tradução das mensagens de erro ---- */
function translateAuthError(err: any): string {
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

  if (
    /invalid\s*login\s*credentials/.test(raw) ||
    /invalid[-_\s]*credential/.test(raw) ||
    /invalid[-_\s]*credentials/.test(raw) ||
    /wrong[-_\s]*password/.test(raw) ||
    /invalid\s*password/.test(raw)
  )
    return 'Email ou senha incorretos.';

  if (/invalid[-_\s]*email/.test(raw)) return 'Email inválido.';
  if (/user.*not.*found|no\s*user/.test(raw)) return 'Não encontramos uma conta com este email.';
  if (/too.*many.*request|rate.*limit/.test(raw))
    return 'Muitas tentativas. Tente novamente em alguns minutos.';
  if (/network|failed\s*to\s*fetch|timeout|net::/i.test(raw))
    return 'Falha de rede. Verifique sua conexão.';
  if (/user.*disabled|account.*disabled/.test(raw)) return 'Esta conta foi desativada.';
  if (/least.*6|minimum.*6|password.*short/.test(raw))
    return 'A senha deve ter pelo menos 6 caracteres.';
  return 'Não foi possível entrar. Tente novamente.';
}

const LoginPage: React.FC = () => {
  const { signIn, signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isTourPath = Boolean(useMatch('/login/tour'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isTourActive, setIsTourActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const canSubmit = email.trim().length > 3 && password.length >= 6 && !loading;

  useEffect(() => {
    if (!user) return;
    navigate('/app');
  }, [user, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const wantsTour =
      params.get('tour') === '1' ||
      location.hash?.toLowerCase() === '#tour' ||
      isTourPath ||
      Boolean((location.state as any)?.showTour);
    if (wantsTour) setIsTourActive(true);
  }, [location.search, location.hash, location.state, isTourPath]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = isTourActive ? 'hidden' : prev || '';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isTourActive]);

  const closeTour = () => {
    setIsTourActive(false);
    if (isTourPath) {
      navigate('/', { replace: true });
      return;
    }
    if (location.search || location.hash || (location.state as any)?.showTour) {
      navigate('/', { replace: true, state: {} });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setLoading(true);
    try {
      mixpanel.track('Front-end: Login Iniciado', { method: 'password', email: email.trim() });
      await signIn(email.trim(), password);
      mixpanel.track('Front-end: Login Concluído', { method: 'password' });
    } catch (err: any) {
      setError(translateAuthError(err));
      mixpanel.track('Front-end: Login Falhou', { method: 'password', reason: translateAuthError(err) });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      mixpanel.track('Front-end: Login Iniciado', { method: 'google' });
      await signInWithGoogle();
      mixpanel.track('Front-end: Login Concluído', { method: 'google' });
    } catch (err: any) {
      setLoading(false);
      setError(translateAuthError(err));
      mixpanel.track('Front-end: Login Falhou', { method: 'google', reason: translateAuthError(err) });
    }
  };

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setForgotMessage('');
      setForgotError('Digite seu e-mail');
      return;
    }
    setForgotMessage('');
    setForgotError('');
    setForgotLoading(true);
    try {
      const envAppUrl = import.meta.env.VITE_APP_URL;
      const fallbackOrigin =
        typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
      const baseUrl = (envAppUrl || fallbackOrigin).replace(/\/+$/, '');
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${baseUrl}/reset-senha`,
      });
      if (resetError) throw resetError;
      setForgotMessage('Enviamos um link para redefinir sua senha. Confira seu e-mail.');
    } catch (err: any) {
      setForgotError(translateAuthError(err));
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <PhoneFrame>
      <div className="relative min-h-[100dvh] overflow-hidden bg-white text-slate-900">
        <div className="relative grid min-h-[100dvh] place-items-center px-4 pt-[env(safe-area-inset-top)] pb-[calc(16px+env(safe-area-inset-bottom))]">
          {isTourActive && (
            <TourInicial onClose={closeTour} reason="login" nextPath="/" />
          )}

          <motion.div
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="w-full max-w-md space-y-8 rounded-3xl border border-[var(--eco-line)] bg-white/60 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.04)] p-6 sm:p-8"
          >
            {/* Header */}
            <div className="space-y-4 text-center">
              <span
                className="mx-auto inline-flex items-center justify-center rounded-full border border-[var(--eco-line)] bg-white/50 backdrop-blur-sm px-4 py-1 text-[13.5px] font-normal text-[var(--eco-muted)]"
                style={{ fontFamily: 'var(--font-primary)' }}
              >
                Autoconhecimento Guiado
              </span>
              <h1
                className="text-3xl font-normal tracking-tight sm:text-4xl text-[var(--eco-text)]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                ECO
              </h1>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="sr-only" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    inputMode="email"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? 'login-error' : undefined}
                    className="w-full h-12 rounded-xl border border-[var(--eco-line)] bg-white/80 backdrop-blur-sm px-4 text-base text-[var(--eco-text)] placeholder:text-[var(--eco-muted)] transition-all duration-300 ease-out focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--eco-accent)]/40"
                  />
                </div>

                <div className="space-y-1">
                  <label className="sr-only" htmlFor="password">
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? 'login-error' : undefined}
                      className="w-full h-12 rounded-xl border border-[var(--eco-line)] bg-white/80 backdrop-blur-sm px-4 pr-12 text-base text-[var(--eco-text)] placeholder:text-[var(--eco-muted)] transition-all duration-300 ease-out focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--eco-accent)]/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-1.5 my-1.5 flex items-center rounded-xl px-2 text-[var(--eco-muted)] transition-all duration-300 ease-out hover:bg-[var(--eco-bubble)] hover:text-[var(--eco-text)] focus:outline-none focus:ring-2 focus:ring-[var(--eco-accent)]/40"
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      aria-pressed={showPassword}
                      title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={forgotLoading}
                  title="Enviaremos um link para o seu e-mail"
                  className="text-sm font-normal text-[var(--eco-muted)] underline-offset-4 transition-all duration-300 ease-out hover:text-[var(--eco-text)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {forgotLoading ? 'Enviando…' : 'Redefinir senha'}
                </button>
              </div>

              <div role="alert" id="login-error" aria-live="assertive" className="min-h-[1.25rem] text-center text-sm text-rose-500">
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
                    'bg-[var(--eco-user)] text-white shadow-[0_4px_30px_rgba(0,0,0,0.04)]',
                    'hover:bg-gradient-to-r hover:from-[var(--eco-user)] hover:to-[var(--eco-accent)] hover:-translate-y-0.5 hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)]',
                    'focus:outline-none focus:ring-2 focus:ring-[var(--eco-accent)]/40 focus:ring-offset-2',
                    'active:translate-y-0',
                    'disabled:cursor-not-allowed disabled:opacity-60 disabled:transform-none',
                  ].join(' ')}
                >
                  {loading ? 'Entrando…' : 'Entrar'}
                </button>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[var(--eco-line)] bg-white/80 backdrop-blur-sm text-sm font-normal text-[var(--eco-text)] shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all duration-300 ease-out hover:bg-white hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] focus:outline-none focus:ring-2 focus:ring-[var(--eco-accent)]/40 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <GoogleIcon />
                  Entrar com Google
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center rounded-xl border border-[var(--eco-line)] bg-white/80 backdrop-blur-sm text-sm font-normal text-[var(--eco-text)] shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all duration-300 ease-out hover:bg-white hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] focus:outline-none focus:ring-2 focus:ring-[var(--eco-accent)]/40 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Criar uma nova conta
                </button>

                <Divider />

                <button
                  type="button"
                  onClick={() => setIsTourActive(true)}
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center rounded-xl border border-[var(--eco-line)] bg-white/80 backdrop-blur-sm text-sm font-normal text-[var(--eco-text)] shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all duration-300 ease-out hover:bg-white hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] focus:outline-none focus:ring-2 focus:ring-[var(--eco-accent)]/40 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Iniciar Tour
                </button>

                <div role="status" aria-live="polite" className="min-h-[1.25rem] text-center text-sm">
                  {forgotMessage && (
                    <motion.p className="text-emerald-500" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      {forgotMessage}
                    </motion.p>
                  )}
                  {forgotError && !forgotMessage && (
                    <motion.p className="text-rose-500" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      {forgotError}
                    </motion.p>
                  )}
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </PhoneFrame>
  );
};

export default LoginPage;

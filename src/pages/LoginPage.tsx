// src/pages/LoginPage.tsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useMatch } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import PhoneFrame from '../components/PhoneFrame';
import { useAuth } from '../contexts/AuthContext';
import TourInicial from '../components/TourInicial';
import EcoBubbleOneEye from '../components/EcoBubbleOneEye';
import mixpanel from '../lib/mixpanel';
import { supabase } from '@/lib/supabase';

/* Divisor com traço mais marcado */
const Divider: React.FC<{ label?: string }> = ({ label = 'ou' }) => (
  <div className="flex items-center gap-3" aria-hidden="true">
    <span className="h-px flex-1 bg-slate-500/20 dark:bg-white/15" />
    <span className="text-xs uppercase tracking-[0.4em] text-slate-500/80 dark:text-white/60">
      {label}
    </span>
    <span className="h-px flex-1 bg-slate-500/20 dark:bg-white/15" />
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
      navigate('/login', { replace: true });
      return;
    }
    if (location.search || location.hash || (location.state as any)?.showTour) {
      navigate('/login', { replace: true, state: {} });
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
      <div
        className="relative min-h-[100dvh] overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 text-slate-900 dark:text-slate-100"
      >
        <div
          className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-400/30 blur-3xl dark:bg-blue-500/20"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-36 right-[-10%] h-96 w-96 rounded-full bg-purple-400/25 blur-3xl dark:bg-purple-500/20"
          aria-hidden="true"
        />

        <div className="relative grid min-h-[100dvh] place-items-center px-4 pt-[env(safe-area-inset-top)] pb-[calc(16px+env(safe-area-inset-bottom))]">
          {isTourActive && <TourInicial onClose={closeTour} onFinish={closeTour as any} />}

          <motion.div
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={[
              'w-full max-w-md space-y-8 rounded-3xl p-6 sm:p-8',
              'bg-white/55 dark:bg-white/10 backdrop-blur-2xl',
              'border border-white/25 dark:border-white/10 shadow-2xl ring-1 ring-black/5 dark:ring-white/5',
            ].join(' ')}
          >
            {/* Header */}
            <div className="space-y-4 text-center">
              <span className="inline-flex items-center justify-center gap-2 rounded-full bg-white/60 px-4 py-1 text-sm font-medium text-slate-700 backdrop-blur-md ring-1 ring-black/5 dark:bg-white/10 dark:text-slate-100 dark:ring-white/10">
                <EcoBubbleOneEye variant="icon" size={18} state="focus" />
                Autoconhecimento Guiado
              </span>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">ECO</h1>
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
                    className={[
                      'w-full h-12 rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/10 px-4 text-base text-slate-900 placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-400/80',
                      'shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#007AFF] dark:shadow-none',
                    ].join(' ')}
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
                      className={[
                        'w-full h-12 rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/10 px-4 pr-12 text-base text-slate-900 placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-400/80',
                        'shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#007AFF] dark:shadow-none',
                      ].join(' ')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-1.5 my-1.5 flex items-center rounded-xl px-2 text-slate-600 transition hover:bg-white/70 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 dark:text-slate-200 dark:hover:bg-white/15 dark:hover:text-white"
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
                  className="text-sm font-medium text-slate-600 underline-offset-4 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-300 dark:hover:text-white"
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
                    'flex h-12 w-full items-center justify-center rounded-2xl bg-[#007AFF] text-sm font-semibold text-white shadow-lg transition-colors',
                    'hover:bg-[#1a84ff] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 focus:ring-offset-2 focus:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-60',
                  ].join(' ')}
                >
                  {loading ? 'Entrando…' : 'Entrar'}
                </button>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className={[
                    'inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white/60 text-sm font-semibold text-slate-900 transition-colors',
                    'ring-1 ring-black/5 backdrop-blur-md hover:bg-white/75 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/40 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/10 dark:text-slate-100 dark:ring-white/10 dark:hover:bg-white/15',
                  ].join(' ')}
                >
                  <GoogleIcon />
                  Entrar com Google
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  disabled={loading}
                  className={[
                    'flex h-12 w-full items-center justify-center rounded-2xl bg-white/60 text-sm font-semibold text-slate-900 transition-colors',
                    'ring-1 ring-black/5 backdrop-blur-md hover:bg-white/75 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/40 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/10 dark:text-slate-100 dark:ring-white/10 dark:hover:bg-white/15',
                  ].join(' ')}
                >
                  Criar uma nova conta
                </button>

                <Divider />

                <button
                  type="button"
                  onClick={() => setIsTourActive(true)}
                  disabled={loading}
                  className={[
                    'flex h-12 w-full items-center justify-center rounded-2xl bg-white/60 text-sm font-semibold text-slate-900 transition-colors',
                    'ring-1 ring-black/5 backdrop-blur-md hover:bg-white/75 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/40 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/10 dark:text-slate-100 dark:ring-white/10 dark:hover:bg-white/15',
                  ].join(' ')}
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

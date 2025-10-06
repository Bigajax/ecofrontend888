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
  <div className="relative my-4 select-none" aria-hidden="true">
    <div className="h-px w-full bg-slate-300/70" />
    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] tracking-[0.14em] text-slate-500">
      {label}
    </span>
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
      <div className="flex h-full items-center justify-center px-6 py-10 bg-gradient-to-br from-slate-50 via-white to-slate-100">
        {isTourActive && <TourInicial onClose={closeTour} onFinish={closeTour as any} />}

        <motion.div
          initial={{ y: 6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className={[
            'w-full max-w-sm rounded-[28px] p-8 md:p-10',
            'bg-white/35 backdrop-blur-2xl',
            'border border-white/70 ring-1 ring-slate-900/10',
            'shadow-[0_24px_80px_rgba(2,6,23,0.18)]',
          ].join(' ')}
        >
          {/* Header */}
          <div className="text-center space-y-3">
            <h1 className="text-4xl md:text-[38px] leading-none font-semibold tracking-[-0.03em] text-slate-900 drop-shadow-[0_1px_0_rgba(255,255,255,0.65)]">
              ECO
            </h1>

            <div className="w-full flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full pl-2.5 pr-3 py-1.5 bg-white/75 backdrop-blur-xl border border-white/80 ring-1 ring-slate-900/5 shadow-[0_8px_24px_rgba(2,6,23,0.12)]">
                <span className="shrink-0 inline-flex">
                  <EcoBubbleOneEye variant="icon" size={16} state="focus" />
                </span>
                <span className="text-[14px] md:text-[15px] leading-none font-semibold text-slate-800">
                  Autoconhecimento guiado
                </span>
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
            <label className="sr-only" htmlFor="email">Email</label>
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
              className={[
                'w-full h-12 rounded-2xl px-4',
                'bg-white/70 backdrop-blur-xl',
                'border border-white/80 ring-1 ring-slate-900/5',
                'text-slate-900 placeholder:text-slate-400',
                'shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]',
                'focus:outline-none focus:ring-2 focus:ring-slate-700/10',
              ].join(' ')}
            />

            <label className="sr-only" htmlFor="password">Senha</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className={[
                  'w-full h-12 rounded-2xl px-4 pr-11',
                  'bg-white/70 backdrop-blur-xl',
                  'border border-white/80 ring-1 ring-slate-900/5',
                  'text-slate-900 placeholder:text-slate-400',
                  'shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]',
                  'focus:outline-none focus:ring-2 focus:ring-slate-700/10',
                ].join(' ')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-1.5 my-1.5 px-2 flex items-center rounded-xl text-slate-700 hover:text-slate-900 hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-slate-700/10"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Redefinir senha (link centralizado) */}
            <div className="flex justify-center mt-1">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={forgotLoading}
                title="Enviaremos um link para o seu e-mail"
                className="px-2 py-1 text-[13px] font-medium text-slate-600 hover:text-slate-900 underline underline-offset-2 disabled:opacity-60"
              >
                {forgotLoading ? 'Enviando…' : 'Redefinir senha'}
              </button>
            </div>

            {/* Mensagem de erro acessível */}
            <div role="status" aria-live="polite" className="min-h-[1rem]">
              {error && (
                <motion.p className="text-rose-600 text-sm text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {error}
                </motion.p>
              )}
            </div>

            {/* Actions */}
            <div className="pt-1 space-y-4">
              {/* Entrar – azul Apple */}
              <button
                type="submit"
                disabled={!canSubmit}
                className={[
                  'w-full h-11 rounded-2xl font-semibold text-white',
                  'bg-[#007aff] hover:bg-[#1a84ff] active:bg-[#0466d6]',
                  'shadow-[0_10px_28px_rgba(0,122,255,0.35)]',
                  'disabled:opacity-60 active:translate-y-[0.5px]',
                  'focus:outline-none focus:ring-2 focus:ring-[#007aff]/30',
                ].join(' ')}
              >
                {loading ? 'Entrando…' : 'Entrar'}
              </button>

              {/* Google – branco com ícone e label “Entrar com Google” */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className={[
                  'w-full h-11 rounded-2xl font-semibold',
                  'bg-white text-slate-900',
                  'border border-slate-200 ring-1 ring-slate-900/5',
                  'shadow-[0_10px_28px_rgba(2,6,23,0.10)]',
                  'hover:bg-slate-50 active:translate-y-[0.5px]',
                  'focus:outline-none focus:ring-2 focus:ring-slate-700/10',
                  'inline-flex items-center justify-center gap-2',
                ].join(' ')}
              >
                <GoogleIcon />
                Entrar com Google
              </button>

              {/* Criar uma nova conta */}
              <button
                type="button"
                onClick={() => navigate('/register')}
                disabled={loading}
                className={[
                  'w-full h-11 rounded-2xl font-semibold',
                  'bg-white/70 backdrop-blur-xl',
                  'border border-white/80 ring-1 ring-slate-900/5',
                  'text-slate-900 shadow-[0_10px_28px_rgba(2,6,23,0.10)]',
                  'hover:bg-white/80 active:translate-y-[0.5px]',
                  'focus:outline-none focus:ring-2 focus:ring-slate-700/10',
                ].join(' ')}
              >
                Criar uma nova conta
              </button>

              <Divider />

              {/* Iniciar Tour (mantido) */}
              <button
                type="button"
                onClick={() => setIsTourActive(true)}
                disabled={loading}
                className={[
                  'w-full h-11 rounded-2xl font-semibold',
                  'bg-white/70 backdrop-blur-xl',
                  'border border-white/80 ring-1 ring-slate-900/5',
                  'text-slate-900 shadow-[0_10px_28px_rgba(2,6,23,0.10)]',
                  'hover:bg-white/80 active:translate-y-[0.5px]',
                  'focus:outline-none focus:ring-2 focus:ring-slate-700/10',
                ].join(' ')}
              >
                Iniciar Tour
              </button>

              {/* feedback do “Redefinir senha” */}
              <div role="status" aria-live="polite" className="min-h-[1.25rem] text-center">
                {forgotMessage && (
                  <motion.p className="text-emerald-600 text-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {forgotMessage}
                  </motion.p>
                )}
                {forgotError && !forgotMessage && (
                  <motion.p className="text-rose-600 text-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {forgotError}
                  </motion.p>
                )}
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </PhoneFrame>
  );
};

export default LoginPage;

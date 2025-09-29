// src/pages/LoginPage.tsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useMatch } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import PhoneFrame from '../components/PhoneFrame';
import { useAuth } from '../contexts/AuthContext';
import TourInicial from '../components/TourInicial';
import EcoBubbleOneEye from '../components/EcoBubbleOneEye';
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

/* ---- Tradução das mensagens de erro para PT-BR (cobre Supabase/Firebase) ---- */
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
      await signIn(email.trim(), password);
    } catch (err: any) {
      setError(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setLoading(false);
      setError(translateAuthError(err));
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
        typeof window !== 'undefined' && window.location?.origin
          ? window.location.origin
          : '';
      const baseUrl = (envAppUrl || fallbackOrigin).replace(/\/+$/, '');

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        trimmedEmail,
        {
          redirectTo: `${baseUrl}/reset-senha`,
        },
      );

      if (resetError) {
        throw resetError;
      }

      setForgotMessage('Enviamos um link para redefinir sua senha. Confira seu e-mail.');
    } catch (err: any) {
      setForgotError(translateAuthError(err));
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <PhoneFrame>
      {/* fundo leve para evidenciar o glass */}
      <div className="flex h-full items-center justify-center px-6 py-10 bg-gradient-to-br from-slate-50 via-white to-slate-100">
        {isTourActive && <TourInicial onClose={closeTour} onFinish={closeTour} />}

        <motion.div
          initial={{ y: 6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className={[
            // GLASSMORPHISM CARD 💎 (mais marcado)
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
              {/* Pílula mais “Apple” e com traço forte */}
              <span className="inline-flex items-center gap-2 rounded-full pl-2.5 pr-3 py-1.5 bg-white/75 backdrop-blur-xl border border-white/80 ring-1 ring-slate-900/5 shadow-[0_8px_24px_rgba(2,6,23,0.12)]">
                <span className="shrink-0 inline-flex"><EcoBubbleOneEye variant="icon" size={16} state="focus" /></span>
                <span className="text-[14px] md:text-[15px] leading-none font-semibold text-slate-800">
                  Autoconhecimento guiado
                </span>
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
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
              className={[
                'w-full h-12 rounded-2xl px-4',
                'bg-white/70 backdrop-blur-xl',
                'border border-white/80 ring-1 ring-slate-900/5',
                'text-slate-900 placeholder:text-slate-400',
                'shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]',
                'focus:outline-none focus:ring-2 focus:ring-slate-700/10',
              ].join(' ')}
            />

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

            {/* Mensagem de erro acessível */}
            <div role="status" aria-live="polite" className="min-h-[1rem]">
              {error && (
                <motion.p
                  className="text-rose-600 text-sm text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {error}
                </motion.p>
              )}
            </div>

            {/* Actions */}
            <div className="pt-1 space-y-4">
              <button
                type="button"
                onClick={handleGoogleLogin}
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
                Continuar com Google
              </button>

              <button
                type="submit"
                disabled={!canSubmit}
                className={[
                  'w-full h-11 rounded-2xl font-semibold',
                  'bg-gradient-to-b from-white/85 to-white/65',
                  'border border-white/80 ring-1 ring-slate-900/5',
                  'text-slate-900 shadow-[0_10px_28px_rgba(2,6,23,0.12)]',
                  'disabled:opacity-50 hover:to-white/75 active:translate-y-[0.5px]',
                  'focus:outline-none focus:ring-2 focus:ring-slate-700/10',
                ].join(' ')}
              >
                {loading ? 'Entrando…' : 'Entrar'}
              </button>

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
                Criar perfil
              </button>

              <Divider />

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

              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={forgotLoading}
                className={[
                  'w-full h-11 rounded-2xl font-medium',
                  'bg-white/55 backdrop-blur-xl',
                  'border border-white/80 ring-1 ring-slate-900/5',
                  'text-slate-700 shadow-[0_10px_26px_rgba(2,6,23,0.08)]',
                  'hover:bg-white/70 hover:text-slate-900 active:translate-y-[0.5px]',
                  'disabled:opacity-60',
                  'focus:outline-none focus:ring-2 focus:ring-slate-700/10',
                ].join(' ')}
              >
                {forgotLoading ? 'Enviando…' : 'Esqueci minha senha'}
              </button>

              <div role="status" aria-live="polite" className="min-h-[1.25rem] text-center">
                {forgotMessage && (
                  <motion.p
                    className="text-emerald-600 text-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {forgotMessage}
                  </motion.p>
                )}
                {forgotError && !forgotMessage && (
                  <motion.p
                    className="text-rose-600 text-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
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

// src/pages/LoginPage.tsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useMatch } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import PhoneFrame from '../components/PhoneFrame';
import { useAuth } from '../contexts/AuthContext';
import HomePageTour from '../components/HomePageTour';
import mixpanel from '../lib/mixpanel';
import { supabase } from '@/lib/supabaseClient';
import { useGoogleOneTap } from '../hooks/useGoogleOneTap';
import { ButtonEco } from '@/components/ui/ButtonEco';

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
  const { signIn, signInWithGoogle, signInWithGoogleIdToken, user } = useAuth();
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

  // Extrair returnTo da URL
  const searchParams = new URLSearchParams(location.search);
  const returnTo = searchParams.get('returnTo') || '/app';

  const canSubmit = email.trim().length > 3 && password.length >= 6 && !loading;

  // Google One Tap - Login automático para usuários já logados no Google
  useGoogleOneTap({
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    enabled: !user && !loading, // Só exibe se não estiver logado
    autoSelect: false, // Não seleciona automaticamente (melhor UX)
    onSuccess: async (idToken) => {
      setError('');
      setLoading(true);
      try {
        mixpanel.track('Front-end: Login Iniciado', { method: 'google_one_tap' });
        await signInWithGoogleIdToken(idToken);
        mixpanel.track('Front-end: Login Concluído', { method: 'google_one_tap' });
      } catch (err: any) {
        setLoading(false);
        setError(translateAuthError(err));
        mixpanel.track('Front-end: Login Falhou', { method: 'google_one_tap', reason: translateAuthError(err) });
      }
    },
    onError: (error) => {
      console.error('[LoginPage] Google One Tap error:', error);
      setError('Não foi possível fazer login com Google.');
    },
  });

  // Carregar email salvo do localStorage
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem('eco.lastEmail');
      if (savedEmail) setEmail(savedEmail);
    } catch (error) {
      console.error('Erro ao carregar email salvo:', error);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    navigate(returnTo);
  }, [user, navigate, returnTo]);

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

      // Salvar email no localStorage para próximo acesso
      try {
        localStorage.setItem('eco.lastEmail', email.trim());
      } catch (storageError) {
        console.error('Erro ao salvar email:', storageError);
      }

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
      {isTourActive && (
        <HomePageTour onClose={closeTour} reason="login" nextPath="/" forceStart={true} />
      )}

      <div className="relative w-full h-full min-h-[100dvh] flex flex-col overflow-hidden rounded-3xl bg-white">
        {/* ─── Hero: ilustração ECO 3D sangrando até as bordas ─── */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          aria-hidden="true"
          className="relative flex-shrink-0 overflow-hidden"
          style={{
            backgroundColor: '#C5DBEE',
            height: 'clamp(260px, 38vh, 340px)',
          }}
        >
          <motion.img
            src="/images/eco-welcome-hero.png"
            alt="Ilustração ECO"
            initial={{ scale: 1.05, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.9, ease: [0.2, 0.7, 0.1, 1], delay: 0.05 }}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: 'center 42%' }}
            draggable={false}
            loading="eager"
          />
          {/* gradiente sutil na base para fundir com a curva branca */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-20"
            style={{
              background:
                'linear-gradient(180deg, rgba(197, 219, 238, 0) 0%, rgba(197, 219, 238, 0.7) 100%)',
            }}
          />
        </motion.section>

        {/* ─── Folha branca com topo em arco ─── */}
        <section
          className="relative flex-1 min-h-0 bg-white overflow-y-auto"
          style={{
            borderTopLeftRadius: '50% 28px',
            borderTopRightRadius: '50% 28px',
            marginTop: '-26px',
            boxShadow: '0 -8px 24px rgba(30, 42, 68, 0.06)',
          }}
        >
          <div className="mx-auto w-full max-w-sm px-6 pt-7 pb-[calc(20px+env(safe-area-inset-bottom))]">
            {/* Título */}
            <motion.div
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="text-center mb-5"
            >
              <h1
                className="font-display text-[26px] font-bold leading-[1.15] tracking-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                Bem-vindo ao Ecotopia
              </h1>
              <p className="mt-2 text-[14px] leading-snug" style={{ color: 'var(--text-muted)' }}>
                Continue sua jornada emocional
              </p>
            </motion.div>

            {/* Form + ações */}
            <motion.div
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.32, ease: [0.4, 0, 0.2, 1] }}
              className="space-y-3"
            >
              {/* Google — CTA de menor fricção */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-full text-[14.5px] font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                style={{
                  border: '1.5px solid var(--neutral-border)',
                  background: '#ffffff',
                  color: 'var(--text-primary)',
                  boxShadow: '0 1px 2px rgba(30, 42, 68, 0.04)',
                }}
              >
                <GoogleIcon />
                Continuar com Google
              </button>

              <Divider label="ou entre com email" />

              <form onSubmit={handleSubmit} className="space-y-3" noValidate>
                <div>
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
                    className="w-full h-12 rounded-2xl px-4 text-[15px] transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                    style={{
                      border: '1.5px solid var(--neutral-border)',
                      background: '#F7FAFD',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5 px-0.5">
                    <label
                      className="text-[11px] font-semibold tracking-wide uppercase"
                      style={{ color: 'var(--text-muted)' }}
                      htmlFor="password"
                    >
                      Senha
                    </label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={forgotLoading}
                      className="text-[12px] font-medium transition-colors duration-200 disabled:opacity-60"
                      style={{ color: 'var(--accent-warm)' }}
                    >
                      {forgotLoading ? 'Enviando…' : 'Esqueceu?'}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? 'login-error' : undefined}
                      className="w-full h-12 rounded-2xl px-4 pr-12 text-[15px] transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                      style={{
                        border: '1.5px solid var(--neutral-border)',
                        background: '#F7FAFD',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 flex items-center px-3.5 text-[var(--eco-muted)] hover:text-[var(--eco-text)] transition-colors duration-200"
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                {/* Feedback inline */}
                <div className="min-h-[1rem]">
                  <div role="alert" id="login-error" aria-live="assertive">
                    {error && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-[12px] text-rose-500 text-center"
                      >
                        {error}
                      </motion.p>
                    )}
                  </div>
                  <div role="status" aria-live="polite">
                    {forgotMessage && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-[12px] text-emerald-600 text-center"
                      >
                        {forgotMessage}
                      </motion.p>
                    )}
                    {forgotError && !forgotMessage && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-[12px] text-rose-500 text-center"
                      >
                        {forgotError}
                      </motion.p>
                    )}
                  </div>
                </div>

                <ButtonEco type="submit" variant="primary" fullWidth disabled={!canSubmit}>
                  {loading ? 'Entrando…' : 'Entrar'}
                </ButtonEco>
              </form>
            </motion.div>

            {/* Links abaixo */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.5 }}
              className="mt-4 flex flex-col items-center gap-2"
            >
              <button
                type="button"
                onClick={() => navigate(`/register?returnTo=${encodeURIComponent(returnTo)}`)}
                disabled={loading}
                className="text-[13px] transition-colors duration-200 disabled:opacity-60"
                style={{ color: 'var(--text-muted)' }}
              >
                Não tem conta?{' '}
                <span
                  className="font-semibold"
                  style={{
                    color: 'var(--text-primary)',
                    textDecoration: 'underline',
                    textUnderlineOffset: '3px',
                  }}
                >
                  Criar conta grátis
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsTourActive(true)}
                disabled={loading}
                className="text-[12px] transition-colors duration-200 disabled:opacity-60"
                style={{ color: 'var(--text-muted)' }}
              >
                Explorar sem conta →
              </button>
            </motion.div>
          </div>
        </section>
      </div>
    </PhoneFrame>
  );
};

export default LoginPage;

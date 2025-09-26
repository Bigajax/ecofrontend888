// src/pages/LoginPage.tsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useMatch } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';

import PhoneFrame from '../components/PhoneFrame';
import { useAuth } from '../contexts/AuthContext';
import TourInicial from '../components/TourInicial';
import EcoBubbleIcon from '../components/EcoBubbleIcon';
import { Chip, GlassButton, InputField, SurfaceCard } from '../components/ui/Primitives';

const Divider: React.FC<{ label?: string }> = ({ label = 'ou' }) => (
  <div className="relative my-5 flex items-center justify-center text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
    <span className="h-px flex-1 bg-[rgba(15,23,42,0.08)]" aria-hidden />
    <span className="px-3" aria-hidden>
      {label}
    </span>
    <span className="h-px flex-1 bg-[rgba(15,23,42,0.08)]" aria-hidden />
  </div>
);

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
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isTourPath = Boolean(useMatch('/login/tour'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isTourActive, setIsTourActive] = useState(false);
  const [loading, setLoading] = useState(false);

  const canSubmit = email.trim().length > 3 && password.length >= 6 && !loading;

  useEffect(() => {
    if (user) navigate('/chat');
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

  return (
    <PhoneFrame>
      <div className="relative flex h-full flex-col justify-center bg-[radial-gradient(120%_120%_at_10%_0%,rgba(226,232,240,0.32),transparent_60%),radial-gradient(140%_140%_at_90%_-10%,rgba(148,163,184,0.25),transparent_70%),var(--bg)] px-6 py-12 sm:px-8">
        {isTourActive && <TourInicial onClose={closeTour} onFinish={closeTour} />}

        <motion.section
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
          className="mx-auto w-full max-w-md"
        >
          <SurfaceCard className="noise-overlay gap-8 p-8 md:p-10">
            <header className="flex flex-col items-center gap-4 text-center">
              <Chip className="tracking-[0.18em] text-[11px] uppercase text-muted">
                <EcoBubbleIcon size={16} className="shrink-0" />
                Autoconhecimento guiado
              </Chip>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-[-0.02em] text-[color:var(--ink)] sm:text-[2.4rem]">
                  Bem-vindo de volta
                </h1>
                <p className="text-sm text-muted sm:text-base">
                  Entre com sua conta ECO para continuar a conversa.
                </p>
              </div>
            </header>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted"
                >
                  Email
                </label>
                <InputField
                  id="email"
                  type="email"
                  placeholder="seuemail@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  inputMode="email"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted"
                >
                  Senha
                </label>
                <div className="relative">
                  <InputField
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-2 flex items-center rounded-full px-2 text-muted transition-colors duration-200 ease-out hover:text-[color:var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(59,130,246,0.24)]"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div role="status" aria-live="polite" className="min-h-[1.25rem] text-center">
                {error && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm font-medium text-rose-500"
                  >
                    {error}
                  </motion.p>
                )}
              </div>

              <div className="space-y-4 pt-2">
                <GlassButton
                  type="submit"
                  disabled={!canSubmit}
                  className="h-12 w-full justify-center text-base"
                >
                  {loading ? 'Entrando…' : 'Entrar'}
                </GlassButton>

                <GlassButton
                  type="button"
                  variant="subtle"
                  disabled={loading}
                  onClick={() => navigate('/register')}
                  className="h-12 w-full justify-center text-base"
                >
                  Criar perfil
                </GlassButton>

                <Divider />

                <GlassButton
                  type="button"
                  variant="subtle"
                  disabled={loading}
                  onClick={() => setIsTourActive(true)}
                  className="h-12 w-full justify-center text-base"
                >
                  Fazer tour guiado
                </GlassButton>
              </div>
            </form>
          </SurfaceCard>
        </motion.section>
      </div>
    </PhoneFrame>
  );
};

export default LoginPage;

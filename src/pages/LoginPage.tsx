// src/pages/LoginPage.tsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useMatch } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import PhoneFrame from '../components/PhoneFrame';
import { useAuth } from '../contexts/AuthContext';
import TourInicial from '../components/TourInicial';
import EcoBubbleIcon from '../components/EcoBubbleIcon';

/* Divisor minimal */
const Divider: React.FC<{ label?: string }> = ({ label = 'ou' }) => (
  <div className="relative my-4 select-none" aria-hidden="true">
    <div className="h-px w-full bg-slate-200/70" />
    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] tracking-[0.12em] text-slate-300">
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

  // Credenciais inválidas
  if (
    /invalid\s*login\s*credentials/.test(raw) || // Supabase
    /invalid[-_\s]*credential/.test(raw) ||
    /invalid[-_\s]*credentials/.test(raw) ||
    /wrong[-_\s]*password/.test(raw) ||
    /invalid\s*password/.test(raw)
  ) {
    return 'Email ou senha incorretos.';
  }

  // Email inválido
  if (/invalid[-_\s]*email/.test(raw)) {
    return 'Email inválido.';
  }

  // Usuário não encontrado
  if (/user.*not.*found|no\s*user/.test(raw)) {
    return 'Não encontramos uma conta com este email.';
  }

  // Muitas tentativas / rate limit
  if (/too.*many.*request|rate.*limit/.test(raw)) {
    return 'Muitas tentativas. Tente novamente em alguns minutos.';
  }

  // Problema de rede
  if (/network|failed\s*to\s*fetch|timeout|net::/i.test(raw)) {
    return 'Falha de rede. Verifique sua conexão.';
  }

  // Conta desativada
  if (/user.*disabled|account.*disabled/.test(raw)) {
    return 'Esta conta foi desativada.';
  }

  // Senha curta
  if (/least.*6|minimum.*6|password.*short/.test(raw)) {
    return 'A senha deve ter pelo menos 6 caracteres.';
  }

  // Fallback
  return 'Não foi possível entrar. Tente novamente.';
}

const LoginPage: React.FC = () => {
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // também aceita /login/tour
  const isTourPath = Boolean(useMatch('/login/tour'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isTourActive, setIsTourActive] = useState(false);
  const [loading, setLoading] = useState(false);

  const canSubmit = email.trim().length > 3 && password.length >= 6 && !loading;

  // Se já estiver logado, vai para o chat
  useEffect(() => { if (user) navigate('/chat'); }, [user, navigate]);

  // Abre o tour automaticamente por query/hash/rota/state
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const wantsTour =
      params.get('tour') === '1' ||
      location.hash?.toLowerCase() === '#tour' ||
      isTourPath ||
      Boolean((location.state as any)?.showTour);

    if (wantsTour) setIsTourActive(true);
  }, [location.search, location.hash, location.state, isTourPath]);

  // Bloqueia scroll do body quando o Tour está ativo
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = isTourActive ? 'hidden' : prev || '';
    return () => { document.body.style.overflow = prev; };
  }, [isTourActive]);

  // Fecha o tour e limpa a URL para não reabrir ao atualizar
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
      <div className="flex h-full items-center justify-center px-6 py-10 bg-white">
        {isTourActive && <TourInicial onClose={closeTour} onFinish={closeTour} />}

        <motion.div
          initial={{ y: 6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="glass-card w-full max-w-sm p-8 md:p-10"
        >
          {/* Header */}
          <div className="text-center space-y-3">
            <h1 className="eco-wordmark text-[34px] leading-none font-semibold tracking-[-0.02em] text-slate-900">
              ECO
            </h1>

            <div className="w-full flex justify-center">
              <span className="pill-ambient" aria-label="Autoconhecimento guiado">
                <EcoBubbleIcon size={14} className="shrink-0" />
                <span className="text-[14px] md:text-[15px] leading-none font-medium text-slate-800">
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
              className="input-glass"
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
                className="input-glass pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-1.5 my-1.5 px-2 flex items-center rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100/60 focus:outline-none"
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
              <button type="submit" disabled={!canSubmit} className="btn-apple btn-apple-primary w-full">
                {loading ? 'Entrando…' : 'Entrar'}
              </button>

              <button
                type="button"
                onClick={() => navigate('/register')}
                disabled={loading}
                className="btn-apple w-full h-11"
              >
                Criar perfil
              </button>

              <Divider />

              <button
                type="button"
                onClick={() => setIsTourActive(true)}
                disabled={loading}
                className="btn-apple w-full h-11"
              >
                Iniciar Tour
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </PhoneFrame>
  );
};

export default LoginPage;

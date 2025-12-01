// src/pages/CreateProfilePage.tsx
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import PhoneFrame from '../components/PhoneFrame';
import Input from '../components/Input';
import MaskedInput from '../components/MaskedInput';
import { fbq } from '../lib/fbpixel';
import mixpanel from '../lib/mixpanel';
import { supabase as supabaseClient } from '../lib/supabaseClient';

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

const CreateProfilePage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);

  const phoneClean = useMemo(() => phone.replace(/\D/g, ''), [phone]);

  const basicValid =
    fullName.trim().length >= 3 &&
    email.trim().length > 3 &&
    phoneClean.length === 11 &&
    password.length >= 6 &&
    confirmPassword.length >= 6;

  const canSubmit = basicValid && password === confirmPassword && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setLoading(true);
    try {
      mixpanel.track('Front-end: Cadastro Iniciado', { email: email.trim() });
      await register(email.trim(), password, fullName.trim(), phoneClean);
      const supabase = await supabaseClient.auth.getUser();
      mixpanel.track('Front-end: Cadastro Concluído', {
        userId: supabase?.user?.id ?? 'pending',
      });
      fbq('CompleteRegistration', { value: 1, currency: 'BRL' });
      navigate('/app');
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
          redirectTo: `${window.location.origin}/app`,
          queryParams: {
            prompt: 'consent',
          },
        },
      });
      if (authError) throw authError;
      mixpanel.track('Front-end: Google Sign-up Iniciado com Sucesso');
      fbq('CompleteRegistration', { value: 1, currency: 'BRL' });
    } catch (err: any) {
      const translatedError = translateRegisterError(err);
      mixpanel.track('Front-end: Google Sign-up Falhou', { reason: translatedError });
      setError(translatedError);
    }
  };

  return (
    <PhoneFrame backgroundImage="/images/login-background.png">
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
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="sr-only" htmlFor="fullName">Nome completo</label>
                <input
                  id="fullName"
                  type="text"
                  placeholder="Nome completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoComplete="name"
                  className="w-full h-12 rounded-xl border border-[var(--eco-line)] bg-white/80 backdrop-blur-sm px-4 text-base text-[var(--eco-text)] placeholder:text-[var(--eco-muted)] transition-all duration-300 ease-out focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--eco-accent)]/40"
                />
              </div>

              <div className="space-y-1">
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
                  className="w-full h-12 rounded-xl border border-[var(--eco-line)] bg-white/80 backdrop-blur-sm px-4 text-base text-[var(--eco-text)] placeholder:text-[var(--eco-muted)] transition-all duration-300 ease-out focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--eco-accent)]/40"
                />
              </div>

              <div className="space-y-1">
                <label className="sr-only" htmlFor="phone">Celular (com DDD)</label>
                <MaskedInput
                  id="phone"
                  type="tel"
                  placeholder="Celular (com DDD)"
                  mask="(99) 99999-9999"
                  value={phone}
                  onChange={(e: any) => setPhone(e.target.value)}
                  required
                  autoComplete="tel"
                  className="w-full h-12 rounded-xl border border-[var(--eco-line)] bg-white/80 backdrop-blur-sm px-4 text-base text-[var(--eco-text)] placeholder:text-[var(--eco-muted)] transition-all duration-300 ease-out focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--eco-accent)]/40"
                />
              </div>

              <div className="space-y-1">
                <label className="sr-only" htmlFor="password">Senha</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPwd ? 'text' : 'password'}
                    placeholder="Senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="w-full h-12 rounded-xl border border-[var(--eco-line)] bg-white/80 backdrop-blur-sm px-4 pr-12 text-base text-[var(--eco-text)] placeholder:text-[var(--eco-muted)] transition-all duration-300 ease-out focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--eco-accent)]/40"
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
              </div>

              <div className="space-y-1">
                <label className="sr-only" htmlFor="confirmPassword">Confirmar senha</label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showPwd2 ? 'text' : 'password'}
                    placeholder="Confirmar senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="w-full h-12 rounded-xl border border-[var(--eco-line)] bg-white/80 backdrop-blur-sm px-4 pr-12 text-base text-[var(--eco-text)] placeholder:text-[var(--eco-muted)] transition-all duration-300 ease-out focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--eco-accent)]/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd2((s) => !s)}
                    className="absolute inset-y-0 right-1.5 my-1.5 flex items-center rounded-xl px-2 text-[var(--eco-muted)] transition-all duration-300 ease-out hover:bg-[var(--eco-bubble)] hover:text-[var(--eco-text)] focus:outline-none focus:ring-2 focus:ring-[var(--eco-accent)]/40"
                    aria-label={showPwd2 ? 'Ocultar senha' : 'Mostrar senha'}
                    aria-pressed={showPwd2}
                    title={showPwd2 ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPwd2 ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <div role="alert" id="register-error" aria-live="assertive" className="min-h-[1.25rem] text-center text-sm text-rose-500">
              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {error}
                </motion.p>
              )}
              {!error && password && confirmPassword && password !== confirmPassword && (
                <p className="text-amber-600">As senhas não coincidem.</p>
              )}
              {!error && phone && phoneClean.length !== 11 && (
                <p className="text-amber-600">Use o formato (99) 99999-9999.</p>
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
                {loading ? 'Entrando…' : 'Entrar com Google'}
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

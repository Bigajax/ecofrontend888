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
    <PhoneFrame>
      <div className="flex h-full items-center justify-center px-6 py-10 bg-white">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="glass-card w-full max-w-sm p-8 md:p-10"
        >
          {/* header */}
          <div className="text-center space-y-4">
            <h1 className="text-[28px] leading-none font-sans font-semibold text-slate-900">
              Criar Perfil
            </h1>
            <div className="w-full flex justify-center">
              <span className="pill-ambient">
                <BubbleIcon />
                <span className="text-[15px] leading-none text-slate-800">
                  Seu espelho emocional
                </span>
              </span>
            </div>
          </div>

          {/* formulário */}
          <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
            <label className="sr-only" htmlFor="fullName">Nome completo</label>
            <Input
              id="fullName"
              type="text"
              placeholder="Nome completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
              className="input-glass"
            />

            <label className="sr-only" htmlFor="email">Email</label>
            <Input
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
              className="input-glass"
            />

            {/* senha */}
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
                className="input-glass pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                className="absolute inset-y-0 right-1.5 my-1.5 px-2 flex items-center rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100/60 focus:outline-none"
                aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
                title={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* confirmar senha */}
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
                className="input-glass pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPwd2((s) => !s)}
                className="absolute inset-y-0 right-1.5 my-1.5 px-2 flex items-center rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100/60 focus:outline-none"
                aria-label={showPwd2 ? 'Ocultar senha' : 'Mostrar senha'}
                title={showPwd2 ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPwd2 ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* feedbacks */}
            <div aria-live="polite" className="min-h-[1.1rem]">
              {error && (
                <motion.p
                  className="text-rose-600 text-sm text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {error}
                </motion.p>
              )}
              {!error && password && confirmPassword && password !== confirmPassword && (
                <p className="text-amber-600 text-xs text-center">As senhas não coincidem.</p>
              )}
              {!error && phone && phoneClean.length !== 11 && (
                <p className="text-amber-600 text-xs text-center">Use o formato (99) 99999-9999.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="btn-apple btn-apple-primary w-full"
            >
              {loading ? 'Criando…' : 'Criar conta'}
            </button>
          </form>

          {/* Divisor com "Ou" */}
          <div className="relative mt-6 mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-slate-500">Ou</span>
            </div>
          </div>

          {/* Botão Google */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium text-base hover:bg-slate-50 active:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>{loading ? 'Entrando…' : 'Entrar com Google'}</span>
          </button>

          <div className="mt-6 text-center text-sm text-slate-500">
            Já possui uma conta?{' '}
            <button
              type="button"
              className="text-slate-800 font-medium underline underline-offset-2 hover:text-slate-900"
              onClick={() => navigate('/')}
            >
              Entrar
            </button>
          </div>
        </motion.div>
      </div>
    </PhoneFrame>
  );
};

export default CreateProfilePage;

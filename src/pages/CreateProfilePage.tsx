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
      await register(email.trim(), password, fullName.trim(), phoneClean);
      fbq('CompleteRegistration', { value: 1, currency: 'BRL' });
      navigate('/chat');
    } catch (err: any) {
      setError(translateRegisterError(err));
    } finally {
      setLoading(false);
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

          <div className="mt-5 text-center text-sm text-slate-500">
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
    </PhoneFrame>
  );
};

export default CreateProfilePage;

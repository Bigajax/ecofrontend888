// src/pages/LoginPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import PhoneFrame from '../components/PhoneFrame';
import { useAuth } from '../contexts/AuthContext';
import TourInicial from '../components/TourInicial';

/* Divisor minimal: hairline + “ou” micro, sem fundo */
const Divider: React.FC<{ label?: string }> = ({ label = 'ou' }) => (
  <div className="relative my-4 select-none" aria-hidden="true">
    <div className="h-px w-full bg-slate-200/70" />
    <span
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                 text-[10px] tracking-[0.12em] text-slate-300"
    >
      {label}
    </span>
  </div>
);

/* Bolha glassmorphism 3D — única, discreta */
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

const TAGLINE = 'Reflexo do Agora';
const SUBTAGLINE = 'Autoconhecimento guiado pelo presente.';

const LoginPage: React.FC = () => {
  const { signIn, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isTourActive, setIsTourActive] = useState(false);
  const [loading, setLoading] = useState(false);

  const canSubmit = email.trim().length > 3 && password.length >= 6 && !loading;

  useEffect(() => { if (user) navigate('/chat'); }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setLoading(true);
    try { await signIn(email.trim(), password); }
    catch (err: any) { setError(err?.message || 'Erro ao autenticar.'); }
    finally { setLoading(false); }
  };

  return (
    <PhoneFrame>
      <div className="flex h-full items-center justify-center px-6 py-10 bg-white">
        {isTourActive && <TourInicial onClose={() => setIsTourActive(false)} />}

        {/* Cartão vítreo clean */}
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

            {/* Pílula minimal com uma bolha (novo bordão) */}
            <div className="w-full flex justify-center">
              <span className="pill-ambient" aria-label={TAGLINE}>
                <BubbleIcon />
                <span className="text-[14px] md:text-[15px] leading-none font-medium text-slate-800">
                  {TAGLINE}
                </span>
              </span>
            </div>

            {/* Subtagline (Apple-like, calmo) */}
            <p className="mt-1 text-[13px] md:text-[14px] text-slate-500 leading-snug">
              {SUBTAGLINE}
            </p>
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
              autoFocus
              className="input-glass"
            />

            <label className="sr-only" htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="input-glass"
            />

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

            {/* Actions — mais respiro entre botões */}
            <div className="pt-1 space-y-4">
              <button
                type="submit"
                disabled={!canSubmit}
                className="btn-apple btn-apple-primary w-full"
              >
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

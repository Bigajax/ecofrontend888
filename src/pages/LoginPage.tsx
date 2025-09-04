// src/pages/LoginPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import PhoneFrame from '../components/PhoneFrame';
import Input from '../components/Input';
import TourInicial from '../components/TourInicial';
import EcoTitle from '../components/EcoTitle';

/* Bolha minimal com brilho sutil */
const BubbleIcon: React.FC<{ className?: string }> = ({ className = 'h-3.5 w-3.5' }) => (
  <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
    <defs>
      <radialGradient id="b1" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#ECFEFF"/>
        <stop offset="45%" stopColor="#9AD1D4"/>
        <stop offset="100%" stopColor="#A78BFA"/>
      </radialGradient>
    </defs>
    <circle cx="32" cy="32" r="22" fill="url(#b1)"/>
    <ellipse cx="24" cy="22" rx="9" ry="6" fill="#fff" opacity=".55"/>
  </svg>
);

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

  const handleIniciarTour = () => setIsTourActive(true);
  const handleCloseTour = () => setIsTourActive(false);

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
      {/* fundo branco liso para combinar com o chat */}
      <div className="flex h-full items-center justify-center px-6 py-10 bg-white">
        {isTourActive && <TourInicial onClose={handleCloseTour} />}

        {/* cartão principal com glassmorphism */}
        <div className="glass-panel w-full max-w-sm rounded-[28px] p-8 md:p-10 space-y-7">
          <div className="text-center space-y-3">
            <EcoTitle />

            {/* Pílula “Seu espelho interior” */}
            <div className="relative mx-auto w-fit">
              <div className="absolute -inset-[2px] rounded-full blur-[6px] opacity-40
                              bg-[radial-gradient(70%_90%_at_50%_0%,#a78bfa_18%,transparent_55%)]"/>
              <span className="relative inline-flex items-center gap-2 rounded-full
                               px-3.5 py-1.5 text-sm font-medium tracking-tight
                               bg-white/80 text-slate-900
                               border border-white/70 ring-1 ring-black/5
                               shadow-[0_1px_0_rgba(255,255,255,.7)_inset,0_6px_18px_rgba(2,6,23,.06)]">
                <BubbleIcon />
                <span>Seu espelho interior</span>
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
              className="h-12 rounded-2xl px-4
                         bg-white/85 backdrop-blur-sm text-slate-900 placeholder-slate-400
                         border border-black/10
                         shadow-[inset_0_1px_0_rgba(255,255,255,.7)]
                         focus:ring-[3px] focus:ring-sky-300/40 focus:border-transparent
                         transition"
            />

            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="h-12 rounded-2xl px-4
                         bg-white/85 backdrop-blur-sm text-slate-900 placeholder-slate-400
                         border border-black/10
                         shadow-[inset_0_1px_0_rgba(255,255,255,.7)]
                         focus:ring-[3px] focus:ring-sky-300/40 focus:border-transparent
                         transition"
            />

            {error && (
              <motion.p className="text-rose-600 text-sm text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {error}
              </motion.p>
            )}

            <div className="pt-2 space-y-3">
              {/* primário em glass escuro (mesmo do chat) */}
              <button
                type="submit"
                disabled={!canSubmit}
                className={`glass-button-primary w-full h-12 rounded-2xl font-semibold tracking-tight
                            transition will-change-transform
                            ${!canSubmit ? 'opacity-60 cursor-not-allowed' : 'active:translate-y-[1px]'}`}
              >
                {loading ? 'Entrando…' : 'Entrar'}
              </button>

              {/* secundários em glass neutro */}
              <button
                type="button"
                onClick={() => navigate('/register')}
                disabled={loading}
                className="glass-button w-full h-11 rounded-2xl font-medium transition hover:bg-white/80"
              >
                Criar perfil
              </button>

              <div className="flex items-center gap-3 py-1 select-none">
                <span className="flex-1 h-px bg-black/10" />
                <span className="text-slate-400 text-xs">ou</span>
                <span className="flex-1 h-px bg-black/10" />
              </div>

              <button
                type="button"
                onClick={handleIniciarTour}
                disabled={loading}
                className="glass-button w-full h-11 rounded-2xl font-medium transition hover:bg-white/80"
              >
                Iniciar Tour
              </button>
            </div>
          </form>
        </div>
      </div>
    </PhoneFrame>
  );
};

export default LoginPage;

// src/pages/CreateProfilePage.tsx
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import PhoneFrame from '../components/PhoneFrame';
import Input from '../components/Input';
import MaskedInput from '../components/MaskedInput';
import { fbq } from '../lib/fbpixel'; // ✅ helper do Pixel

/* bolha igual ao login */
const BubbleIcon: React.FC<{ className?: string }> = ({ className = 'h-3.5 w-3.5' }) => (
  <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
    <defs>
      <radialGradient id="b1" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#ECFEFF" />
        <stop offset="45%" stopColor="#9AD1D4" />
        <stop offset="100%" stopColor="#A78BFA" />
      </radialGradient>
    </defs>
    <circle cx="32" cy="32" r="22" fill="url(#b1)" />
    <ellipse cx="24" cy="22" rx="9" ry="6" fill="#fff" opacity=".55" />
  </svg>
);

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
      // 💾 cria a conta no seu backend/Supabase
      await register(email.trim(), password, fullName.trim(), phoneClean);

      // 📈 dispara a conversão do Meta Pixel (Registro completo)
      fbq('CompleteRegistration', {
        value: 1,
        currency: 'BRL',
      });

      // ▶️ segue o fluxo normal da app
      navigate('/chat');
    } catch (err: any) {
      setError(err?.message || 'Falha ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PhoneFrame>
      <div className="flex h-full items-center justify-center px-6 py-8 bg-gradient-to-br from-[#F7F8FB] via-[#F9FAFB] to-[#F5F7FF]">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-sm rounded-[28px] px-8 py-10 bg-white/80 backdrop-blur-2xl border border-white/70 ring-1 ring-black/5 shadow-[0_12px_30px_rgba(0,0,0,.06)]"
        >
          {/* título + pill */}
          <div className="text-center space-y-3 mb-6">
            <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Criar Perfil</h1>

            {/* Pílula mais discreta e com o mesmo texto do login */}
            <div className="relative mx-auto w-fit">
              <div className="absolute -inset-[2px] rounded-full blur-[6px] opacity-35 bg-[radial-gradient(70%_90%_at_50%_0%,#a78bfa_18%,transparent_55%)]" />
              <span className="relative inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium tracking-tight bg-white/80 text-slate-900 border border-white/70 ring-1 ring-black/5 shadow-[0_1px_0_rgba(255,255,255,.7)_inset,0_6px_18px_rgba(2,6,23,.06)]">
                <BubbleIcon />
                <span>Seu espelho interior</span>
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              type="text"
              placeholder="Nome completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
              className="h-12 rounded-2xl px-4 bg-white text-slate-900 placeholder-slate-400 border border-black/10 shadow-[inset_0_1px_0_rgba(255,255,255,.7)] focus:ring-[3px] focus:ring-sky-300/50 focus:border-transparent transition"
            />

            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="h-12 rounded-2xl px-4 bg-white text-slate-900 placeholder-slate-400 border border-black/10 shadow-[inset_0_1px_0_rgba(255,255,255,.7)] focus:ring-[3px] focus:ring-sky-300/50 focus:border-transparent transition"
            />

            <MaskedInput
              type="tel"
              placeholder="Celular (com DDD)"
              mask="(99) 99999-9999"
              value={phone}
              onChange={(e: any) => setPhone(e.target.value)}
              required
              autoComplete="tel"
              className="h-12 rounded-2xl px-4 bg-white text-slate-900 placeholder-slate-400 border border-black/10 shadow-[inset_0_1px_0_rgba(255,255,255,.7)] focus:ring-[3px] focus:ring-sky-300/50 focus:border-transparent transition"
            />

            {/* senha – toggle texto (sem ícones) */}
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="h-12 w-full rounded-2xl px-4 pr-16 bg-white text-slate-900 placeholder-slate-400 border border-black/10 shadow-[inset_0_1px_0_rgba(255,255,255,.7)] focus:ring-[3px] focus:ring-sky-300/50 focus:border-transparent transition"
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-300/40"
                aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPwd ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>

            {/* confirmar senha – mesmo toggle texto */}
            <div className="relative">
              <input
                type={showPwd2 ? 'text' : 'password'}
                placeholder="Confirmar senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="h-12 w-full rounded-2xl px-4 pr-16 bg-white text-slate-900 placeholder-slate-400 border border-black/10 shadow-[inset_0_1px_0_rgba(255,255,255,.7)] focus:ring-[3px] focus:ring-sky-300/50 focus:border-transparent transition"
              />
              <button
                type="button"
                onClick={() => setShowPwd2((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-300/40"
                aria-label={showPwd2 ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPwd2 ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>

            {/* erros */}
            <div aria-live="polite">
              {error && (
                <motion.p className="text-rose-600 text-sm text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {error}
                </motion.p>
              )}
              {password && confirmPassword && password !== confirmPassword && !error && (
                <p className="text-amber-600 text-xs text-center">As senhas não coincidem.</p>
              )}
              {phone && phoneClean.length !== 11 && !error && (
                <p className="text-amber-600 text-xs text-center">Use o formato (99) 99999-9999.</p>
              )}
            </div>

            {/* ação */}
            <button
              type="submit"
              disabled={!canSubmit}
              className={`w-full h-12 rounded-2xl font-semibold tracking-tight transition ${
                canSubmit
                  ? 'bg-[#265F77] text-white hover:bg-[#2b6e8a] active:translate-y-[1px] shadow-[0_1px_0_rgba(255,255,255,.3)_inset,0_10px_22px_rgba(2,6,23,.12)]'
                  : 'bg-slate-300/70 text-slate-600 cursor-not-allowed'
              }`}
            >
              {loading ? 'Criando…' : 'Criar Conta'}
            </button>
          </form>

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

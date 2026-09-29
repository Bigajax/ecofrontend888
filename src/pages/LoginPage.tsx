// src/pages/LoginPage.tsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useMatch } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import HomePageTour from '../components/HomePageTour';
import mixpanel from '../lib/mixpanel';
import { supabase } from '@/lib/supabaseClient';
import { useGoogleOneTap } from '../hooks/useGoogleOneTap';
import { ReinoPintura, type ReinoRegiao } from '@/components/reino/ReinoScene';
import { getReinoMood, type ReinoMood } from '@/components/reino/reinoMood';
import '@/components/reino/reino.css';
import { translateAuthError } from '@/utils/authErrorMessage';

// Mesma pintura e foco da home em cada hora (HomeReinoHero).
const CENA: Record<ReinoMood, { regiao: ReinoRegiao; foco: string }> = {
  amanhecer: { regiao: 'portico', foco: '85% 50%' },
  entardecer: { regiao: 'casa', foco: '15% 50%' },
  noite: { regiao: 'vale', foco: '45% 50%' },
};

/** Ícone Google (SVG oficial simplificado) */
const GoogleIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12S17.4 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C33.6 6 29 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c10.5 0 19.5-7.6 19.5-20 0-1.2-.1-2.4-.3-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.4 16 18.8 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C33.6 6 29 4 24 4 16.1 4 9.2 8.6 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.7 13.5-4.7l-6.2-5.1C29.3 36 26.8 37 24 37c-5.3 0-9.7-3.1-11.6-7.5L5.6 34.2C8.5 40.3 15 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1 2.9-3.8 5-7.3 5-3 0-5.6-1.9-6.5-4.6l-6.6 5C17 37 20.3 39 24 39c9 0 15.5-6.1 15.5-15.5 0-1.2-.1-2.4-.3-3.5z"/>
  </svg>
);

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
        mixpanel.track('Login · Iniciado', { method: 'google_one_tap' });
        await signInWithGoogleIdToken(idToken);
        mixpanel.track('Login · Concluído', { method: 'google_one_tap' });
      } catch (err: any) {
        setLoading(false);
        setError(translateAuthError(err));
        mixpanel.track('Login · Falhou', { method: 'google_one_tap', reason: translateAuthError(err) });
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

  // Só em dev: /login?previa=1 mostra a tela mesmo logado (para revisar o visual).
  const previa = import.meta.env.DEV && searchParams.get('previa') === '1';

  useEffect(() => {
    if (!user || previa) return;
    navigate(returnTo);
  }, [user, navigate, returnTo, previa]);

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
      mixpanel.track('Login · Iniciado', { method: 'password', email: email.trim() });
      await signIn(email.trim(), password);

      // Salvar email no localStorage para próximo acesso
      try {
        localStorage.setItem('eco.lastEmail', email.trim());
      } catch (storageError) {
        console.error('Erro ao salvar email:', storageError);
      }

      mixpanel.track('Login · Concluído', { method: 'password' });
    } catch (err: any) {
      setError(translateAuthError(err));
      mixpanel.track('Login · Falhou', { method: 'password', reason: translateAuthError(err) });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      mixpanel.track('Login · Iniciado', { method: 'google' });
      await signInWithGoogle();
      mixpanel.track('Login · Concluído', { method: 'google' });
    } catch (err: any) {
      setLoading(false);
      setError(translateAuthError(err));
      mixpanel.track('Login · Falhou', { method: 'google', reason: translateAuthError(err) });
    }
  };

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setForgotMessage('');
      setForgotError('Digite o seu e-mail acima e toque de novo.');
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

  // A pintura da hora: Pórtico de manhã, Casa à tarde, Vale à noite (a mesma da home).
  const mood = getReinoMood();
  const cena = CENA[mood];

  return (
    <div className="reino-entrada" data-mood={mood}>
      {isTourActive && (
        <HomePageTour onClose={closeTour} reason="login" nextPath="/" forceStart={true} />
      )}

      <div className="reino-entrada__pintura reino-rasgo-a" aria-hidden="true">
        <ReinoPintura regiao={cena.regiao} foco={cena.foco} />
      </div>

      <main className="reino-corpo reino-entrada__folha">
        <div className="reino-entrada__miolo">
          <p className="reino-rotulo">Ecotopia · a entrada do reino</p>
          <h1 className="reino-entrada__titulo">Que bom te ver de novo.</h1>
          <p className="reino-entrada__sobre">Entre para continuar de onde parou.</p>

          {/* Google: o caminho de menor fricção */}
          <button type="button" onClick={handleGoogleLogin} disabled={loading} className="reino-entrada__google">
            <GoogleIcon />
            Continuar com Google
          </button>

          <p className="reino-entrada__ou" aria-hidden="true">
            ou com e-mail
          </p>

          <form onSubmit={handleSubmit} className="reino-entrada__form" noValidate>
            <label className="reino-entrada__campo">
              <span className="reino-entrada__rotulo">E-mail</span>
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
              />
            </label>

            <div className="reino-entrada__campo">
              <span className="reino-entrada__linha">
                <label className="reino-entrada__rotulo" htmlFor="password">
                  Senha
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={forgotLoading}
                  className="reino-entrada__link"
                >
                  {forgotLoading ? 'Enviando…' : 'Esqueceu a senha?'}
                </button>
              </span>
              <span className="reino-entrada__senha">
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
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="reino-entrada__olho"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </div>

            {/* Retorno do que aconteceu, no lugar do campo */}
            <div className="reino-entrada__retorno">
              <div role="alert" id="login-error" aria-live="assertive">
                {error && <p className="is-erro">{error}</p>}
              </div>
              <div role="status" aria-live="polite">
                {forgotMessage && <p className="is-ok">{forgotMessage}</p>}
                {forgotError && !forgotMessage && <p className="is-erro">{forgotError}</p>}
              </div>
            </div>

            <button type="submit" className="reino-placa reino-entrada__entrar" disabled={!canSubmit}>
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <div className="reino-entrada__pe">
            <button
              type="button"
              onClick={() => navigate(`/register?returnTo=${encodeURIComponent(returnTo)}`)}
              disabled={loading}
              className="reino-entrada__criar"
            >
              Ainda não tem conta? <span>Criar conta grátis</span>
            </button>
            <button
              type="button"
              onClick={() => setIsTourActive(true)}
              disabled={loading}
              className="reino-entrada__link"
            >
              Explorar sem conta
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;

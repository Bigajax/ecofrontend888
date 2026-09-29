// src/pages/CreateProfilePage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth, type PreservedData } from '../contexts/AuthContext';
import WelcomeScreen from '../components/WelcomeScreen';
import { fbq, trackWithCAPI } from '../lib/fbpixel';
import { PRICE, planValue } from '../constants/offerCopy';
import mixpanel from '../lib/mixpanel';
import { supabase as supabaseClient } from '../lib/supabaseClient';
import Entrada from '@/components/reino/ReinoEntrada';

// Declaração de tipo para Google Identity Services
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (callback?: (notification: any) => void) => void;
          renderButton: (element: HTMLElement, config: any) => void;
        };
      };
    };
  }
}

const GoogleIcon: React.FC = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
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

  if (/email.*already|already.*in.*use|duplicate.*email|already.*registered|user.*already/.test(raw)) {
    return 'Este email já está em uso. Tente entrar com ele.';
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

// Função para gerar senha segura
const generateSecurePassword = (): string => {
  const length = 16;
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*';
  let password = '';
  const array = new Uint32Array(length);
  window.crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length];
  }
  return password;
};

const CreateProfilePage: React.FC = () => {
  const { register, migrateGuestData, signOut, user, userName } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [useAutoPassword, setUseAutoPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Estados para WelcomeScreen e confirmação de email
  const [showWelcome, setShowWelcome] = useState(false);
  const [preservedData, setPreservedData] = useState<PreservedData | undefined>(undefined);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [confirmedEmail, setConfirmedEmail] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  const basicValid = email.trim().length > 3 && password.length >= 6;

  const canSubmit = basicValid && !loading;

  // Extrair returnTo, plan e from da URL se existirem
  const searchParams = new URLSearchParams(location.search);
  const returnTo = searchParams.get('returnTo') || '/app';
  const planFromQuery = searchParams.get('plan'); // 'monthly' | 'annual' | null
  const fromQuery = searchParams.get('from'); // 'hero' | 'pricing' | 'pricing_page' | 'fechamento' | null
  const isLandingFlow = Boolean(
    fromQuery &&
      [
        'hero', 'pricing', 'pricing_page', 'fechamento', 'footer',
        'sonhos_guest', 'eco_ia_dream',
        'sono_trial', 'abundancia_trial', 'drjoe_trial', 'drjoe_guest',
      ].includes(fromQuery),
  );

  const handleGeneratePassword = () => {
    const newPassword = generateSecurePassword();
    setPassword(newPassword);
    setUseAutoPassword(true);
    setShowPwd(true);
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    } catch (err) {
      console.error('Falha ao copiar senha:', err);
    }
  };

  // Handler para Google One Tap
  const handleGoogleOneTap = async (response: any) => {
    try {
      mixpanel.track('Cadastro · One Tap iniciado');

      // O token JWT vem em response.credential
      const { data, error: authError } = await supabaseClient.auth.signInWithIdToken({
        provider: 'google',
        token: response.credential,
      });

      if (authError) throw authError;

      if (data.user) {
        mixpanel.track('Cadastro · One Tap concluído', { userId: data.user.id });
        fbq('CompleteRegistration', { value: 1, currency: 'BRL' });
        // Meta Pixel + CAPI: todo cadastro inicia o trial de 7 dias → StartTrial
        // (evento padrão do Meta para otimização). Valor = preço do plano.
        void trackWithCAPI('StartTrial', {
          value: planValue(planFromQuery),
          currency: PRICE.currency,
        });

        // Migrar dados guest
        const migrated = await migrateGuestData(data.user.id);

        // Mostrar WelcomeScreen se houver dados preservados
        if (
          (migrated.chatMessages ?? 0) > 0 ||
          (migrated.favorites ?? 0) > 0 ||
          (migrated.ringsDay ?? 0) > 0 ||
          migrated.meditationProgress
        ) {
          setPreservedData(migrated);
          setShowWelcome(true);
        } else {
          navigate(returnTo);
        }
      } else {
        navigate(returnTo);
      }
    } catch (err: any) {
      const translatedError = translateRegisterError(err);
      mixpanel.track('Cadastro · One Tap falhou', { reason: translatedError });
      setError(translatedError);
    }
  };

  // Inicializar Google One Tap
  useEffect(() => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!googleClientId || googleClientId.includes('your-google')) {
      console.warn('[CreateProfile] Google Client ID não configurado');
      return;
    }

    // Aguardar script Google carregar
    const initGoogleOneTap = () => {
      if (!window.google?.accounts?.id) {
        console.warn('[CreateProfile] Google Identity Services não carregado');
        return;
      }

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleOneTap,
        auto_select: false, // Não auto-select para permitir escolha
        cancel_on_tap_outside: true,
        context: 'signup',
      });

      // Mostrar One Tap prompt automaticamente
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed()) {
          console.info('[CreateProfile] One Tap não mostrado:', notification.getNotDisplayedReason());
        } else if (notification.isSkippedMoment()) {
          console.info('[CreateProfile] One Tap dismissed:', notification.getSkippedReason());
        }
      });
    };

    // Se script já carregou, inicializar agora
    if (window.google?.accounts?.id) {
      initGoogleOneTap();
    } else {
      // Aguardar script carregar
      const checkInterval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(checkInterval);
          initGoogleOneTap();
        }
      }, 100);

      // Timeout de segurança após 5s
      setTimeout(() => clearInterval(checkInterval), 5000);

      return () => clearInterval(checkInterval);
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setLoading(true);
    try {
      mixpanel.track('Cadastro · Iniciado', {
        email: email.trim(),
        plan: planFromQuery,
        from: fromQuery,
      });

      // 1. Registrar usuário
      // Se veio de compra do protocolo sono, passar emailRedirectTo para que o link
      // de confirmação do Supabase leve direto à página de claim após a verificação.
      const emailRedirectTo = returnTo.includes('/sono/')
        ? `${window.location.origin}${returnTo}`
        : undefined;
      const { needsConfirmation } = await register(email.trim(), password, '', '', emailRedirectTo);

      // 2. Supabase requer confirmação de email → mostrar tela de aviso
      if (needsConfirmation) {
        setConfirmedEmail(email.trim());
        setShowEmailConfirmation(true);
        mixpanel.track('Cadastro · Pendente confirmação', { email: email.trim() });
        return;
      }

      // 3. Conta criada e sessão ativa → obter user e prosseguir
      const { data: { user: newUser } } = await supabaseClient.auth.getUser();

      if (newUser) {
        mixpanel.track('Cadastro · Concluído', { userId: newUser.id });
        fbq('CompleteRegistration', { value: 1, currency: 'BRL' });
        // Meta Pixel + CAPI: todo cadastro inicia o trial de 7 dias → StartTrial
        // (evento padrão do Meta para otimização). Valor = preço do plano.
        void trackWithCAPI('StartTrial', {
          value: planValue(planFromQuery),
          currency: PRICE.currency,
        });

        const migrated = await migrateGuestData(newUser.id);

        if (
          (migrated.chatMessages ?? 0) > 0 ||
          (migrated.favorites ?? 0) > 0 ||
          (migrated.ringsDay ?? 0) > 0 ||
          migrated.meditationProgress
        ) {
          setPreservedData(migrated);
          setShowWelcome(true);
        } else {
          navigate(returnTo);
        }
      } else {
        navigate(returnTo);
      }
    } catch (err: any) {
      const translatedError = translateRegisterError(err);
      mixpanel.track('Cadastro · Falhou', { reason: translatedError });
      setError(translatedError);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError('');
    try {
      mixpanel.track('Cadastro · Google iniciado');
      const { error: authError } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${returnTo}`,
          queryParams: {
            prompt: 'consent',
          },
        },
      });
      if (authError) throw authError;
      mixpanel.track('Cadastro · Google sucesso');
      fbq('CompleteRegistration', { value: 1, currency: 'BRL' });

      // Nota: A migração será feita no callback OAuth via AuthContext
      // quando o usuário retornar após autorização
    } catch (err: any) {
      const translatedError = translateRegisterError(err);
      mixpanel.track('Cadastro · Google falhou', { reason: translatedError });
      setError(translatedError);
    }
  };

  // Guarda: usuário já está logado → não mostrar formulário de cadastro
  if (user) {
    const displayName = userName || user.email || 'sua conta';
    return (
      <Entrada>
        <h1 className="reino-entrada__titulo">Você já está dentro.</h1>
        <p className="reino-entrada__sobre">Conectado como {displayName}.</p>
        <button type="button" className="reino-placa reino-entrada__entrar" onClick={() => navigate(returnTo)}>
          Continuar <span aria-hidden="true">→</span>
        </button>
        <div className="reino-entrada__pe">
          <button
            type="button"
            className="reino-entrada__link"
            disabled={signingOut}
            onClick={async () => {
              setSigningOut(true);
              try {
                await signOut();
              } finally {
                setSigningOut(false);
              }
            }}
          >
            {signingOut ? 'Saindo…' : 'Sair e criar outra conta'}
          </button>
        </div>
      </Entrada>
    );
  }

  // Tela de confirmação de email
  if (showEmailConfirmation) {
    return (
      <Entrada>
        <h1 className="reino-entrada__titulo">Confira o seu e-mail.</h1>
        <p className="reino-entrada__sobre">
          Mandamos um link para <strong>{confirmedEmail}</strong>. Toque nele para abrir a sua conta.
          {returnTo.includes('/sono/') &&
            ' O acesso ao Protocolo do Sono fica guardado e é liberado assim que você confirmar.'}
        </p>
        <p className="reino-entrada__retorno">Não chegou? Veja a caixa de spam.</p>
        <button
          type="button"
          className="reino-placa reino-entrada__entrar"
          onClick={() => navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`)}
        >
          Já confirmei, entrar <span aria-hidden="true">→</span>
        </button>
      </Entrada>
    );
  }

  // Se deve mostrar WelcomeScreen, renderizá-lo
  if (showWelcome) {
    return (
      <WelcomeScreen
        preservedData={preservedData}
        onContinue={() => navigate(returnTo)}
      />
    );
  }

  const planoTexto = planFromQuery === 'annual' ? ' no plano anual' : planFromQuery === 'monthly' ? ' no plano mensal' : '';

  // Formulário de signup normal
  return (
    <Entrada>
      <h1 className="reino-entrada__titulo">Comece o seu caminho.</h1>
      <p className="reino-entrada__sobre">
        {isLandingFlow
          ? `7 dias grátis${planoTexto}. A primeira cobrança só vem depois.`
          : 'Crie a conta para guardar o seu progresso e as conversas com a Eco.'}
      </p>

      <button type="button" onClick={handleGoogleSignUp} disabled={loading} className="reino-entrada__google">
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
            placeholder="Seu email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            inputMode="email"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'register-error' : undefined}
          />
        </label>

        <div className="reino-entrada__campo">
          <span className="reino-entrada__linha">
            <label className="reino-entrada__rotulo" htmlFor="password">
              Senha
            </label>
            {useAutoPassword ? (
              <button type="button" onClick={handleCopyPassword} className="reino-entrada__link">
                {copiedPassword ? 'Copiada' : 'Copiar senha'}
              </button>
            ) : (
              <button type="button" onClick={handleGeneratePassword} className="reino-entrada__link">
                Gerar uma para mim
              </button>
            )}
          </span>
          <span className="reino-entrada__senha">
            <input
              id="password"
              type={showPwd ? 'text' : 'password'}
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setUseAutoPassword(false);
              }}
              required
              autoComplete="new-password"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'register-error' : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="reino-entrada__olho"
              aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
              aria-pressed={showPwd}
            >
              {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </span>
        </div>

        <div className="reino-entrada__retorno">
          <div role="alert" id="register-error" aria-live="assertive">
            {error && <p className="is-erro">{error}</p>}
          </div>
          <div role="status" aria-live="polite">
            {!error && useAutoPassword && <p className="is-ok">Senha criada. Guarde num lugar seguro.</p>}
            {!error && !useAutoPassword && password && password.length < 6 && (
              <p>Faltam {6 - password.length} caracteres.</p>
            )}
          </div>
        </div>

        <button type="submit" className="reino-placa reino-entrada__entrar" disabled={!canSubmit}>
          {loading ? 'Criando…' : 'Criar conta'}
        </button>
      </form>

      <div className="reino-entrada__pe">
        <button
          type="button"
          onClick={() => navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`)}
          disabled={loading}
          className="reino-entrada__criar"
        >
          Já tem conta? <span>Entrar</span>
        </button>
      </div>
    </Entrada>
  );
};

export default CreateProfilePage;

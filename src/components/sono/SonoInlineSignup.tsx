import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useGoogleSignInButton } from '@/hooks/useGoogleOneTap';
import { LEGAL_LINKS } from '@/components/assinar/goalsData';
import {
  trackCadastroVisto,
  trackCadastroEnviado,
  trackCadastroConcluido,
  trackCadastroFalhou,
  markCadastroPendente,
  clearCadastroPendente,
  marcarSaidaIntencionalDoFunil,
} from '@/lib/mixpanelAssinarFunnel';
import { trackWithCAPI } from '@/lib/fbpixel';
import { translateAuthError, isAlreadyRegisteredError, authErrorStatus } from '@/utils/authErrorMessage';

/**
 * Cadastro inline do funil do sono — mesma lógica do SignupStep (register +
 * Google via GIS, com a instrumentação do funil), porém no tema escuro/calmo da
 * experiência do sono em vez do azul da /assinar. Roda em modo guest: aqui é o
 * único ponto em que o convidado vira conta real.
 *
 * `onCreated` dispara quando a sessão já está pronta (sem confirmação de email).
 * O `returnTo` (/sono/experiencia?checkout=card) preserva o passo no fallback de
 * OAuth e no link de confirmação de email, sobrevivendo ao remount pós-cadastro.
 */
interface SonoInlineSignupProps {
  onCreated: () => void;
  returnTo: string;
  /** Copy do cabeçalho — usada para reaproveitar o form no gate de entrada
   *  (antes da Noite 1) com a mensagem de "desbloquear/salvar". Default = copy
   *  do checkout pós-oferta. */
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  submitLabel?: string;
}

const DEFAULT_TITLE = (
  <>
    Crie sua conta
    <br />
    <span style={{ color: '#C4B5FD' }}>e garanta suas 7 noites</span>
  </>
);
const DEFAULT_SUBTITLE =
  'Leva 10 segundos. É nela que ficam guardadas suas noites e os 7 dias grátis.';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const fieldCls =
  'w-full rounded-2xl border px-4 py-3.5 text-[15px] text-white outline-none ' +
  'placeholder:text-white/35 transition-colors focus:border-[rgba(196,181,253,0.55)]';
const fieldStyle = {
  background: 'rgba(255,255,255,0.05)',
  borderColor: 'rgba(255,255,255,0.12)',
} as const;

export function SonoInlineSignup({
  onCreated,
  returnTo,
  title,
  subtitle,
  submitLabel,
}: SonoInlineSignupProps) {
  const { register, signIn, signInWithGoogle, signInWithGoogleIdToken } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  // Quando o e-mail já tem conta e o auto-login falha, oferecemos o link "Entrar".
  const [contaExistente, setContaExistente] = useState(false);
  // Fonte de verdade no submit é o DOM, não o state: em webview do FB/IG o
  // autofill/gerenciador de senha preenche o <input> SEM disparar o onChange do
  // React, deixando o state vazio e fazendo a validação rejeitar um e-mail
  // visível e válido ("validacao: email"). Ler o ref cobre esse caso.
  const emailRef = useRef<HTMLInputElement>(null);
  const senhaRef = useRef<HTMLInputElement>(null);
  const [showSenha, setShowSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // View do cadastro: reusa o evento do funil para não perder a leitura.
  // (uma vez — o overlay só renderiza este passo quando ativo.)
  useEffect(() => {
    trackCadastroVisto();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setContaExistente(false);
    // Lê do DOM (autofill que não dispara onChange), com o state como fallback.
    const emailLimpo = (emailRef.current?.value ?? email).trim().toLowerCase();
    const senhaValor = senhaRef.current?.value ?? senha;
    if (!EMAIL_RE.test(emailLimpo)) {
      trackCadastroFalhou({ method: 'email', error_message: 'validacao: email' });
      return setErro('E-mail inválido.');
    }
    if (senhaValor.length < 8) {
      trackCadastroFalhou({ method: 'email', error_message: 'validacao: senha_curta' });
      return setErro('A senha precisa ter ao menos 8 caracteres.');
    }

    setLoading(true);
    const submitStartedAt = Date.now();
    trackCadastroEnviado({ method: 'email' });
    markCadastroPendente('email');
    try {
      // Backend exige um nome; derivamos do e-mail (o nome real é coletado no app).
      const fullName = emailLimpo.split('@')[0];
      const { needsConfirmation } = await register(
        emailLimpo,
        senhaValor,
        fullName,
        '',
        window.location.origin + returnTo,
      );
      clearCadastroPendente();
      trackCadastroConcluido({ method: 'email', needs_confirmation: needsConfirmation });
      // Meta Pixel + CAPI: cadastro do funil do sono concluído (dedup automática
      // via event_id na função serverless da Vercel).
      void trackWithCAPI('CompleteRegistration', {
        contentName: 'cadastro_sono',
        pixelExtra: { status: !needsConfirmation, method: 'email' },
      });
      if (needsConfirmation) {
        setInfo('Enviamos um e-mail de confirmação. Confirme para liberar as suas noites.');
        return;
      }
      onCreated();
    } catch (err) {
      // Mixpanel guarda o motivo cru + status_http + foi_timeout (diagnóstico);
      // o usuário vê PT-BR.
      const raw = err instanceof Error ? err.message : 'erro_desconhecido';
      const status_http = authErrorStatus(err);
      const foi_timeout =
        (err as { isTimeout?: boolean })?.isTimeout === true ||
        Date.now() - submitStartedAt > 8000;

      // Já tem conta? Tenta logar com as credenciais digitadas — caso comum de
      // quem volta pelo anúncio e reusou a senha. Se entrar, segue o fluxo
      // (desbloqueia a noite); se a senha não bater, oferece o link "Entrar".
      if (isAlreadyRegisteredError(err)) {
        try {
          await signIn(emailLimpo, senhaValor);
          clearCadastroPendente();
          trackCadastroConcluido({ method: 'email', needs_confirmation: false });
          onCreated();
          return;
        } catch (loginErr) {
          clearCadastroPendente();
          trackCadastroFalhou({
            method: 'email',
            error_message: raw,
            status_http: authErrorStatus(loginErr) ?? status_http,
            foi_timeout,
          });
          setContaExistente(true);
          setErro('Este e-mail já tem uma conta. Confira a senha ou entre na sua conta.');
          return;
        }
      }

      clearCadastroPendente();
      trackCadastroFalhou({ method: 'email', error_message: raw, status_http, foi_timeout });
      setErro(translateAuthError(err, 'signup'));
    } finally {
      setLoading(false);
    }
  };

  // Caminho preferido: popup do GIS (não navega; a sessão chega e o orquestrador
  // avança para o cartão). 'loading' → placeholder; 'failed' → fallback redirect.
  const { containerRef: googleBtnRef, status: googleBtnStatus } = useGoogleSignInButton({
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    onClick: () => {
      setErro(null);
      trackCadastroEnviado({ method: 'google' });
      markCadastroPendente('google');
    },
    onSuccess: async (idToken) => {
      await signInWithGoogleIdToken(idToken);
      clearCadastroPendente();
      trackCadastroConcluido({ method: 'google', needs_confirmation: false });
      // Meta Pixel + CAPI: cadastro concluído via Google.
      void trackWithCAPI('CompleteRegistration', {
        contentName: 'cadastro_sono',
        pixelExtra: { status: true, method: 'google' },
      });
      // Sem navegação: o orquestrador avança ao detectar a sessão (user + signup).
    },
    onError: (error) => {
      clearCadastroPendente();
      trackCadastroFalhou({
        method: 'google',
        error_message: error.message || 'google',
        status_http: authErrorStatus(error),
        foi_timeout: false,
      });
      setErro('Não foi possível entrar com Google. Tente novamente.');
    },
  });

  const googleFallback = async () => {
    trackCadastroEnviado({ method: 'google' });
    marcarSaidaIntencionalDoFunil();
    try {
      await signInWithGoogle(returnTo);
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'erro_desconhecido';
      trackCadastroFalhou({
        method: 'google',
        error_message: raw,
        status_http: authErrorStatus(err),
        foi_timeout: false,
      });
      setErro(translateAuthError(err, 'signup'));
    }
  };

  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-4" noValidate>
      <div className="text-center">
        <h2
          className="font-display text-[24px] font-bold leading-snug text-white"
          style={{ textShadow: '0 2px 20px rgba(0,0,0,0.6)' }}
        >
          {title ?? DEFAULT_TITLE}
        </h2>
        <p className="mt-2 text-[14px] leading-snug text-white/45">
          {subtitle ?? DEFAULT_SUBTITLE}
        </p>
      </div>

      {/* Botão oficial do Google (popup). Container sempre montado e mensurável
          (h-0, não display:none) para o GIS renderizar. */}
      <div
        ref={googleBtnRef}
        className={googleBtnStatus === 'ready' ? 'flex justify-center' : 'h-0 overflow-hidden'}
        aria-hidden={googleBtnStatus !== 'ready'}
      />
      {googleBtnStatus === 'loading' && (
        <div
          aria-hidden
          className="flex w-full items-center justify-center rounded-full py-3.5 text-[15px] font-medium text-white/45"
          style={{ border: '1px solid rgba(255,255,255,0.12)' }}
        >
          Carregando…
        </div>
      )}
      {googleBtnStatus === 'failed' && (
        <button
          type="button"
          onClick={googleFallback}
          className="w-full rounded-full py-3.5 text-[15px] font-semibold text-white transition-all hover:scale-[1.01] active:scale-[0.98]"
          style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.16)' }}
        >
          Continuar com Google
        </button>
      )}

      <div className="flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.10)' }} />
        <span className="text-[12px] text-white/35">ou cadastre-se com e-mail</span>
        <span className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.10)' }} />
      </div>

      <input
        ref={emailRef}
        aria-label="Endereço de email"
        type="email"
        name="email"
        placeholder="Seu melhor e-mail"
        autoComplete="email"
        inputMode="email"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={fieldCls}
        style={fieldStyle}
      />
      <div className="relative">
        <input
          ref={senhaRef}
          aria-label="Crie uma senha (8+ caracteres)"
          type={showSenha ? 'text' : 'password'}
          name="password"
          placeholder="Crie uma senha (8+ caracteres)"
          autoComplete="new-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className={`${fieldCls} pr-12`}
          style={fieldStyle}
        />
        <button
          type="button"
          aria-label={showSenha ? 'Ocultar senha' : 'Mostrar senha'}
          onClick={() => setShowSenha((v) => !v)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 transition-colors hover:text-white/70"
        >
          {showSenha ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>

      {erro && <p role="alert" className="text-[13px]" style={{ color: '#F8B4B4' }}>{erro}</p>}
      {contaExistente && (
        <Link
          to={`/login?returnTo=${encodeURIComponent(returnTo)}`}
          onClick={() => marcarSaidaIntencionalDoFunil()}
          className="text-center text-[14px] font-semibold underline"
          style={{ color: '#C4B5FD' }}
        >
          Entrar na minha conta
        </Link>
      )}
      {info && <p className="text-[13px]" style={{ color: '#C4B5FD' }}>{info}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full py-4 text-[15px] font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.97] disabled:opacity-70"
        style={{
          background: 'linear-gradient(135deg, #A78BFA 0%, #6D42C9 100%)',
          boxShadow: '0 10px 32px rgba(107,79,187,0.45)',
        }}
      >
        {loading ? 'Criando sua conta…' : (submitLabel ?? 'Criar conta e continuar')}
      </button>

      <p className="text-center text-[11.5px] leading-relaxed text-white/35">
        Ao continuar, você concorda com os{' '}
        <a href={LEGAL_LINKS.termos} className="underline" style={{ color: '#C4B5FD' }}>Termos</a> e a{' '}
        <a href={LEGAL_LINKS.privacidade} className="underline" style={{ color: '#C4B5FD' }}>
          Política de Privacidade
        </a>
        .
      </p>
    </form>
  );
}

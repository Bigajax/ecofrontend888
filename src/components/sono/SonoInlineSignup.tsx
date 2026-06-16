import { useEffect, useState } from 'react';
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
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const fieldCls =
  'w-full rounded-2xl border px-4 py-3.5 text-[15px] text-white outline-none ' +
  'placeholder:text-white/35 transition-colors focus:border-[rgba(196,181,253,0.55)]';
const fieldStyle = {
  background: 'rgba(255,255,255,0.05)',
  borderColor: 'rgba(255,255,255,0.12)',
} as const;

export function SonoInlineSignup({ onCreated, returnTo }: SonoInlineSignupProps) {
  const { register, signInWithGoogle, signInWithGoogleIdToken } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
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
    const emailLimpo = email.trim();
    if (!EMAIL_RE.test(emailLimpo)) {
      trackCadastroFalhou({ method: 'email', error_message: 'validacao: email' });
      return setErro('E-mail inválido.');
    }
    if (senha.length < 8) {
      trackCadastroFalhou({ method: 'email', error_message: 'validacao: senha_curta' });
      return setErro('A senha precisa ter ao menos 8 caracteres.');
    }

    setLoading(true);
    trackCadastroEnviado({ method: 'email' });
    markCadastroPendente('email');
    try {
      // Backend exige um nome; derivamos do e-mail (o nome real é coletado no app).
      const fullName = emailLimpo.split('@')[0];
      const { needsConfirmation } = await register(
        emailLimpo,
        senha,
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
      clearCadastroPendente();
      const message = err instanceof Error ? err.message : 'Não foi possível criar a conta.';
      trackCadastroFalhou({ method: 'email', error_message: message });
      setErro(message);
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
      trackCadastroFalhou({ method: 'google', error_message: error.message || 'google' });
      setErro('Não foi possível entrar com Google. Tente novamente.');
    },
  });

  const googleFallback = async () => {
    trackCadastroEnviado({ method: 'google' });
    marcarSaidaIntencionalDoFunil();
    try {
      await signInWithGoogle(returnTo);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao entrar com Google.';
      trackCadastroFalhou({ method: 'google', error_message: message });
      setErro(message);
    }
  };

  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-4" noValidate>
      <div className="text-center">
        <h2
          className="font-display text-[24px] font-bold leading-snug text-white"
          style={{ textShadow: '0 2px 20px rgba(0,0,0,0.6)' }}
        >
          Crie sua conta
          <br />
          <span style={{ color: '#C4B5FD' }}>e garanta suas 7 noites</span>
        </h2>
        <p className="mt-2 text-[14px] leading-snug text-white/45">
          Leva 10 segundos. É nela que ficam guardadas suas noites e os 7 dias grátis.
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
        aria-label="Endereço de email"
        type="email"
        placeholder="Seu melhor e-mail"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={fieldCls}
        style={fieldStyle}
      />
      <div className="relative">
        <input
          aria-label="Crie uma senha (8+ caracteres)"
          type={showSenha ? 'text' : 'password'}
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
        {loading ? 'Criando sua conta…' : 'Criar conta e continuar'}
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

import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useGoogleSignInButton } from "@/hooks/useGoogleOneTap";
import { LEGAL_LINKS } from "./goalsData";
import {
  trackCadastroVisto,
  trackCadastroEnviado,
  trackCadastroConcluido,
  trackCadastroFalhou,
  trackCadastroSemResposta,
  type SignupMethod,
} from "@/lib/mixpanelAssinarFunnel";

interface SignupStepProps {
  onCreated: () => void;           // session is ready (no email confirmation needed)
  funnelReturnTo: string;          // path de volta pro funil (/assinar?plan=…&step=card&from=…) — usado no fallback OAuth e no link de confirmação de email
  loginReturnTo: string;           // /login que retorna pro funil (preserva step/plan/origem)
}

/** Janela do watchdog: "enviado" sem "concluído"/"falhou" nesse tempo → "Cadastro sem resposta". */
const WATCHDOG_MS = 15_000;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const fieldCls =
  "w-full rounded-lg border px-4 py-4 text-[15px] text-[#0D3461] outline-none placeholder:text-[#8a93a3] focus:border-[#1554F0]";
const fieldStyle = { borderColor: "rgba(13,52,97,0.18)" } as const;

export function SignupStep({ onCreated, funnelReturnTo, loginReturnTo }: SignupStepProps) {
  const { register, signInWithGoogle, signInWithGoogleIdToken } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [dicas, setDicas] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    trackCadastroVisto();
  }, []);

  // Watchdog da falha silenciosa: "enviado" que não vira "concluído" nem
  // "falhou" em WATCHDOG_MS dispara "Cadastro sem resposta" — senão ficamos
  // cegos exatamente no ponto mais quente do funil.
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearWatchdog = () => {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  };
  const startWatchdog = (method: SignupMethod) => {
    clearWatchdog();
    const startedAt = Date.now();
    watchdogRef.current = setTimeout(() => {
      watchdogRef.current = null;
      trackCadastroSemResposta({ method, elapsed_ms: Date.now() - startedAt });
    }, WATCHDOG_MS);
  };
  useEffect(() => clearWatchdog, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    // Validações locais também contam como falha — sem isso ficam invisíveis
    // no Mixpanel ("enviado" ainda não disparou, então o funil não é afetado).
    if (!EMAIL_RE.test(email)) {
      trackCadastroFalhou({ method: "email", error_message: "validacao: email" });
      return setErro("E-mail inválido.");
    }
    if (senha.length < 8) {
      trackCadastroFalhou({ method: "email", error_message: "validacao: senha_curta" });
      return setErro("A senha precisa ter ao menos 8 caracteres.");
    }

    setLoading(true);
    trackCadastroEnviado({ method: "email", opted_newsletter: dicas });
    startWatchdog("email");
    try {
      // Nome não é mais pedido no funil (fricção); o backend exige um nome,
      // então derivamos do e-mail e coletamos o nome real depois, no app.
      const fullName = email.trim().split("@")[0];
      // emailRedirectTo: se a confirmação de e-mail estiver ligada no Supabase,
      // o link do e-mail devolve o usuário direto pro step do cartão — sem isso
      // ele cai na homepage e o funil se perde.
      const { needsConfirmation } = await register(
        email.trim(),
        senha,
        fullName,
        "",
        window.location.origin + funnelReturnTo,
      );
      clearWatchdog();
      trackCadastroConcluido({ method: "email", needs_confirmation: needsConfirmation });
      if (needsConfirmation) {
        setInfo("Enviamos um e-mail de confirmação. Confirme para continuar a assinatura.");
        return;
      }
      onCreated();
    } catch (err) {
      clearWatchdog();
      const message = err instanceof Error ? err.message : "Não foi possível criar a conta.";
      trackCadastroFalhou({ method: "email", error_message: message });
      setErro(message);
    } finally {
      setLoading(false);
    }
  };

  // Caminho preferido: popup do GIS (a página não navega; a sessão chega aqui e
  // o AssinarPage decide o próximo step). `ready=false` (script bloqueado/lento,
  // comum no iOS) → botão fallback com OAuth por redirect que VOLTA PRO FUNIL.
  const { containerRef: googleBtnRef, ready: googleBtnReady } = useGoogleSignInButton({
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
    onClick: () => {
      setErro(null);
      trackCadastroEnviado({ method: "google" });
      startWatchdog("google");
    },
    onSuccess: async (idToken) => {
      await signInWithGoogleIdToken(idToken);
      clearWatchdog();
      trackCadastroConcluido({ method: "google", needs_confirmation: false });
      // Sem navegação aqui: o effect pós-login do AssinarPage roteia
      // (não-premium → cartão; premium → /app).
    },
    onError: (error) => {
      clearWatchdog();
      const message = error.message || "Falha ao entrar com Google.";
      trackCadastroFalhou({ method: "google", error_message: message });
      setErro("Não foi possível entrar com Google. Tente novamente.");
    },
  });

  const googleFallback = async () => {
    trackCadastroEnviado({ method: "google" });
    try {
      // Redirect de página inteira (morre o JS) — sem watchdog. O retorno cai
      // direto no step do cartão com plano/origem preservados.
      await signInWithGoogle(funnelReturnTo);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao entrar com Google.";
      trackCadastroFalhou({ method: "google", error_message: message });
      setErro(message);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <h2 className="text-center font-display text-[26px] font-bold leading-tight" style={{ color: "#0D3461" }}>
        Falta pouco pra sua primeira noite
      </h2>
      <p className="eco-subtitle -mt-2 text-center text-[15px] leading-snug" style={{ color: "#5A8AAD" }}>
        Crie sua conta para liberar os 7 dias grátis.
      </p>

      {/* Botão oficial do Google (popup, sem redirect). O container precisa
          ficar sempre montado e mensurável (h-0, não display:none) pro GIS
          renderizar nele; enquanto não está pronto, mostra o fallback. */}
      <div
        ref={googleBtnRef}
        className={googleBtnReady ? "flex justify-center" : "h-0 overflow-hidden"}
        aria-hidden={!googleBtnReady}
      />
      {!googleBtnReady && (
        <button
          type="button"
          onClick={googleFallback}
          className="w-full rounded-full bg-[#1554F0] py-4 text-[16px] font-bold text-white transition-all hover:-translate-y-[1px] hover:bg-[#1148D6]"
        >
          Continuar com Google
        </button>
      )}

      <div className="flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1" style={{ background: "rgba(13,52,97,0.12)" }} />
        <span className="text-[13px]" style={{ color: "#5A8AAD" }}>ou cadastre-se com e-mail</span>
        <span className="h-px flex-1" style={{ background: "rgba(13,52,97,0.12)" }} />
      </div>

      <input
        aria-label="Endereço de email"
        type="email"
        placeholder="Endereço de email *"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={fieldCls}
        style={fieldStyle}
      />
      <div className="relative">
        <input
          aria-label="Senha (8+ caracteres)"
          type={showSenha ? "text" : "password"}
          placeholder="Senha (8+ caracteres) *"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className={`${fieldCls} pr-12`}
          style={fieldStyle}
        />
        <button
          type="button"
          aria-label={showSenha ? "Ocultar senha" : "Mostrar senha"}
          onClick={() => setShowSenha((v) => !v)}
          className="absolute right-4 top-1/2 -translate-y-1/2"
          style={{ color: "#5A8AAD" }}
        >
          {showSenha ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>

      <label className="flex items-center gap-2.5 text-[13px]" style={{ color: "#5A8AAD" }}>
        <input
          type="checkbox"
          checked={dicas}
          onChange={(e) => setDicas(e.target.checked)}
          className="h-4 w-4"
          style={{ accentColor: "#1554F0" }}
        />
        Quero receber dicas de sono por e-mail
      </label>

      {erro && <p role="alert" className="text-[13px]" style={{ color: "#B43C3C" }}>{erro}</p>}
      {info && <p className="text-[13px]" style={{ color: "#1A4FB5" }}>{info}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-[#1554F0] py-4 text-[16px] font-bold text-white transition-all hover:-translate-y-[1px] hover:bg-[#1148D6] disabled:opacity-70"
      >
        {loading ? "Criando…" : "Continuar"}
      </button>

      <p className="text-center text-[12px] leading-relaxed" style={{ color: "#5A8AAD" }}>
        Ao continuar, você concorda com os{" "}
        <a href={LEGAL_LINKS.termos} className="underline" style={{ color: "#1554F0" }}>Termos</a> e a{" "}
        <a href={LEGAL_LINKS.privacidade} className="underline" style={{ color: "#1554F0" }}>Política de Privacidade</a>.
      </p>

      <p className="text-center text-[14px] leading-snug" style={{ color: "#5A8AAD" }}>
        Já tem uma conta?{" "}
        <a href={loginReturnTo} className="font-semibold underline" style={{ color: "#1554F0" }}>Conecte-se</a>
      </p>
    </form>
  );
}

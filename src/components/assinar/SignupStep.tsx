import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useGoogleSignInButton } from "@/hooks/useGoogleOneTap";
import { translateAuthError } from "@/utils/authErrorMessage";
import { LEGAL_LINKS } from "./goalsData";
import {
  trackCadastroVisto,
  trackCadastroEnviado,
  trackCadastroConcluido,
  trackCadastroFalhou,
  markCadastroPendente,
  clearCadastroPendente,
  marcarSaidaIntencionalDoFunil,
} from "@/lib/mixpanelAssinarFunnel";

interface SignupStepProps {
  onCreated: () => void;           // session is ready (no email confirmation needed)
  funnelReturnTo: string;          // path de volta pro funil (/assinar?plan=…&step=card&from=…) — usado no fallback OAuth e no link de confirmação de email
  loginReturnTo: string;           // /login que retorna pro funil (preserva step/plan/origem)
}

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
  // Fonte de verdade no submit é o DOM, não o state: em webview do FB/IG o
  // autofill/gerenciador de senha preenche o <input> SEM disparar o onChange do
  // React, deixando o state vazio e fazendo a validação rejeitar um e-mail
  // visível e válido ("validacao: email"). Ler o ref cobre esse caso.
  const emailRef = useRef<HTMLInputElement>(null);
  const senhaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    trackCadastroVisto();
  }, []);

  // Watchdog da falha silenciosa ("enviado" que não vira "concluído"/"falhou")
  // vive em escopo de módulo (markCadastroPendente), não aqui: o remount por
  // userId pós-SIGNED_IN desmonta este componente antes de register() concluir,
  // e um timer local seria zerado no cleanup — cegando justamente o ponto mais
  // quente do funil. Ver mixpanelAssinarFunnel.ts.

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    // Validações locais também contam como falha — sem isso ficam invisíveis
    // no Mixpanel ("enviado" ainda não disparou, então o funil não é afetado).
    // Lê do DOM (autofill que não dispara onChange), com o state como fallback;
    // trim + lowercase porque teclado mobile injeta espaço e capitaliza.
    const emailLimpo = (emailRef.current?.value ?? email).trim().toLowerCase();
    const senhaValor = senhaRef.current?.value ?? senha;
    if (!EMAIL_RE.test(emailLimpo)) {
      trackCadastroFalhou({ method: "email", error_message: "validacao: email" });
      return setErro("E-mail inválido.");
    }
    if (senhaValor.length < 8) {
      trackCadastroFalhou({ method: "email", error_message: "validacao: senha_curta" });
      return setErro("A senha precisa ter ao menos 8 caracteres.");
    }

    setLoading(true);
    trackCadastroEnviado({ method: "email", opted_newsletter: dicas });
    markCadastroPendente("email");
    try {
      // Nome não é mais pedido no funil (fricção); o backend exige um nome,
      // então derivamos do e-mail e coletamos o nome real depois, no app.
      const fullName = emailLimpo.split("@")[0];
      // emailRedirectTo: se a confirmação de e-mail estiver ligada no Supabase,
      // o link do e-mail devolve o usuário direto pro step do cartão — sem isso
      // ele cai na homepage e o funil se perde.
      const { needsConfirmation } = await register(
        emailLimpo,
        senhaValor,
        fullName,
        "",
        window.location.origin + funnelReturnTo,
      );
      clearCadastroPendente();
      trackCadastroConcluido({ method: "email", needs_confirmation: needsConfirmation });
      if (needsConfirmation) {
        setInfo("Enviamos um e-mail de confirmação. Confirme para continuar a assinatura.");
        return;
      }
      onCreated();
    } catch (err) {
      clearCadastroPendente();
      // Mixpanel guarda o motivo cru (diagnóstico); o usuário vê PT-BR.
      const raw = err instanceof Error ? err.message : "erro_desconhecido";
      trackCadastroFalhou({ method: "email", error_message: raw });
      setErro(translateAuthError(err, "signup"));
    } finally {
      setLoading(false);
    }
  };

  // Caminho preferido: popup do GIS (a página não navega; a sessão chega aqui e
  // o AssinarPage decide o próximo step). Enquanto o GIS carrega → placeholder
  // (status 'loading'); só quando ele realmente não sobe (status 'failed':
  // script bloqueado, clientId ausente) → botão de redirect que VOLTA PRO FUNIL.
  const { containerRef: googleBtnRef, status: googleBtnStatus } = useGoogleSignInButton({
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
    onClick: () => {
      setErro(null);
      trackCadastroEnviado({ method: "google" });
      markCadastroPendente("google");
    },
    onSuccess: async (idToken) => {
      await signInWithGoogleIdToken(idToken);
      clearCadastroPendente();
      trackCadastroConcluido({ method: "google", needs_confirmation: false });
      // Sem navegação aqui: o effect pós-login do AssinarPage roteia
      // (não-premium → cartão; premium → /app).
    },
    onError: (error) => {
      clearCadastroPendente();
      const message = error.message || "Falha ao entrar com Google.";
      trackCadastroFalhou({ method: "google", error_message: message });
      setErro("Não foi possível entrar com Google. Tente novamente.");
    },
  });

  const googleFallback = async () => {
    trackCadastroEnviado({ method: "google" });
    // Redirect de página inteira (morre o JS) — sem watchdog. Marca saída
    // intencional pro pagehide do redirect não emitir "Funil abandonado" falso.
    marcarSaidaIntencionalDoFunil();
    try {
      // O retorno cai direto no step do cartão com plano/origem preservados.
      await signInWithGoogle(funnelReturnTo);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "erro_desconhecido";
      trackCadastroFalhou({ method: "google", error_message: raw });
      setErro(translateAuthError(err, "signup"));
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
          renderizar nele. 'loading' → placeholder neutro (nunca o redirect, que
          navegaria pra fora por puro timing). 'failed' → fallback de redirect. */}
      <div
        ref={googleBtnRef}
        className={googleBtnStatus === "ready" ? "flex justify-center" : "h-0 overflow-hidden"}
        aria-hidden={googleBtnStatus !== "ready"}
      />
      {googleBtnStatus === "loading" && (
        <div
          aria-hidden
          className="flex w-full items-center justify-center rounded-full py-4 text-[15px] font-medium"
          style={{ border: "1px solid rgba(13,52,97,0.12)", color: "#5A8AAD" }}
        >
          Carregando…
        </div>
      )}
      {googleBtnStatus === "failed" && (
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
        ref={emailRef}
        aria-label="Endereço de email"
        type="email"
        name="email"
        placeholder="Endereço de email *"
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
          aria-label="Senha (8+ caracteres)"
          type={showSenha ? "text" : "password"}
          name="password"
          placeholder="Senha (8+ caracteres) *"
          autoComplete="new-password"
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

import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useGoogleSignInButton } from "@/hooks/useGoogleOneTap";
import { translateAuthError, authErrorStatus } from "@/utils/authErrorMessage";
import { LEGAL_LINKS } from "./goalsData";
import {
  trackCadastroVisto,
  trackCadastroEnviado,
  trackCadastroConcluido,
  trackCadastroFalhou,
  trackCadastroValidacao,
  trackGoogleIndisponivel,
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

export function SignupStep({ onCreated, funnelReturnTo, loginReturnTo }: SignupStepProps) {
  const { register, signInWithGoogle, signInWithGoogleIdToken } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  // Fonte de verdade no submit é o DOM, não o state: em webview do FB/IG o
  // autofill/gerenciador de senha preenche o <input> SEM disparar o onChange do
  // React, deixando o state vazio e fazendo a validação rejeitar um e-mail
  // visível e válido ("validacao: email"). Ler o ref cobre esse caso.
  const emailRef = useRef<HTMLInputElement>(null);
  const senhaRef = useRef<HTMLInputElement>(null);
  // Distingue erro do botão Google ANTES do clique (render/init do GIS = infra)
  // de erro DEPOIS do clique (tentativa real). Sem isso, o onError de render
  // inflava "Cadastro falhou" sem o usuário ter tentado nada.
  const googleClickedRef = useRef(false);

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
    // Validação local NÃO é "Cadastro falhou": o register() nem foi chamado.
    // Evento próprio ("validação rejeitada") pra não inflar a métrica de falha.
    // Lê do DOM (autofill que não dispara onChange), com o state como fallback;
    // trim + lowercase porque teclado mobile injeta espaço e capitaliza.
    const emailLimpo = (emailRef.current?.value ?? email).trim().toLowerCase();
    const senhaValor = senhaRef.current?.value ?? senha;
    if (!EMAIL_RE.test(emailLimpo)) {
      trackCadastroValidacao({ method: "email", motivo: "email" });
      return setErro("E-mail inválido.");
    }
    if (senhaValor.length < 8) {
      trackCadastroValidacao({ method: "email", motivo: "senha_curta" });
      return setErro("A senha precisa ter ao menos 8 caracteres.");
    }

    setLoading(true);
    const submitStartedAt = Date.now();
    trackCadastroEnviado({ method: "email", opted_newsletter: false });
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
      // Mixpanel guarda o motivo cru + status_http + foi_timeout (diagnóstico);
      // o usuário vê PT-BR.
      const raw = err instanceof Error ? err.message : "erro_desconhecido";
      trackCadastroFalhou({
        method: "email",
        error_message: raw,
        status_http: authErrorStatus(err),
        foi_timeout:
          (err as { isTimeout?: boolean })?.isTimeout === true ||
          Date.now() - submitStartedAt > 8000,
      });
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
      googleClickedRef.current = true;
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
      // Sem clique = erro de render/init do GIS (infra), não tentativa que
      // falhou. O fallback (status 'failed') já oferece o redirect; não conta
      // como "Cadastro falhou" e não mostra erro.
      if (!googleClickedRef.current) {
        trackGoogleIndisponivel({ error_message: message });
        return;
      }
      trackCadastroFalhou({
        method: "google",
        error_message: message,
        status_http: authErrorStatus(error),
        foi_timeout: false,
      });
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
      trackCadastroFalhou({
        method: "google",
        error_message: raw,
        status_http: authErrorStatus(err),
        foi_timeout: false,
      });
      setErro(translateAuthError(err, "signup"));
    }
  };

  // Visual da entrada do reino (set/2026). A caixa de "dicas de sono por e-mail"
  // saiu: não havia lista de e-mail por trás, era só fricção.
  return (
    <form onSubmit={submit} className="reino-entrada__form" noValidate>
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
        <div aria-hidden className="reino-entrada__google">
          Carregando…
        </div>
      )}
      {googleBtnStatus === "failed" && (
        <button type="button" onClick={googleFallback} className="reino-entrada__google">
          Continuar com Google
        </button>
      )}

      <p className="reino-entrada__ou" aria-hidden="true">
        ou com e-mail
      </p>

      <label className="reino-entrada__campo">
        <span className="reino-entrada__rotulo">E-mail</span>
        <input
          ref={emailRef}
          aria-label="Endereço de email"
          type="email"
          name="email"
          placeholder="Seu email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <div className="reino-entrada__campo">
        <label className="reino-entrada__rotulo" htmlFor="assinar-senha">
          Senha
        </label>
        <span className="reino-entrada__senha">
          <input
            id="assinar-senha"
            ref={senhaRef}
            aria-label="Senha (8+ caracteres)"
            type={showSenha ? "text" : "password"}
            name="password"
            placeholder="8 caracteres ou mais"
            autoComplete="new-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
          <button
            type="button"
            className="reino-entrada__olho"
            aria-label={showSenha ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={showSenha}
            onClick={() => setShowSenha((v) => !v)}
          >
            {showSenha ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </span>
      </div>

      <div className="reino-entrada__retorno">
        {erro && (
          <p role="alert" className="is-erro">
            {erro}
          </p>
        )}
        {info && <p className="is-ok">{info}</p>}
      </div>

      <button type="submit" disabled={loading} className="reino-placa reino-entrada__entrar">
        {loading ? "Criando…" : "Continuar"} <span aria-hidden="true">→</span>
      </button>

      <p className="reino-assinar__miudo">
        Ao continuar, você concorda com os <a href={LEGAL_LINKS.termos}>Termos</a> e a{" "}
        <a href={LEGAL_LINKS.privacidade}>Política de Privacidade</a>.
      </p>
      <p className="reino-assinar__miudo">
        Já tem conta? <a href={loginReturnTo}>Entrar</a>
      </p>
    </form>
  );
}

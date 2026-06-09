import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  trackCadastroVisto,
  trackCadastroEnviado,
  trackCadastroConcluido,
  trackCadastroFalhou,
} from "@/lib/mixpanelAssinarFunnel";

interface SignupStepProps {
  onCreated: () => void;           // session is ready (no email confirmation needed)
  googleReturnTo: string;          // where to come back after Google OAuth
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const fieldCls =
  "w-full rounded-lg border px-4 py-4 text-[15px] text-[#0D3461] outline-none placeholder:text-[#8a93a3] focus:border-[#1554F0]";
const fieldStyle = { borderColor: "rgba(13,52,97,0.18)" } as const;

export function SignupStep({ onCreated, googleReturnTo }: SignupStepProps) {
  const { register, signInWithGoogle } = useAuth();
  const [nome, setNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [aceito, setAceito] = useState(false);
  const [novidades, setNovidades] = useState<"sim" | "nao" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    trackCadastroVisto();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (!nome.trim()) return setErro("Informe seu nome.");
    if (!EMAIL_RE.test(email)) return setErro("E-mail inválido.");
    if (senha.length < 8) return setErro("A senha precisa ter ao menos 8 caracteres.");
    if (!aceito) return setErro("É preciso aceitar os Termos para continuar.");

    setLoading(true);
    trackCadastroEnviado({ method: "email", opted_newsletter: novidades === "sim" });
    try {
      const fullName = [nome.trim(), sobrenome.trim()].filter(Boolean).join(" ");
      const { needsConfirmation } = await register(email.trim(), senha, fullName, "");
      trackCadastroConcluido({ method: "email", needs_confirmation: needsConfirmation });
      if (needsConfirmation) {
        setInfo("Enviamos um e-mail de confirmação. Confirme para continuar a assinatura.");
        return;
      }
      onCreated();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível criar a conta.";
      trackCadastroFalhou({ method: "email", error_message: message });
      setErro(message);
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    trackCadastroEnviado({ method: "google" });
    try {
      sessionStorage.setItem("eco.assinar.returnTo", googleReturnTo);
      await signInWithGoogle();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao entrar com Google.";
      trackCadastroFalhou({ method: "google", error_message: message });
      setErro(message);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <h2 className="text-center font-display text-[26px] font-bold" style={{ color: "#0D3461" }}>Inscrever-se</h2>
      <p className="-mt-2 text-center text-[15px] leading-snug" style={{ color: "#5A8AAD" }}>
        Já tem uma conta?
        <br />
        <a href="/login?returnTo=/assinar" className="font-semibold underline" style={{ color: "#1554F0" }}>Conecte-se</a>
      </p>

      <input
        aria-label="Primeiro nome"
        placeholder="Primeiro nome *"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        className={fieldCls}
        style={fieldStyle}
      />
      <input
        aria-label="Sobrenome"
        placeholder="Sobrenome *"
        value={sobrenome}
        onChange={(e) => setSobrenome(e.target.value)}
        className={fieldCls}
        style={fieldStyle}
      />
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

      <div className="mt-1">
        <h3 className="font-display text-[17px] font-bold leading-snug" style={{ color: "#0D3461" }}>
          Quer ficar por dentro das últimas novidades?
        </h3>
        <p className="eco-subtitle mb-3 mt-1 text-[14px] leading-snug" style={{ color: "#5A8AAD" }}>
          Inscreva-se na nossa lista de e-mails e seja o primeiro a saber sobre ofertas especiais.
        </p>
        <div className="flex gap-8">
          <label className="flex items-center gap-2 text-[15px]" style={{ color: "#0D3461" }}>
            <input type="radio" name="novidades" checked={novidades === "sim"} onChange={() => setNovidades("sim")} className="h-5 w-5" style={{ accentColor: "#1554F0" }} />
            Sim
          </label>
          <label className="flex items-center gap-2 text-[15px]" style={{ color: "#0D3461" }}>
            <input type="radio" name="novidades" checked={novidades === "nao"} onChange={() => setNovidades("nao")} className="h-5 w-5" style={{ accentColor: "#1554F0" }} />
            Não
          </label>
        </div>
      </div>

      <label className="flex items-start gap-2.5 border-t pt-4 text-[14px] leading-relaxed" style={{ color: "#333", borderColor: "rgba(13,52,97,0.1)" }}>
        <input type="checkbox" checked={aceito} onChange={(e) => setAceito(e.target.checked)} className="mt-1 h-4 w-4" style={{ accentColor: "#1554F0" }} />
        <span>
          Concordo com a Ecotopia. <a href="#" className="underline" style={{ color: "#1554F0" }}>Termos e Condições</a> e reconheço a{" "}
          <a href="#" className="underline" style={{ color: "#1554F0" }}>Política de Privacidade</a>.
        </span>
      </label>

      {erro && <p role="alert" className="text-[13px]" style={{ color: "#B43C3C" }}>{erro}</p>}
      {info && <p className="text-[13px]" style={{ color: "#1A4FB5" }}>{info}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-[#1554F0] py-4 text-[16px] font-bold text-white transition-all hover:-translate-y-[1px] hover:bg-[#1148D6] disabled:opacity-70"
      >
        {loading ? "Criando…" : "Criar uma conta"}
      </button>

      <button
        type="button"
        onClick={google}
        className="w-full rounded-full border py-3 text-[14px] font-semibold"
        style={{ borderColor: "rgba(13,52,97,0.2)", color: "#0D3461" }}
      >
        Continuar com Google
      </button>
    </form>
  );
}

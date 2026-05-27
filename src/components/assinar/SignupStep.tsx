import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface SignupStepProps {
  onCreated: () => void;           // session is ready (no email confirmation needed)
  googleReturnTo: string;          // where to come back after Google OAuth
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function SignupStep({ onCreated, googleReturnTo }: SignupStepProps) {
  const { register, signInWithGoogle } = useAuth();
  const [nome, setNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [aceito, setAceito] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (!nome.trim()) return setErro("Informe seu nome.");
    if (!EMAIL_RE.test(email)) return setErro("E-mail inválido.");
    if (senha.length < 8) return setErro("A senha precisa ter ao menos 8 caracteres.");
    if (!aceito) return setErro("É preciso aceitar os Termos para continuar.");

    setLoading(true);
    try {
      const fullName = [nome.trim(), sobrenome.trim()].filter(Boolean).join(" ");
      const { needsConfirmation } = await register(email.trim(), senha, fullName, "");
      if (needsConfirmation) {
        setInfo("Enviamos um e-mail de confirmação. Confirme para continuar a assinatura.");
        return;
      }
      onCreated();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível criar a conta.");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    try {
      sessionStorage.setItem("eco.assinar.returnTo", googleReturnTo);
      await signInWithGoogle();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao entrar com Google.");
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <h2 className="font-display text-[22px] font-bold" style={{ color: "#0D3461" }}>Criar conta</h2>

      <label className="flex flex-col gap-1 text-[13px] font-medium" style={{ color: "#3A6FA5" }}>
        Nome*
        <input value={nome} onChange={(e) => setNome(e.target.value)} className="rounded-xl border px-4 py-3 text-[15px] text-[#0D3461]" style={{ borderColor: "rgba(13,52,97,0.18)" }} />
      </label>
      <label className="flex flex-col gap-1 text-[13px] font-medium" style={{ color: "#3A6FA5" }}>
        Sobrenome
        <input value={sobrenome} onChange={(e) => setSobrenome(e.target.value)} className="rounded-xl border px-4 py-3 text-[15px] text-[#0D3461]" style={{ borderColor: "rgba(13,52,97,0.18)" }} />
      </label>
      <label className="flex flex-col gap-1 text-[13px] font-medium" style={{ color: "#3A6FA5" }}>
        E-mail*
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl border px-4 py-3 text-[15px] text-[#0D3461]" style={{ borderColor: "rgba(13,52,97,0.18)" }} />
      </label>
      <label className="flex flex-col gap-1 text-[13px] font-medium" style={{ color: "#3A6FA5" }}>
        Senha (8+ caracteres)*
        <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} className="rounded-xl border px-4 py-3 text-[15px] text-[#0D3461]" style={{ borderColor: "rgba(13,52,97,0.18)" }} />
      </label>

      <label className="flex items-start gap-2 text-[13px]" style={{ color: "#5A8AAD" }}>
        <input type="checkbox" checked={aceito} onChange={(e) => setAceito(e.target.checked)} className="mt-0.5" />
        <span>Concordo com os Termos de Uso e a Política de Privacidade.</span>
      </label>

      {erro && <p role="alert" className="text-[13px]" style={{ color: "#B43C3C" }}>{erro}</p>}
      {info && <p className="text-[13px]" style={{ color: "#1A4FB5" }}>{info}</p>}

      <button type="submit" disabled={loading} className="rounded-full py-3.5 text-[15px] font-bold text-white disabled:opacity-70" style={{ background: "linear-gradient(135deg, #1A4FB5 0%, #0D3461 100%)" }}>
        {loading ? "Criando…" : "Criar conta"}
      </button>

      <button type="button" onClick={google} className="rounded-full border py-3 text-[14px] font-semibold" style={{ borderColor: "rgba(13,52,97,0.2)", color: "#0D3461" }}>
        Continuar com Google
      </button>
    </form>
  );
}

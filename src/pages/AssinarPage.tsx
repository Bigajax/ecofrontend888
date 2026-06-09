import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiUrl } from "@/config/apiBase";
import { supabase } from "@/lib/supabaseClient";
import { PlanStep } from "@/components/assinar/PlanStep";
import { SignupStep } from "@/components/assinar/SignupStep";
import { MpCardForm } from "@/components/assinar/MpCardForm";
import { GoalsStep } from "@/components/assinar/GoalsStep";
import { ValidationStep } from "@/components/assinar/ValidationStep";
import { LegalFooter } from "@/components/assinar/LegalFooter";
import type { PlanId } from "@/components/assinar/types";
import type { GoalId } from "@/components/assinar/goalsData";
import { saveObjetivos, linkUserToObjetivos } from "@/api/onboardingObjetivos";
import { scrollToTop } from "@/utils/scrollToTop";
import {
  setStoredObjetivos,
  setStoredResponseId,
  getStoredResponseId,
  clearStoredResponseId,
} from "@/utils/onboardingObjetivosStorage";

type Step = "goals" | "validation" | "plan" | "signup" | "card";

const STEP_VALUES: readonly Step[] = ["goals", "validation", "plan", "signup", "card"] as const;

function parseStep(value: string | null): Step {
  return (STEP_VALUES as readonly string[]).includes(value ?? "") ? (value as Step) : "goals";
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

function parsePlan(value: string | null): PlanId {
  return value === "annual" ? "annual" : "monthly";
}

export default function AssinarPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plan, setPlan] = useState<PlanId>(parsePlan(params.get("plan")));
  const [step, setStep] = useState<Step>(parseStep(params.get("step")));
  const [erro, setErro] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Scroll para o topo a cada troca de step (e no mount).
  // Usa scrollToTop() (não só window) porque no mobile o scroller é o #root.
  useEffect(() => {
    scrollToTop();
  }, [step]);

  // Sincroniza step na URL (?step=…) sempre que muda
  useEffect(() => {
    const current = params.get("step");
    if (current !== step) {
      const p = new URLSearchParams(params);
      p.set("step", step);
      setParams(p, { replace: true });
    }
  }, [step, params, setParams]);

  // Vincula response a user assim que entramos no step "card" e há sessão + responseId
  useEffect(() => {
    if (step !== "card") return;
    const responseId = getStoredResponseId();
    if (!responseId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      const ok = await linkUserToObjetivos(responseId, token);
      if (!cancelled && ok) clearStoredResponseId();
    })();
    return () => { cancelled = true; };
  }, [step, user]);

  // Após o signup criar a sessão, o userId muda e o RootProviders remonta a árvore
  // (ChatProvider/RingsProvider são chaveados por userId), resetando o step pra URL
  // (?step=signup) e atropelando o setStep("card") do onCreated. Aqui recuperamos:
  // se o usuário já está autenticado mas o step ficou em "signup", avança pro cartão.
  useEffect(() => {
    if (user && step === "signup") setStep("card");
  }, [user, step]);

  const selectPlan = (next: PlanId) => {
    setPlan(next);
    const p = new URLSearchParams(params);
    p.set("plan", next);
    setParams(p, { replace: true });
  };

  const submitObjetivos = async (answers: GoalId[], skipped: boolean, nextStep: Step) => {
    setStoredObjetivos({ answers, skipped });
    setStep(nextStep);
    const result = await saveObjetivos({ answers, skipped });
    if (result?.id) setStoredResponseId(result.id);
  };

  const handleGoalsContinue = (answers: GoalId[]) => { void submitObjetivos(answers, false, "validation"); };
  const handleGoalsSkip = () => { void submitObjetivos([], true, "plan"); };

  const continueFromPlan = () => setStep(user ? "card" : "signup");

  const handleToken = async (formData: Record<string, unknown>) => {
    setErro(null);
    setProcessing(true);
    try {
      const res = await fetch(apiUrl("/api/subscription/create-with-card"), {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ ...formData, plan }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || "Não foi possível concluir a assinatura.");
      }
      // Premium status é ativado pelo webhook MercadoPago no backend.
      // Frontend não escreve em usuarios.tipo_plano direto pra evitar race conditions.
      navigate("/app/subscription/callback");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setProcessing(false);
    }
  };

  const googleReturnTo = `/assinar?plan=${plan}&step=card`;

  // Larguras alvo por step no desktop. Validação ganha mais espaço pro grid 2-col.
  const stepMaxWidthMd =
    step === "validation" ? "md:max-w-[760px]"
    : step === "goals" ? "md:max-w-[460px]"
    : "md:max-w-[460px]";

  return (
    <div className="relative flex min-h-screen flex-col bg-white md:bg-[#1554F0]">
      {/* Camada decorativa do fundo — só no desktop. Blobs suaves + sparkles. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden overflow-hidden md:block"
      >
        {/* Glow rosado direita */}
        <div className="absolute -right-40 top-1/3 h-[560px] w-[560px] rounded-full bg-[#FFB8C8] opacity-30 blur-3xl" />
        {/* Glow branco esquerda */}
        <div className="absolute -left-32 bottom-20 h-[440px] w-[440px] rounded-full bg-white opacity-15 blur-3xl" />
        {/* Glow azul claro topo */}
        <div className="absolute -top-32 left-1/3 h-[400px] w-[400px] rounded-full bg-[#9EC9FF] opacity-25 blur-3xl" />
        {/* Sparkles */}
        <div className="absolute right-[14%] top-[12%] h-1.5 w-1.5 rounded-full bg-white/80 shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
        <div className="absolute left-[9%] top-[28%] h-1 w-1 rounded-full bg-white/60" />
        <div className="absolute right-[22%] bottom-[24%] h-1.5 w-1.5 rounded-full bg-white/70 shadow-[0_0_6px_rgba(255,255,255,0.6)]" />
        <div className="absolute left-[16%] bottom-[14%] h-1 w-1 rounded-full bg-white/50" />
        <div className="absolute right-[8%] top-[55%] h-1 w-1 rounded-full bg-white/60" />
      </div>

      <header className="relative z-10 bg-white px-5 py-6">
        <Link to="/" aria-label="Ecotopia — início" className="inline-block">
          <img src="/images/ecotopia-logo-trim.webp" alt="Ecotopia" className="h-7 w-auto" />
        </Link>
      </header>

      <main className={`relative z-10 mx-auto w-full flex-1 ${stepMaxWidthMd} md:py-8`}>
        {step === "goals" && (
          <GoalsStep onContinue={handleGoalsContinue} onSkip={handleGoalsSkip} />
        )}

        {step === "validation" && (
          <ValidationStep onContinue={() => setStep("plan")} onBack={() => setStep("goals")} />
        )}

        {step === "plan" && (
          <div className="px-5 md:rounded-3xl md:bg-white md:px-8 md:py-10 md:shadow-[0_30px_80px_rgba(0,0,0,0.18)]">
            <PlanStep selectedPlan={plan} onSelectPlan={selectPlan} onContinue={continueFromPlan} />
          </div>
        )}

        {step === "signup" && (
          <div className="px-5 md:rounded-3xl md:bg-white md:px-8 md:py-10 md:shadow-[0_30px_80px_rgba(0,0,0,0.18)]">
            <SignupStep onCreated={() => setStep("card")} googleReturnTo={googleReturnTo} />
          </div>
        )}

        {step === "card" && (
          <div className="flex flex-col gap-5 px-5 pb-8 md:rounded-3xl md:bg-white md:px-8 md:pb-10 md:pt-10 md:shadow-[0_30px_80px_rgba(0,0,0,0.18)]">
            <h2 className="text-center font-display text-[24px] font-bold leading-tight" style={{ color: "#0D3461" }}>
              Selecione o método de pagamento
            </h2>

            {/* Plan summary */}
            <div
              className="flex items-center justify-between rounded-2xl px-4 py-4"
              style={{ background: "#F3F4F6" }}
            >
              <div>
                <p className="font-display text-[17px] font-bold" style={{ color: "#0D3461" }}>
                  {plan === "monthly" ? "Mensal" : "Anual"}
                </p>
                <p className="text-[13px]" style={{ color: "#5A8AAD" }}>
                  {plan === "monthly" ? "R$ 15,90/mês" : "R$ 142,80/ano"}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-[20px] font-bold" style={{ color: "#1A8A4A" }}>
                  R$ 0,00
                </p>
                <p className="text-[13px] font-semibold" style={{ color: "#1A8A4A" }}>
                  por 7 dias
                </p>
              </div>
            </div>

            {/* Benefits */}
            <ul className="flex flex-col gap-3">
              {[
                "Acesse nossa biblioteca completa de meditações, sons para dormir, Eco IA e exercícios respiratórios.",
                "Receba uma nova meditação no seu celular todos os dias.",
                "Conteúdo inspirador diário para começar bem o dia.",
              ].map((text, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[14px] leading-snug" style={{ color: "#0D3461" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1A8A4A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0" aria-hidden>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{text}</span>
                </li>
              ))}
            </ul>

            {/* Card section header with brand icons */}
            <div className="flex items-center justify-between border-t pt-5" style={{ borderColor: "rgba(13,52,97,0.1)" }}>
              <h3 className="font-display text-[16px] font-bold" style={{ color: "#0D3461" }}>
                Cartão de crédito ou débito
              </h3>
              <div className="flex items-center gap-1.5" aria-label="Bandeiras aceitas">
                <span className="rounded border border-[#E5E7EB] px-1.5 py-0.5 text-[9px] font-bold text-[#1A1F71]">VISA</span>
                <span className="rounded border border-[#E5E7EB] px-1 py-0.5 text-[9px] font-bold text-[#EB001B]">MC</span>
                <span className="rounded border border-[#E5E7EB] px-1 py-0.5 text-[9px] font-bold text-[#006FCF]">AMEX</span>
                <span className="rounded border border-[#E5E7EB] px-1 py-0.5 text-[9px] font-bold text-[#FF6000]">ELO</span>
              </div>
            </div>

            <MpCardForm
              amount={plan === "monthly" ? 15.9 : 142.8}
              maxInstallments={1}
              onToken={handleToken}
              onError={setErro}
            />

            {processing && (
              <p aria-live="polite" className="text-center text-[13px]" style={{ color: "#5A8AAD" }}>
                Processando…
              </p>
            )}
            {erro && (
              <p role="alert" className="text-center text-[13px]" style={{ color: "#B43C3C" }}>
                {erro}
              </p>
            )}

            {/* Fine print */}
            <div className="text-center text-[11.5px] leading-relaxed" style={{ color: "#5A8AAD" }}>
              <p>
                Podem ser aplicados IVA, impostos sobre vendas ou outros impostos aplicáveis.
              </p>
              <Link
                to="/cancelar-assinatura"
                className="mt-1 inline-block underline underline-offset-2"
                style={{ color: "#1554F0" }}
              >
                Cancele a qualquer momento.
              </Link>
            </div>
          </div>
        )}
      </main>

      <LegalFooter />
    </div>
  );
}

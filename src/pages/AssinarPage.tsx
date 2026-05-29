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

  // Scroll para o topo ao entrar na página
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

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
      navigate("/app/subscription/callback");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setProcessing(false);
    }
  };

  const googleReturnTo = `/assinar?plan=${plan}&step=card`;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="px-5 py-6">
        <Link to="/" aria-label="Ecotopia — início" className="inline-block">
          <img src="/images/ecotopia-logo-trim.webp" alt="Ecotopia" className="h-7 w-auto" />
        </Link>
      </header>

      <main className="mx-auto w-full flex-1 sm:max-w-[420px]">
        {step === "goals" && (
          <GoalsStep onContinue={handleGoalsContinue} onSkip={handleGoalsSkip} />
        )}

        {step === "validation" && (
          <ValidationStep onContinue={() => setStep("plan")} onBack={() => setStep("goals")} />
        )}

        {step === "plan" && (
          <div className="px-5">
            <PlanStep selectedPlan={plan} onSelectPlan={selectPlan} onContinue={continueFromPlan} />
          </div>
        )}

        {step === "signup" && (
          <div className="px-5">
            <SignupStep onCreated={() => setStep("card")} googleReturnTo={googleReturnTo} />
          </div>
        )}

        {step === "card" && (
          <div className="flex flex-col gap-4 px-5">
            <h2 className="text-center font-display text-[22px] font-bold" style={{ color: "#0D3461" }}>
              Comece seu trial de 7 dias
            </h2>
            <p className="eco-subtitle text-center text-[14px]" style={{ color: "#5A8AAD" }}>
              {plan === "monthly"
                ? "R$ 0 hoje. Cobramos R$ 15,90/mês só após 7 dias — cancele quando quiser."
                : "R$ 0 hoje. Cobramos R$ 142,80/ano só após 7 dias — cancele quando quiser."}
            </p>
            <MpCardForm
              amount={plan === "monthly" ? 15.9 : 142.8}
              maxInstallments={1}
              onToken={handleToken}
              onError={setErro}
            />
            {processing && (
              <p aria-live="polite" className="text-center text-[13px]" style={{ color: "#5A8AAD" }}>Processando…</p>
            )}
            {erro && <p role="alert" className="text-[13px]" style={{ color: "#B43C3C" }}>{erro}</p>}
          </div>
        )}
      </main>

      <LegalFooter />
    </div>
  );
}
